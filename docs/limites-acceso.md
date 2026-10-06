# I05.2 — Límite persistente de acceso con contraseña

Implementado el 2026-10-06. Primera parte de I05.2; no cierra I05 ni autoriza un despliegue o una migración sobre la base real.

## Comportamiento

Solo `POST /api/v1/auth/login`: hasta **8 intentos por correo normalizado durante una ventana de 300 segundos**, iniciada con el primer intento. Cuentan accesos correctos, contraseñas incorrectas y contraseñas inválidas si el correo es válido. Entradas sin un correo válido y solicitudes rechazadas por CSRF no crean un contador.

El noveno intento devuelve **429**, `code: too_many_login_attempts`, `retryAfterSeconds` y la cabecera `Retry-After`. Angular muestra: «Has intentado ingresar varias veces. Espera un momento y vuelve a intentarlo». Conserva el formulario y la sesión existente. Al terminar la ventana, el siguiente intento inicia otra. Los rechazos no prolongan la espera y un acceso correcto no reinicia el contador.

Se aplica la misma política a correos registrados y desconocidos. Cambiar mayúsculas, espacios exteriores, IP o `X-Forwarded-For` no reinicia el contador de un mismo correo. No se revocan sesiones ni se limitan progreso, clases, consulta de sesión o salida. Registro y acceso con Google quedan fuera de esta subtarea.

Configuración del backend, con valores predeterminados también en `.env.example`:

```dotenv
PASSWORD_LOGIN_MAX_ATTEMPTS=8
PASSWORD_LOGIN_WINDOW_SECONDS=300
```

Se validan enteros positivos: intentos entre 1 y 10000; segundos entre 1 y 86400. Una configuración inválida impide arrancar. No se editó el `.env` privado. Todos los procesos deben compartir base, política y relojes sincronizados.

## Almacenamiento y alcance de seguridad

La tabla `password_login_limits` contiene un SHA-256 del correo normalizado con prefijo propio, un contador y la expiración Unix. No guarda el correo en claro, IP, contraseña ni token. **El digest no garantiza anonimato**: un correo conocido puede comprobarse contra él. No hay relación con la tabla de cuentas; la tabla funciona también para correos desconocidos.

Un `INSERT … ON CONFLICT … DO UPDATE … RETURNING` consume el intento en una transacción corta independiente, antes de comprobar la contraseña. No hay contador en memoria ni dependencia nueva. Se implementan únicamente PostgreSQL y SQLite; no se confirma compatibilidad con MySQL/cPanel. El contador se satura en límite + 1. Si el almacenamiento falla, el acceso con contraseña devuelve 503 `login_protection_unavailable`, sin conceder acceso ni volcar SQL, correo o contraseña al registro. Angular muestra un mensaje de reintento; las sesiones existentes no se eliminan.

La actualización utiliza la operación atómica de [PostgreSQL](https://www.postgresql.org/docs/current/sql-insert.html), mediante los dialectos de [SQLAlchemy para PostgreSQL](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#insert-on-conflict-upsert) y [SQLite](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html#insert-on-conflict-upsert). La asociación al correo y el riesgo de bloqueo dirigido se consideran siguiendo [OWASP sobre limitación del acceso](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#login-throttling); 8/300 es nuestra política, no un valor impuesto por OWASP.

Límites explícitos:

- Es una ventana fija anclada al primer intento, no un límite móvil para cualquier intervalo de cinco minutos. Pueden concentrarse intentos alrededor del cambio de ventana.
- Alguien que conoce un correo puede consumir sus intentos y dificultar temporalmente su acceso. Los rechazos no alargan esa ventana, pero un atacante puede continuar en ventanas nuevas.
- No controla ataques distribuidos sobre muchos correos, registro masivo o abuso de Google; cada correo distinto puede crear una fila. Hace falta limpieza periódica y una política adicional de abuso antes de publicación.
- No sustituye CSRF, HTTPS, recuperación de contraseña, límites de entrada, revisión de dependencias ni protección operativa del servidor.

## Activación pendiente: migración

**La migración `20261006_0004` fue creada, pero NO se aplicó a la base real.** Añade únicamente la tabla, dos restricciones positivas y el índice de expiración. Su bajada elimina únicamente esa tabla y su índice, perdiendo los contadores, no cuentas ni sesiones.

Antes de usar el nuevo acceso con contraseña, comprobar la migración en PostgreSQL aislado, tener respaldo y aprobar su aplicación al entorno elegido. El comando previsto desde `backend`, con el entorno correcto, es:

```text
flask --app app db upgrade
```

No se ejecutó ese comando contra la base real. **El Compose actual ya ejecuta `db upgrade` al arrancar el backend**: reiniciarlo/recrearlo con este código puede aplicar la migración automáticamente. No se arrancó Compose en esta tarea. Si se ejecuta el nuevo código sin la tabla, el acceso con contraseña devolverá 503 por diseño; aplicar frontend y backend de forma coordinada.

Limpieza disponible para operación, sin automatización creada:

```text
flask --app app cleanup-login-limits --dry-run
flask --app app cleanup-login-limits
```

El primer comando solo cuenta; el segundo elimina exclusivamente ventanas vencidas. No se ejecutaron contra datos reales. Acordar frecuencia y responsable antes de publicar.

## Comprobaciones y evidencia

- **Backend:** 167 pruebas aprobadas. Nuevas pruebas de umbral, normalización, expiración, respuestas, configuración, fallo de almacenamiento, CSRF y conservación de sesiones/progreso. Dos aplicaciones y una recreación comparten una base SQLite temporal; 32 solicitudes concurrentes obtienen exactamente 8 permisos y 24 rechazos.
- **Migración:** subida, bajada y nueva subida sobre SQLite en memoria preparado como la versión anterior; cuentas y sesión se conservan. No es una prueba de toda la cadena desde una base vacía ni una prueba sobre PostgreSQL.
- **Frontend:** 900 pruebas aprobadas en 57 archivos. Avisos 429/503, formulario conservado e integración con AuthService sin perder una sesión existente.
- **Build de producción:** aprobado; permanece la advertencia SCSS anterior de C6 (11,64 kB frente al aviso de 10 kB). Backend presenta 12 avisos de configuración/API obsoleta de Alembic/Flask-Migrate existentes; no se cambiaron para ocultarlos.
- **Navegador:** Login/AuthService y Flask reales, cuenta ficticia y SQLite en memoria. Ocho POST devuelven 401 y el noveno 429; aviso visible, campos conservados. Sin Google real, Phaser ni base del usuario. Servidor temporal detenido y pestaña cerrada. Evidencia ignorada por Git: `frontend/tmp/login-limit-qa/rate-limit-message.jpg`.

Comandos de comprobación desde sus respectivos directorios:

```powershell
& './.venv/Scripts/python.exe' -B -m pytest -p no:cacheprovider -q
```

```text
ng test --watch=false
ng build --configuration production
```

**Pendiente:** prueba real aislada de concurrencia/migración en PostgreSQL, aplicación aprobada de la migración y validación con Compose/teléfono. La sentencia PostgreSQL compila; eso no sustituye su ejecución. Docker estaba instalado, pero su motor no respondía; no se inició ni se conectó a la base real. I04 permanece aplazado e I05 sin marcar. La siguiente subtarea debe delimitarse y aprobarse por separado.

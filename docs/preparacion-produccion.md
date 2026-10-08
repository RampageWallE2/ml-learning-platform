# Preparación técnica de ExploraLab

Fecha: 2026-10-07. Alcance aprobado: I01–I05 e I07–I13, sin publicar en la nube y sin recuperación de contraseña (I06).

## Qué significa preparado

Este trabajo prepara y ensaya una versión **local** con Angular compilado, Nginx, Gunicorn y PostgreSQL real aislado. No configura AWS, DNS, certificados públicos, cuentas del proveedor ni cPanel. No cambia `compose.yml`, `backend/.env` ni utiliza sus volúmenes en las comprobaciones.

No equivale a haber validado todos los teléfonos, el aprendizaje, Google real o los derechos de distribución. Las tareas que exigen decisiones y comprobaciones humanas permanecen abiertas en la lista oficial.

## Evidencia de este ensayo

Comprobado el 2026-10-07, identificador provisional `local-8f554d45e539-20261007143008` (checkout con cambios, no tag de entrega aprobado):

- Frontend: **1.092 pruebas**, 67 archivos, con Vitest 4.1.11; producción compilada tanto localmente como mediante instalación limpia `npm ci` en Docker.
- Backend: **239 pruebas sobre PostgreSQL**, incluidas 24 escrituras simultáneas, reglas de C1–C9 y migraciones vacío → anterior → actual. Sin base de datos habitual.
- HTTPS/API: **40 comprobaciones** con cuentas ficticias, sesión, nueve registros de progreso, reintentos, CSRF y rutas. No respuestas educativas reales.
- Navegador real: escritorio 1366 × 900, tamaño táctil 390 × 844 y rotación 844 × 390; Open Pit sigue renderizando con audio bloqueado y un pendiente local recupera su guardado en PostgreSQL. Un solo canvas y sin errores JavaScript observados. Se usan fixtures de recuperación, no un recorrido manual completo.
- Entrega/resiliencia: **cinco comprobaciones** de caché, gzip, límite 429, caída de base y recuperación. Mapa de 2.873.084 bytes entregado con gzip en 77.951 bytes; no equivale al tiempo de carga de un teléfono.
- Copia restaurada en base distinta: **dos cuentas, dos perfiles, nueve registros**, revisión `20261006_0004`. La copia precede a otras cuentas ficticias añadidas por el chequeo de navegador.
- Auditoría npm completa y del lock Python de producción: sin vulnerabilidades conocidas al consultar. Resultado puntual, no garantía futura ni del entorno virtual antiguo.

El build mantiene advertencias de presupuesto SCSS en C6 (13,51 kB), C7 (11,33 kB) y C8 (10,30 kB), por debajo del límite de error de 16 kB. No se recortó su diseño ni se aumentó ese límite.

Informes locales ignorados por Git: `infra/.local/http-smoke.json`, `browser-smoke.json`, `resilience-smoke.json` y `assets-inventory.csv`. La configuración, certificados y copias privadas también permanecen allí; no publicarlos. Los contenedores del ensayo se retiran al terminar, conservando copia y volumen local para recuperación. El entorno de desarrollo no se reinicia.

## Requisitos y archivos

- Docker con motor Linux y Compose que admita `up --wait`.
- Python 3.12 para los scripts; `cryptography` para generar exclusivamente el certificado local de ensayo. Las dependencias del backend ya lo incluyen.
- Node 24 para pruebas locales de Angular; Docker compila el frontend sin necesitar Node en el anfitrión.
- `compose.production.yml`: independiente, no combinar con el Compose de desarrollo. Base/API sin puertos públicos, sin código montado, debug desactivado, cookies Secure, orígenes HTTPS exactos. API como usuario no root y filesystem de solo lectura con `/tmp` temporal.
- `compose.verify.yml`: PostgreSQL desechable en tmpfs, sin puertos publicados ni volúmenes habituales; servidor de pruebas separado.
- `backend/requirements-production.lock`: snapshot de versiones de ejecución. `frontend/package-lock.json`: instalación mediante `npm ci`. Guardar también los digests efectivos de las imágenes para una entrega exacta: los tags de imágenes base pueden actualizarse.
- `.env.production.example`: ejemplo, no configuración lista para publicar. Nunca utilizar su contraseña de ejemplo.
- `.github/workflows/verify.yml`: comprobaciones, **no despliegue automático**. Se ejecutará remotamente cuando se suban los archivos; no se ha publicado ni activado desde esta tarea.

## Ensayo local reproducible

Desde la raíz, Windows con el entorno existente:

```powershell
& .\backend\.venv\Scripts\python.exe -B infra/release.py prepare
& .\backend\.venv\Scripts\python.exe -B infra/release.py validate
& .\backend\.venv\Scripts\python.exe -B infra/release.py up
& .\backend\.venv\Scripts\python.exe -B infra/checks/http_smoke.py --exercise-account
& .\backend\.venv\Scripts\python.exe -B infra/release.py status
```

En Linux, usar `python3` en lugar del ejecutable de Windows, con las dependencias instaladas en un entorno virtual. El ensayo escucha solo en `https://localhost:18443` y `http://localhost:18080`. El certificado de prueba dura siete días; no debe reutilizarse para usuarios reales ni instalarse como autoridad del sistema. El chequeo HTTP confía únicamente en ese archivo y valida TLS; las pruebas de navegador pueden omitir la advertencia exclusivamente dentro del ensayo.

`prepare` genera una contraseña aleatoria y configuración privada bajo `infra/.local/`, ignorada por Git. No imprime sus valores ni sobrescribe una configuración existente. Si el certificado vence, detener el ensayo y generar otro conjunto en un directorio nuevo, conservando lo que se necesite recuperar; no borrar indiscriminadamente la carpeta ni el volumen.

`up` compila las imágenes, levanta la base, ejecuta migraciones explícitamente y espera disponibilidad de API/frontend. No aplica migraciones a la base de desarrollo. `down` elimina solamente los contenedores/red del ensayo, **no su volumen**:

```powershell
& .\backend\.venv\Scripts\python.exe -B infra/release.py down
docker compose -f compose.verify.yml down
```

El chequeo HTTP crea cuentas ficticias con dominio `example.invalid` solo cuando se solicita `--exercise-account`. Comprueba registro, sesión, logout/login, cookies, progreso C1–C9 y reintentos, rutas Angular, errores CSRF/tamaño, rechazo de clases desconocidas y bloqueo de saltos. Esto **no** demuestra haber jugado las nueve clases ni sustituye la revisión manual.

## Pruebas y migraciones

```text
cd frontend
npm ci
npm run test:ci
npm run build -- --configuration production
npm audit --audit-level=high
```

Desde la raíz:

```text
docker compose -f compose.verify.yml up -d --wait database
docker compose -f compose.verify.yml run --build --rm tests
docker compose -f compose.verify.yml down
```

La aplicación y las pruebas con base de datos usan únicamente PostgreSQL con el driver `postgresql+psycopg`. Se retiró el soporte SQLite. `compose.verify.yml` proporciona una base desechable sin puertos de host ni volúmenes persistentes; no utiliza el `.env` habitual.

Las pruebas con base de datos exigen `TEST_DATABASE_URL` y rechazan cualquier otro motor o un nombre que no termine en `_test`. Si falta la variable, fallan con instrucciones para usar `compose.verify.yml`; nunca usan `DATABASE_URL` de desarrollo como alternativa ni omiten silenciosamente las pruebas PostgreSQL. Las pruebas de funciones puras pueden ejecutarse sin base de datos. Las comprobaciones incluyen PostgreSQL concurrente y migraciones desde base vacía/esquema anterior; la base extra de migraciones se crea expresamente, se rechaza si ya existe y se retira al terminar. No ejecutar las pruebas contra una base real aunque se le ponga un nombre terminado en `_test`.

Angular ejecuta las pruebas con `isolate: true`: los mocks de Phaser de un archivo no deben contaminar otro. No se relajan las comprobaciones ni se cambia el controlador del personaje para acomodar un mock.

La migración `20261006_0004` pertenece al límite de acceso ya implementado. Su ensayo no autoriza aplicarla al entorno habitual. Para una publicación posterior: identificar versión, hacer copia, ensayar restauración, detener escrituras, ejecutar migración de esa versión y comprobar disponibilidad. No ejecutar `downgrade` automáticamente durante un rollback.

## Reglas y seguridad

- Solo se aceptan `lesson-01` a `lesson-09`; nuevas zonas requieren registrar su catálogo. El servidor exige todas las clases anteriores para avances nuevos. Reintentos de completaciones antiguas confirmadas siguen admitidos; no se borran datos heredados.
- Solo `status` y `currentStep`; paso entero entre 0 y 100, sin IDs de cuentas/perfiles enviados por el cliente. El paso es un límite de transporte, no una nota ni una certificación.
- Bloqueo por perfil en PostgreSQL y escritura atómica: varios workers no generan duplicados ni degradan una clase completada. No hay mutex local ni tablas nuevas.
- CSRF por cabecera/origen exacto, límite de cuerpo de 64 KiB y contador persistente de contraseña de ocho intentos por cinco minutos se conservan.
- Nginx limita acceso/registro/Google a 30 solicitudes por minuto por IP con ráfaga de 20, usando claves transitorias en memoria. No limita progreso ni logout. Revisar esa política si el grupo comparte una IP. No sustituye una política completa contra bots o ataques distribuidos; no se confía en IP reenviada por cabeceras del cliente.
- Cookies Secure/HttpOnly/Lax con ruta `/api`, mismo origen para API y frontend. Google se deshabilita en el ensayo; al habilitarlo, el ID público del build y backend debe coincidir y autorizarse el origen HTTPS real. No incorporar secretos OAuth al frontend.
- Versiones y vulnerabilidades conocidas revisadas; pasar un auditor no garantiza ausencia de vulnerabilidades. No utilizar `npm audit fix --force` ni actualizar dependencias mayores indiscriminadamente.
- Actualizaciones acotadas: Angular 22.2.0, Vitest 4.1.11 y Werkzeug 3.1.9 en el lock de producción. Referencias: [Angular Router](https://github.com/advisories/GHSA-ff3f-86qr-9cv3) y [Vitest/mocker](https://github.com/advisories/GHSA-82fw-gwwq-j7x9). La actualización de Werkzeug está en la imagen/lock de producción; no reinstala ni modifica automáticamente el entorno virtual de desarrollo.
- No imprimir `docker compose config` resuelto: puede contener contraseñas. Usar `config --quiet`. Proteger archivos privados y copias con permisos/ACL del sistema; `.gitignore` no es una protección de acceso ni elimina secretos ya publicados.

## Rendimiento y fallos del mapa

- Audio ambiental fuera de la carga esencial: se descarga tras el primer render; un archivo de audio fallido no impide jugar.
- Mapas y texturas existentes se reutilizan desde la caché de Phaser al volver a una escena.
- Fallos esenciales/construcción incompleta conservan la pantalla de recuperación en lugar de dejar un mapa a medias.
- Archivos de edición `.xcf`, `.psd`, `.aseprite`, `.ase`, `.tmx` y `.tsx` excluidos del build, **no eliminados de las fuentes**.
- Gzip para JSON/JavaScript/CSS/SVG. JS/CSS con hash pueden tener caché larga; mapas e imágenes con nombre estable deben revalidarse para no presentar una edición anterior tras actualizar.
- Medida local y acotada en Performance: `exploralab:scene-load:<SceneKey>` va de preload al primer render; conserva la última medida por escena y no transmite datos.

```text
python infra/checks/assets_inventory.py
```

Inventario con tamaños, hashes y exclusión bajo `infra/.local/assets-inventory.csv`. No se deducen licencias de los nombres. La compresión estimada de un archivo no es el tiempo de carga ni una medición de FPS. Antes de cerrar I10: medir carga fría/caliente y fluidez en el teléfono acordado, navegador y red reales, y aprobar objetivos de tiempo/FPS. No afirmar que una prueba en localhost resuelve los ocho segundos observados en el celular.

## Copias, restauración y vuelta atrás

```powershell
& .\backend\.venv\Scripts\python.exe -B infra/release.py backup
& .\backend\.venv\Scripts\python.exe -B infra/release.py restore-test --archive infra/.local/backups/ARCHIVO.dump
```

Archive `pg_dump` custom con checksum SHA-256, versión y fecha. La restauración usa una base separada recién creada con sufijo `_test`, transacción única, `--exit-on-error`, sin `--clean`, sin sobrescribir la original. Devuelve cuentas/perfiles/registros de progreso y revisión de migración. Las copias contienen datos privados y hashes de credenciales: no adjuntarlas a chats ni publicarlas. Un checksum detecta cambios accidentales; no prueba que un archivo externo sea confiable. Restaurar solo copias propias/verificadas.

Política propuesta para aprobar: copia diaria, antes de migraciones, 14 días de retención y copia cifrada fuera del servidor. No se ha instalado un cron, enviado copias fuera del equipo ni activado borrado automático. Faltan responsable, ubicación/acceso, retención definitiva y un ensayo en equipo separado. La copia local de prueba no satisface esa operación real.

Rollback posterior: conservar imágenes/versiones previas, no reconstruir arbitrariamente un tag antiguo; detener escrituras, comprobar compatibilidad de esquema y levantar la imagen previa **sin** downgrade automático. Si no es compatible, recuperar una copia en una base nueva, verificarla y acordar el cambio de conexión. Informar de la posible pérdida de cambios posteriores a la copia antes de hacerlo. Nunca `docker compose down -v` sobre la instalación real.

## Disponibilidad y diagnóstico

- `/api/v1/health`: proceso vivo y versión, no salud de PostgreSQL.
- `/api/v1/ready`: acceso a tablas de progreso/límite de contraseña, detecta base caída o migración faltante; 503 seguro y sin SQL/credenciales en la respuesta.
- API no almacenable en caché y `X-Request-ID` generado por el servidor para correlacionar incidentes.
- Logs limitados y rotados en Docker; diagnósticos del backend por endpoint/estado/identificador/duración, sin cuerpo, tokens, cookies, consulta SQL ni correo. Nginx/Gunicorn omiten URI/query/IP en access logs; Nginx usa nivel crítico para errores, para no reflejar consultas sensibles.
- Una comprobación fallida devuelve un código de salida distinto de cero; los healthchecks marcan el contenedor unhealthy. Docker no reinicia automáticamente un proceso vivo por estar unhealthy: investigar, no prometer autorrecuperación.

Operación futura: comprobar HTTPS/frontend y `/ready` desde fuera del servidor, avisar tras fallos consecutivos y definir quién responde. No existe un receptor de alertas ni vigilancia externa activa; no se inventó un servicio o contacto. Solicitar identificador/fecha/navegador al usuario, nunca contraseña/cookie. Conservar el aviso de progreso pendiente y no pedir que borre almacenamiento antes de revisar recuperación.

Comprobación explícita de resiliencia, **solo con el ensayo local en marcha**:

```text
python infra/checks/resilience_smoke.py
```

Comprueba caché de JS con hash, gzip/revalidación del mapa y ráfaga de peticiones GET sin crear cuentas. Después detiene brevemente **solo la base del proyecto `exploralab-local-check`**, comprueba liveness 200/readiness 503 y la reinicia incluso si falla la comprobación. Verifica que la API vuelva a estar disponible sin reiniciarla. El límite de acceso puede seguir activo hasta un minuto: ejecutar después del chequeo de cuentas/navegador, no inmediatamente antes. No es una prueba de carga, una operación sobre la base habitual ni vigilancia externa.

## Matriz manual antes de entregar

Para escritorio y teléfono objetivo, registrar versión, navegador, tamaño/orientación y resultado real:

1. Registro, acceso y salida; cuenta distinta no muestra borradores/progreso ajenos.
2. HUB → selección → Open Pit; movimiento, intro y transiciones, no solo acceso directo a una escena.
3. Jugar C1–C9; confirmar cada guardado y volver a consultar progreso/expediente.
4. Interrumpir una clase larga; cerrar/recargar y retomar con la misma cuenta.
5. Cortar red al finalizar; cerrar/regresar/recargar, recuperar conexión y reintentar sin repetir ni duplicar.
6. Reintentar desde un modal usando Tab/Shift+Tab/Enter y pantalla táctil; personaje bloqueado mientras corresponde.
7. Sesión vencida/revocada; acceso solicitado sin descartar silenciosamente el avance pendiente.
8. Rotación, segundo plano, regreso y cambio de mapa; sin controles pegados, canvas duplicado ni listeners acumulados.
9. Audio fallido deja jugar; mapa/textura esencial fallida permite recuperación.
10. Google real, únicamente tras habilitar el origen y credenciales correctos.

La prueba HTTP y las pruebas unitarias no sustituyen esta matriz. No hay una validación de iPhone/Safari o teléfono físico solo por simular su tamaño.

Chequeo adicional de navegador con una instalación aislada, sin modificar dependencias del juego:

```text
npm install --no-save --prefix infra/.local/browser playwright@1.62.1
npx --prefix infra/.local/browser playwright install chromium
node infra/checks/browser_smoke.cjs
```

Se puede indicar un módulo/executable de prueba ya instalado mediante `EXPLORALAB_PLAYWRIGHT_MODULE` y `EXPLORALAB_BROWSER_EXECUTABLE`. El navegador usa un perfil temporal, cuentas ficticias y solo localhost. Comprueba registro desde UI, render real de HUB/Open Pit mediante recuperación de escena, audio bloqueado, finalización pendiente sembrada como fixture y recuperación con API/PostgreSQL reales, además de tamaño táctil y rotación. No recorre físicamente los portales ni contesta C1–C9: eso sigue en la matriz manual. No recoge contraseñas ni identificadores personales en el informe.

## Entrega, privacidad, licencias y cPanel

Consultar [distribución y soporte](distribucion-soporte.md). Antes de publicar: aprobación de licencias de cada grupo de recursos, responsable/contacto, finalidad y plazos de datos, procedimiento de acceso/eliminación y versión exacta. No se ha publicado un aviso legal como si estuviera aprobado.

Para cPanel: frontend estático y rutas Angular son solo una parte; confirmar Python compatible, Passenger/WSGI, variables privadas, PostgreSQL y migraciones con el proveedor. No asumir que permite Docker o que copiar `dist` entrega el backend. Si no ofrece estas funciones, hará falta otra ubicación para la API o una arquitectura aprobada; no se cambió a MySQL/PHP ni se rediseñó autenticación. Referencia: [Application Manager de cPanel](https://docs.cpanel.net/cpanel/software/application-manager/).

Bases técnicas: [producción en Flask](https://flask.palletsprojects.com/en/stable/deploying/), [Compose en producción](https://docs.docker.com/compose/how-tos/production/), [pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html).

## Intro de Open Pit: progreso narrativo en PostgreSQL

Aplicado localmente el 2026-10-07: migración `20261007_0005`, sobre `20261006_0004`. La evidencia anterior corresponde a su versión histórica; no se repitió aquí todo el ensayo de producción.

- `scenario_progress`: `profile_id` (FK a `learning_profiles.id`, borrado en cascada), `scenario_key` y `intro_completed_at` nullable con zona horaria. Clave primaria compuesta `(profile_id, scenario_key)`; no duplicar usuario ni guardar otro booleano. Para `open-pit`, ausencia de fila o fecha nula significa intro pendiente.
- GET `/api/v1/me/progress` incluye `scenarios`, separado de `lessons`. PUT `/api/v1/me/scenarios/open-pit/intro` acepta únicamente `{ "completed": true }`. Perfil y fecha los decide el servidor autenticado. Reintentos y solicitudes concurrentes preservan la primera fecha.
- La marca antigua `exploralab.open-pit-intro.v1.*` ya no se lee ni se escribe; no migrarla como evidencia de una intro completada. Mantener las preferencias de bienvenida y las posiciones existentes. Una posición recuperada dentro del tajo no oculta la guía si el servidor informa intro pendiente.
- Intro pendiente: objetivo, señal del supervisor y minimapa. Finalizar la conversación espera confirmación antes de transportarse a `pit-intro-arrival` del mapa. Si falla, conservar la última parte del diálogo y reintentar desde la misma página; primero consultar el servidor por si se perdió una respuesta exitosa. No hay una cola offline persistente para la intro: si se cierra antes de guardarse, no se asume completada.
- Entrada normal con intro confirmada: trasladarse al tajo una vez terminado el fundido inicial. Al retomar una posición guardada, conservarla. Respuestas de sesiones anteriores no completan ni transportan otra cuenta. La intro no cuenta como clase ni cambia los porcentajes de las nueve lecciones.

Un reinicio completo de progreso debe eliminar `lesson_progress` y `scenario_progress` en la misma transacción, preservando `users`, `learning_profiles`, identidades y sesiones. Este cambio no ejecutó un nuevo borrado. Antes de un reinicio administrativo, evitar que pestañas abiertas o pendientes locales de clases vuelvan a subir avances; no confundir este procedimiento con cerrar una cuenta. No se añadió un endpoint público de reinicio.

Comprobación acotada: 41 pruebas de API/progreso/concurrencia/migración y 69 de disponibilidad en PostgreSQL aislado. Pruebas Angular de servicio, página, diálogos, escena, guía y minimapa; lint de los archivos TypeScript modificados. No se ensayó nube, recorrido completo C1–C9 ni teléfono físico para este cambio.

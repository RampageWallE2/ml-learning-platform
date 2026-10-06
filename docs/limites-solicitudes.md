# I05.3 — Tamaño máximo de solicitudes a la API

Implementado el 2026-10-06. Es una parte de I05, no una certificación de seguridad ni el cierre de todas sus validaciones.

## Comportamiento y configuración

Cada solicitud a `/api` o `/api/…` admite como máximo **65536 bytes (64 KiB) de cuerpo**. Se cuentan bytes, no caracteres; en UTF-8 un carácter puede ocupar varios bytes. El límite exacto se admite y un byte adicional se rechaza. No limita el tamaño de respuestas, imágenes o mapas ni solicitudes fuera de esa ruta.

Configuración del backend:

```dotenv
API_MAX_REQUEST_BYTES=65536
```

Es un entero positivo; cero, negativos, booleanos y valores inválidos no permiten desactivar silenciosamente el control. La configuración se lee al iniciar: cambiarla requiere reiniciar el backend. El valor se añadió a `.env.example`, no al `.env` privado. No hay nuevas dependencias, tablas o migraciones.

Se conserva el orden **CSRF → tamaño → ruta**. Una escritura sin verificación válida sigue devolviendo 403, sin leer el cuerpo. Una solicitud verificada demasiado grande devuelve 413 antes de crear cuentas/sesiones, consumir un intento de acceso, consultar Google, guardar progreso o revocar la sesión al salir. El control también incluye cuerpos adjuntos a rutas que normalmente no los usan, como salida, y a métodos GET/HEAD/OPTIONS; los métodos seguros habituales sin cuerpo siguen funcionando.

Respuesta de Flask:

```json
{
  "error": "Request body is too large.",
  "code": "request_too_large"
}
```

Estado 413 y `Cache-Control: no-store`; sin cambiar cookies ni reflejar datos del envío. HEAD no devuelve cuerpo, conforme a su funcionamiento HTTP. El CORS autorizado continúa presente en el error.

## Implementación y mensajes

`app/request_limits.py` configura el límite por solicitud mediante [la API de Flask 3.1](https://flask.palletsprojects.com/en/stable/api/#flask.Request.max_content_length), versión mínima ya requerida por el proyecto. Un tamaño declarado excesivo se rechaza sin leer el contenido. Para entradas que el servidor WSGI declara terminadas se permite leer **un byte adicional de comprobación**, con tope 65537, y se comprueba el tamaño real antes de ejecutar la ruta. Así una transmisión sin `Content-Length` no se acepta simplemente porque los primeros 64 KiB contienen JSON válido. Los bytes admitidos quedan en la caché de la solicitud y las rutas siguen usando su `get_json()` habitual.

Se conserva el [fallback seguro de Werkzeug](https://werkzeug.palletsprojects.com/en/stable/wsgi/#werkzeug.wsgi.get_input_stream): si no hay tamaño declarado ni indicación WSGI de terminación, no se intenta leer una entrada potencialmente infinita. En ese caso Flask no tiene un cuerpo legible que medir; las rutas JSON reciben un cuerpo vacío y lo rechazan por su validación habitual. La correcta delimitación HTTP pertenece también al servidor/proxy, no se sustituye mediante confianza en cabeceras enviadas por el cliente.

Angular reconoce 413 por estado, incluso si un proxy entrega HTML en lugar de JSON:

- Correo/registro: «El envío es demasiado grande. Revisa los datos e inténtalo nuevamente». Campos conservados y controles disponibles; no se navega ni se borra la sesión.
- Google: aviso específico de envío demasiado grande; no se cambia su flujo de autenticación.
- Guardado/reintento: aviso del tamaño con el avance pendiente conservado. Si no existe un pendiente, no se afirma que exista. La advertencia de almacenamiento local fallido conserva prioridad: no se oculta el aviso de no cerrar/recargar cuando el navegador no pudo persistir el resultado. Los demás avisos mantienen su prioridad anterior.

No se cambiaron HTML, SCSS, gráficos, matemáticas, mapas ni reglas de progreso. El manejo de errores de WorldPage es el único cambio de ejecución fuera de autenticación/configuración.

## Comprobaciones

- **Resultado final:** 216 pruebas del backend aprobadas (49 nuevas de tamaño) y 917 del frontend en 57 archivos (17 nuevas). `git diff --check` sin errores de espacios.
- Pruebas de backend con SQLite desechable: tamaño normal, límite exacto y exceso; JSON conservado para registro/acceso/progreso; salida con cuerpo; UTF-8; rutas actuales y futuras; respuestas grandes y rutas ajenas sin límite nuevo; CSRF/preflight/CORS; configuración inválida y personalizada.
- Se comprueba que rechazar no crea cuentas/sesiones/contadores, no consume el último intento disponible, no altera progreso existente ni revoca sesiones. Entradas WSGI terminadas sin tamaño declarado, o con tamaño subestimado, quedan acotadas a límite + 1 bytes; entradas sin terminación conservan el fallback seguro.
- **HTTP real:** servidor temporal exclusivamente en loopback con la aplicación Flask y SQLite en memoria. Solicitudes de acceso normales y de exactamente 64 KiB llegan a la validación; 64 KiB + 1 devuelve 413, sin consumir otro intento. Servidor detenido automáticamente al terminar la prueba. No se usó el servidor ni la base real del usuario.
- Pruebas de frontend con componentes/proveedores reales y controlador HTTP de pruebas: mensajes 413 de acceso/registro/Google, campos intactos, sesión conservada también ante salida rechazada, finalización pendiente preservada y reintento confirmado. Se prueba prioridad visible del aviso de tamaño y de almacenamiento fallido. No se realizó una nueva comprobación visual en navegador en esta subtarea; esto no sustituye una prueba en el teléfono o con Google real.
- Build de producción aprobado. Persiste el aviso SCSS anterior de C6 (11,64 kB frente a 10 kB), sin cambios en estilos. Los 12 avisos anteriores de Alembic/Flask-Migrate tampoco se ocultaron.

Comandos desde `backend` y `frontend`, respectivamente:

```powershell
& './.venv/Scripts/python.exe' -B -m pytest -p no:cacheprovider -q
```

```text
ng test --watch=false
ng build --configuration production
```

Los cuerpos legítimos del registro/acceso y guardado actuales quedan holgadamente por debajo del límite. Se comprobó además una credencial ficticia de Google de 8 KiB; no se utilizaron ni midieron tokens reales del usuario.

## Límites y validación pendiente

Validar Compose habitual, teléfono, Google real y el proxy/servidor del entorno de entrega. Un proxy puede rechazar antes con su propio 413; según el servidor, una transmisión interrumpida por exceso puede presentarse como error de conexión. Acordar límites y tiempos de espera del servidor en I04, que sigue aplazado.

Este control no limita cantidad/frecuencia de solicitudes, longitud de URL/cabeceras, duración de conexiones, complejidad de JSON ni el rango de cada campo. No es una defensa completa contra denegación de servicio. Las validaciones existentes de campos se conservan; reglas numéricas/de progreso adicionales se revisarán en su tarea, no aquí.

**I05 continúa abierto.** Sigue pendiente la prueba aislada sobre PostgreSQL y la aplicación aprobada de la migración de [I05.2](limites-acceso.md). No arrancar Compose para activar esto sin revisar ese pendiente: su comando actual aplica migraciones al iniciar el backend.

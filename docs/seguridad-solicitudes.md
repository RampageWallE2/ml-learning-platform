# I05.1 — Protección de solicitudes que cambian datos

Implementado el 2026-10-06. Es una parte de I05, no el cierre de toda la revisión de seguridad.

## Qué cambia

Antes de ejecutar una escritura bajo `/api` o `/api/`, Flask exige:

1. La cabecera `X-ExploraLab-Request: 1`.
2. Un `Origin` autorizado por `CSRF_TRUSTED_ORIGINS`. Se compara protocolo, nombre del servidor y puerto, no prefijos ni subdominios.

Si `Origin` no existe, se puede comprobar el origen de `Referer`. Un `Origin` presente pero vacío, inválido o `null` se rechaza, aunque `Referer` sea válido. Si no existe ninguno de los dos, se rechaza.

Una solicitud que no cumple devuelve **403** con `code: csrf_validation_failed`, antes de crear una cuenta/sesión, revocar una sesión o escribir progreso. El control incluye registro, acceso con contraseña, acceso con Google, salida y guardado; también cubre futuras rutas de escritura de la API. GET, HEAD y OPTIONS no necesitan la cabecera. No deben añadirse escrituras a esos métodos seguros.

Angular incorpora la cabecera mediante un interceptor registrado en `app.config.ts`. Solo la añade a POST, PUT, PATCH y DELETE que pertenezcan al origen y ruta de la API configurada en `AUTH_CONFIG`. No la incorpora a recursos del juego, dominios ajenos ni rutas parecidas como `/api/v10`. No modifica el cuerpo ni la configuración de cookies de cada servicio.

## Configurar los orígenes

Un origen es la dirección **del frontend que aparece en el navegador**, sin ruta, barra final, consulta ni fragmento. Por ejemplo: `http://localhost:4200`, no `http://localhost:4200/world`.

En el entorno del backend:

```dotenv
CORS_ORIGINS=http://localhost:4200
CSRF_TRUSTED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200
```

- Si `CSRF_TRUSTED_ORIGINS` no se define, usa la lista final de `CORS_ORIGINS`.
- Una lista vacía o entradas inválidas impiden iniciar la aplicación. No se aceptan comodines, expresiones regulares ni URLs con credenciales.
- Cada origen CORS debe estar también autorizado para CSRF. CORS controla el acceso del navegador cuando frontend y API tienen orígenes diferentes; la comprobación CSRF se aplica también cuando hay un proxy del mismo origen.
- Se normalizan mayúsculas del nombre del servidor y puertos predeterminados HTTP/HTTPS. Los demás puertos, protocolos y servidores siguen siendo diferentes.
- Las listas se cargan al iniciar: después de cambiarlas hay que reiniciar/recrear el backend.

### Probar desde el celular

Añadir a `backend/.env` el origen LAN exacto con el que se abre Angular. Este ejemplo es ilustrativo: reemplazar la IP por la que realmente se utiliza, no asumir que es la actual.

```dotenv
CSRF_TRUSTED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200,http://192.168.1.36:4200
```

El Compose de desarrollo existente pasa `backend/.env` al contenedor. No se modificó la configuración privada del usuario ni se autorizó automáticamente la red local. Su valor explícito de `CORS_ORIGINS` sigue siendo `http://localhost:4200`; esto permite la configuración habitual por proxy de Angular (`/api`), pero si el celular llama **directamente** a una API de otro origen, también debe incluirse el origen del frontend en la configuración efectiva de CORS del contenedor. La IP ilustrativa tampoco se añadió a `.env.example` como autorización predeterminada.

### Proxy y futura publicación

El control no utiliza `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto` ni `Forwarded` para otorgar confianza. Configurar el origen externo real del frontend y conservar `Origin`/`Referer` y la cabecera personalizada al reenviar la solicitud. Si el proxy elimina ambas cabeceras de origen, la escritura fallará; no se añade una excepción insegura.

Al publicar, sustituir los orígenes de desarrollo por las direcciones HTTPS aprobadas. La preparación de HTTPS, cookies `Secure`, dominios y servidores de producción pertenece a I04, aplazado hasta antes de la demostración. Esta tarea no los configura ni certifica el despliegue.

Actualizar frontend y backend juntos: un frontend anterior que no envíe la nueva cabecera ya no podrá escribir. En pruebas manuales con curl/Postman, enviar explícitamente un origen autorizado y `X-ExploraLab-Request: 1`, además de la cookie cuando corresponda. Las herramientas no navegador pueden falsificar esas cabeceras: este filtro no reemplaza la autenticación.

## Fundamento y límites

La cabecera es un **marcador público**, no un token secreto ni una contraseña. Un formulario HTML no puede añadirla; una solicitud de otro origen con esa cabecera requiere autorización CORS previa en el navegador. El servidor además exige el origen exacto. Se aplica el patrón de [cabecera personalizada y verificación de origen descrito por OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), con un [interceptor funcional de Angular](https://angular.dev/guide/http/interceptors).

La cookie de sesión, su validación y su revocación siguen siendo necesarias. No es protección contra XSS, robo de cookies, automatizaciones que falsifiquen las cabeceras ni abuso desde un origen autorizado. No se implementaron límites de intentos, límites de tamaño de cuerpos, recuperación de contraseña ni cambios de permisos/reglas de progreso. No hay nuevas dependencias ni migraciones.

## Comprobaciones realizadas

- **Backend:** 124 pruebas aprobadas sobre SQLite en memoria, con el filtro activo también durante las pruebas. Incluyen orígenes inválidos, ausentes y `null`, cabecera ausente/incorrecta, fallback a Referer, puertos/protocolos, configuración inválida, futuro API, formularios, preflight, proxy y origen LAN autorizado de forma explícita. Se verifica que rechazar no crea cuentas/sesiones, no revoca la sesión existente y no crea ni actualiza progreso.
- **Frontend:** 896 pruebas aprobadas en 57 archivos, incluidas 39 nuevas pruebas del interceptor y su integración con los proveedores reales de la aplicación, AuthService y ProgressService. Un 403 no se interpreta como sesión vencida; el guardado pendiente se conserva para reintentar.
- **Compilación de producción:** aprobada. Sigue únicamente el aviso anterior de C6: 11,64 kB SCSS frente al umbral de aviso de 10 kB.
- **Navegador:** servicios e interceptores reales de Angular con Flask real y base temporal SQLite en memoria. Registro y guardado por proxy con `Host` reescrito y `Origin` conservado; acceso, PUT idempotente y salida directos con preflight autorizado. Un formulario sin cabecera, incluso con cookie, obtiene 403 y conserva la sesión. Un origen no autorizado obtiene 403 por proxy; su solicitud directa queda bloqueada en el navegador tras preflight sin permiso CORS y no llega como POST. El cierre legítimo devuelve 200 y la comprobación posterior devuelve 401. No se usaron cuentas reales, PostgreSQL real, Google real ni Phaser.
- **Evidencia local:** `frontend/tmp/csrf-qa/browser-proof.jpg` y `browser-proof-final.jpg`, ignorados por Git. Los servidores temporales y pestañas de prueba quedaron cerrados; sus datos en memoria no persisten.

Comandos ejecutados desde `backend` y `frontend`, respectivamente:

```powershell
& './.venv/Scripts/python.exe' -B -m pytest -p no:cacheprovider -q
```

```text
ng test --watch=false
ng build --configuration production
```

En este equipo Angular se ejecutó con el Node disponible en el entorno. Las pruebas HTTP de Angular usan su controlador de pruebas; la comprobación en navegador descrita arriba utiliza solicitudes HTTP reales, pero un proxy local de QA, no Docker/EC2.

## Validación pendiente

Probar registro, acceso con contraseña y Google, salida y guardado con el Compose habitual y en el celular real, después de configurar su origen. Confirmar en el entorno de entrega que el proxy conserva las cabeceras. No declarar cerrado I05 hasta completar sus demás controles y la validación del usuario. La primera parte posterior de **I05.2: límites de acceso con contraseña** está implementada y documentada en [su guía](limites-acceso.md), con migración aún pendiente de aplicar a la base real. Consultar esa guía antes de reiniciar Compose, que ejecuta migraciones automáticamente.

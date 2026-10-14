# Desarrollo local con Docker

Esta guía reúne las opciones técnicas del arranque local. Para conocer el proyecto
y ejecutarlo por primera vez, empieza por el [README principal](../README.md).

## Qué inicia el comando

Desde la raíz del repositorio:

```bash
docker compose up --build
```

Se inician PostgreSQL, la API Flask y la web Angular. La API aplica las migraciones;
la web espera a que la API esté lista. El código se recarga al guardar cambios.

La configuración predeterminada usa:

| Servicio | Dirección local |
|---|---|
| Web | `http://localhost:4200` |
| API | `http://localhost:5000` |
| PostgreSQL | `localhost:5432` |

La API y PostgreSQL solo aceptan conexiones de tu computadora. La web puede usarse
desde la red local si autorizas el origen del navegador y el firewall lo permite.

Las credenciales de PostgreSQL de `compose.yml` son públicas y solo para desarrollo.
No publiques este entorno en Internet ni lo uses con datos reales. El despliegue
utiliza sus propias [guías de preparación](preparacion-produccion.md).

## Datos y reinicios

Una instalación nueva no incluye usuarios. Registra una cuenta con correo y
contraseña. Sus datos se guardan en el volumen `postgres_data`, cuyo nombre completo
incluye el nombre del proyecto de Compose.

```bash
docker compose down
```

Este comando detiene y retira los contenedores, pero conserva el volumen. No añadas
`-v`: esa opción elimina el volumen y sus cuentas y progresos.

## Configuración opcional

El arranque en localhost no necesita un `.env`. Si quieres personalizarlo, crea
uno en la raíz del repositorio. Está ignorado por Git: no lo subas al repositorio.

Compose lee ese archivo, no `backend/.env`. Los contenedores tampoco cargan archivos
privados automáticamente con Flask o python-dotenv. Las plantillas
`.env.production.example` y `.env.ec2.example` son para despliegue; no debes copiarlas
para iniciar el entorno local.

### Probar desde el celular

El celular y la computadora deben estar en la misma red. Añade al `.env` raíz la
dirección exacta que abrirás en el navegador del celular:

```dotenv
CORS_ORIGINS=http://localhost:4200,http://127.0.0.1:4200,http://192.168.1.36:4200
CSRF_TRUSTED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200,http://192.168.1.36:4200
```

`192.168.1.36` es un ejemplo: cámbiala por la IP de tu computadora. Permite el puerto
4200 en el firewall solo para tu red de pruebas y abre `http://TU_IP:4200` en el celular.
No incluyas `/world` ni otras rutas en esas variables.

Después de cambiar variables, vuelve a ejecutar `docker compose up --build` para
recrear los contenedores que lo necesiten. No uses comodines ni desactives la
protección CSRF. La web envía las solicitudes a la API mediante su proxy `/api`;
el teléfono no necesita acceder directamente a PostgreSQL ni al puerto 5000.

Más detalles en la [guía de solicitudes seguras](seguridad-solicitudes.md).

### Activar el acceso con Google

Necesitas un cliente OAuth de Google configurado para los orígenes que utilizarás.
Añade su identificador público al `.env` raíz:

```dotenv
GOOGLE_CLIENT_ID=tu-identificador.apps.googleusercontent.com
```

Compose transmite el mismo identificador al frontend y al backend. Es un ID público,
no un secreto OAuth. No añadas claves privadas al código. Recrea los contenedores
después de cambiar esta configuración.

### Cambiar puertos

Si otro programa ya ocupa un puerto, puedes detenerlo o elegir otros en el `.env`:

```dotenv
FRONTEND_PORT=4300
BACKEND_PORT=5100
POSTGRES_PORT=5433
CORS_ORIGINS=http://localhost:4300,http://127.0.0.1:4300
CSRF_TRUSTED_ORIGINS=http://localhost:4300,http://127.0.0.1:4300
```

Cuando cambies el puerto web, actualiza también los orígenes CORS y CSRF. Si pruebas
desde un celular, incluye además su dirección de acceso con ese nuevo puerto.

Ninguna de estas variables es obligatoria para el arranque predeterminado.

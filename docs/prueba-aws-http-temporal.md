# Prueba temporal en EC2 por HTTP

Fecha: 2026-10-09. El usuario autorizó expresamente una prueba de despliegue/rendimiento sin HTTPS. **No es una configuración de producción segura ni una validación de entrega definitiva.** No aceptar condiciones, registrar correo ni solicitar certificados de Let's Encrypt para esta modalidad.

## Qué cambia y qué se conserva

Se añade explícitamente `compose.ec2-http-test.yml` después de `compose.production.yml`. Nunca combinarlo con el Compose de desarrollo. La configuración HTTPS, sus validaciones y `.env.ec2` permanecen intactas. No se reconstruye ni modifica el juego: se utilizan las imágenes ya compiladas de la versión identificada en `RELEASE_COMMIT`.

- Nginx publica únicamente HTTP 80, sin TLS, HSTS ni redirección a HTTPS. El archivo temporal conserva proxy, gzip, caché, rutas Angular, límites y headers aplicables a HTTP.
- La API usa **configuración de desarrollo con debug apagado**, porque producción rechaza deliberadamente HTTP/cookies no seguras. Sigue ejecutándose mediante Gunicorn, no `flask run`. Angular sigue compilado, no `ng serve`.
- Solo en esta modalidad la cookie no lleva `Secure`; conserva `HttpOnly`, `SameSite=Lax` y ruta `/api`. CSRF/CORS admiten únicamente el origen HTTP indicado. Google permanece deshabilitado.
- PostgreSQL, credenciales, volumen, autenticación, límites de solicitudes y código de lecciones no cambian. API y PostgreSQL no publican puertos.

**HTTP no cifra contraseñas ni sesiones, y permite interceptar/modificar tráfico.** Usar solo cuentas ficticias y contraseñas no reutilizadas. Restringir el puerto 80 a la IP de los participantes si es posible; no abrir 5000/5432 y mantener SSH limitado. El modo no impone esa restricción en AWS: debe configurarla el titular en el Security Group. No ingresar cuentas reales ni datos personales, aunque la prueba dure poco tiempo.

## Arranque en la EC2 ya preparada

Comandos para Bash en Ubuntu, no PowerShell. Requieren Docker Compose 2.24.4 o posterior para reemplazar, no acumular, los puertos/montajes. Sustituir `IP_PUBLICA_REAL` por la dirección de esta prueba. `HTTP_TEST_ORIGIN` no es un secreto y debe ser el origen exacto `http://IP_PUBLICA_REAL`, sin barra final.

```bash
set -eu
cd /opt/exploralab
unset APP_VERSION PUBLIC_ORIGIN BIND_ADDRESS HTTP_PORT HTTPS_PORT TLS_DIR
unset POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD GOOGLE_CLIENT_ID WEB_CONCURRENCY
release_http=(sudo env HTTP_TEST_ORIGIN=http://IP_PUBLICA_REAL \
  docker compose --env-file /opt/exploralab/.env.ec2 -p exploralab-ec2 \
  -f /opt/exploralab/compose.production.yml \
  -f /opt/exploralab/compose.ec2-http-test.yml)

"${release_http[@]}" config --quiet
"${release_http[@]}" run --rm --no-deps frontend nginx -t
# La EC2 actual ya tiene la base migrada; no recrear ni borrar sus datos.
"${release_http[@]}" up -d --wait --wait-timeout 180 backend frontend
"${release_http[@]}" ps
```

No imprimir `config` resuelto con el archivo privado. `infra/ec2_preflight.py` continúa validando **HTTPS**, no el override HTTP; no presentarlo como verificación de esta modalidad. Para una instalación nueva, construir imágenes, arrancar la base y ejecutar `run --rm migrate` antes de arrancar la API, como en la guía principal, con este comando temporal explícito. En actualizaciones con datos, conservar primero una copia verificada.

Desde otro equipo comprobar `/healthz`, `/api/v1/ready`, landing, `/login`, `/world` y mapa. Verificar registro/acceso/salida con una cuenta ficticia, sin completar lecciones por peticiones inventadas. La medición de carga, FPS, móviles o concurrencia es una tarea distinta: una respuesta HTTP 200 no demuestra buen rendimiento.

## Detener y volver a HTTPS

Al terminar la prueba, en la sesión con la variable del paso anterior:

```bash
"${release_http[@]}" stop frontend
```

No borrar volúmenes, archivos privados, cuentas ni ejecutar un prune general. Parar contenedores no detiene los cobros de AWS. No se programa ningún apagado ni limpieza automática.

Para volver a HTTPS, completar primero certificado real/exportación/renovación de la [guía principal](despliegue-aws-prueba.md). Luego ejecutar el preflight TLS y `up -d --wait backend frontend` usando **solo** `compose.production.yml` con `.env.ec2`, sin el override HTTP. Eso restablece cookies `Secure`, origen HTTPS, puerto 443 y configuración Nginx de producción. Sin un certificado real, no arrancar la web de producción.

## Estado

Comprobado el 2026-10-09:

- Cuatro pruebas de combinación Compose aprobadas con plantillas públicas: producción sigue HTTPS/Secure, override exige origen explícito, base y límites se conservan y la web temporal reemplaza TLS/443 por HTTP 80. No se arrancaron servicios locales para estas pruebas.
- Solo el override y la plantilla Nginx nuevos se transfirieron a EC2. Sus SHA-256 se verificaron antes de instalar archivos root `644`. Sintaxis real de Nginx aprobada dentro de un contenedor sin publicar puertos antes de arrancar la web.
- Backend/frontend/database saludables. App e imágenes siguen en `ec2-c8d59ee0619f`; migración `20261007_0005 (head)`. PostgreSQL no se recreó ni se migró de nuevo. `.env.ec2`, sus credenciales, Compose HTTPS y plantilla Nginx de producción permanecieron idénticos, comprobados por hash.
- Runtime verificado: debug apagado, cookie no Secure solo para la prueba, origen CSRF/CORS HTTP exacto y Google deshabilitado. Solo frontend tiene binding público `0.0.0.0:80`; ni API/base ni 443 están publicados. El `443/tcp` que aparece en `docker ps` es metadata EXPOSE de la imagen, no un puerto publicado.
- **26 comprobaciones HTTP desde loopback de EC2** aprobadas: rutas Angular, mapa, archivos cacheados/gzip, readiness, rechazo CSRF, límite de tamaño, registro/acceso/salida y lectura de progreso vacío. Se creó una sola cuenta ficticia `example.invalid`, con sesiones cerradas; no se imprimieron credenciales ni se completó intro/clases. No es un recorrido jugado ni una prueba de carga/FPS/concurrencia.
- **Acceso externo pendiente:** conexión desde la computadora del usuario al puerto 80 agotó el tiempo de espera, también con curl sin proxy. Nginx responde en el host, UFW está inactivo y Docker tiene el binding/NAT de 80. La captura aportada después muestra únicamente una regla entrante TCP 22 con origen `0.0.0.0/0`, no HTTP 80. El titular debe añadir HTTP 80 para las IP de la prueba y restringir SSH a su IP administrativa; no se editaron Security Groups desde herramientas.
- No se aceptaron condiciones, registraron cuentas ACME/correo ni emitieron certificados. Certbot instalado permanece sin utilizar para emisión/renovación.

Pendiente: regla de red y comprobación desde fuera de EC2, apertura del juego en navegador/dispositivos acordados y medición real de rendimiento. HTTPS de producción sigue aplazado por decisión expresa. I04/I09 continúan abiertos.

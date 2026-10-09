# Prueba de ExploraLab en una EC2

Actualización: 2026-10-09. El usuario creó la EC2 y autorizó subir y preparar el proyecto. La versión `c8d59ee0619f` está instalada, PostgreSQL/API funcionan de forma privada y se arrancó una [prueba HTTP temporal](prueba-aws-http-temporal.md) por decisión expresa del usuario. Tras añadir HTTP 80 para su IP, ocho lecturas externas desde su computadora devolvieron HTTP 200; el juego en navegador/dispositivos y rendimiento real siguen pendientes. Esta guía conserva la preparación **HTTPS de producción**, aplazada por ahora; no hay dominio ni certificado y no se aceptaron condiciones. No es un lanzamiento público definitivo.

## Decisión técnica

Una EC2 aloja el Compose de producción existente: Nginx sirve Angular compilado y HTTPS, Gunicorn atiende la API y PostgreSQL guarda cuentas/progreso en un volumen privado. Solo Nginx publica puertos. No se necesitan RDS, un balanceador, Kubernetes ni otra arquitectura para esta prueba.

Se utiliza **solo `compose.production.yml`**, con el proyecto `exploralab-ec2`. Nunca combinarlo con `compose.yml`, copiar `backend/.env` ni subir la base de desarrollo. Las migraciones se ejecutan explícitamente antes de arrancar la API.

### HTTPS sin comprar dominio

Let’s Encrypt permite certificados para IP públicas. Estos duran 160 horas, aproximadamente seis días; la renovación automática es indispensable. Usar Certbot 5.4 o posterior, con `--ip-address` y el perfil `shortlived`. No publicar las sesiones por HTTP ni usar el certificado autofirmado del ensayo local. [Disponibilidad de certificados IP](https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability), [soporte en Certbot](https://letsencrypt.org/2026/03/11/shorter-certs-certbot).

Para reutilizar la configuración actual, Certbot valida mediante su servidor temporal en el puerto 80. La renovación **detiene brevemente la web**, no PostgreSQL ni la API. Para un servicio permanente se podrá evaluar validación webroot sin ese corte, en una tarea aparte.

## 1. Lo que debe decidirse antes de crear la EC2

- Región, presupuesto y duración de la prueba. Revisar el coste de instancia, disco, IPv4 y transferencia; no asumir gratuidad. Configurar un aviso de presupuesto en la cuenta AWS.
- Propuesta inicial: Ubuntu Server 24.04 LTS **x86_64**, 2 vCPU, 4 GiB de RAM y unos 30 GB de EBS gp3 cifrado. Es una estimación para construir las imágenes y demostrar el juego; no una prueba de capacidad ni garantía de concurrencia. No elegir una instancia de 1 GiB para compilar Angular sin revisar antes su memoria.
- Subred pública con salida a Internet, IPv4 pública, clave SSH e IMDSv2 obligatorio. No hacen falta claves de acceso AWS dentro de la aplicación.
- Preferiblemente una Elastic IP para conservar la dirección. Es un recurso facturable incluso sin uso. La IPv4 automática puede cambiar al detener/arrancar la instancia; si cambia, hay que actualizar origen y certificado antes de compartir el enlace. [Elastic IP y costes](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html), [parada/arranque](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html).
- Confirmar si el profesor accederá desde IP conocida o desde distintas redes. Empezar con un piloto cerrado y cuentas de demostración; no trasladar datos personales reales.

### Reglas de entrada del Security Group

| Puerto TCP | Origen | Motivo |
| --- | --- | --- |
| 22 | Solo tu IP pública `/32` | Administrar por SSH; nunca abierto a todo Internet. |
| 80 | `0.0.0.0/0` | Validación pública de Let’s Encrypt y redirección HTTP a HTTPS. No limitarlo a tu IP si usas esta validación. |
| 443 | IP de los participantes, o `0.0.0.0/0` si se aprueba acceso público | Entrar al juego por HTTPS. |

No abrir 4200, 5000, 5432, 2375 ni 2376. Esta preparación es IPv4; no añadir reglas IPv6 sin preparar esa ruta. Las reglas se basan en la [guía de Security Groups de AWS](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html). No confiar únicamente en UFW: los puertos publicados por Docker requieren comprobar también el filtrado externo. [Docker y filtrado de paquetes](https://docs.docker.com/engine/network/packet-filtering-firewalls/).

## 2. Instalar herramientas y una versión aprobada

**Todos los comandos siguientes son para Bash en la futura EC2 Ubuntu. No ejecutarlos en PowerShell ni en el proyecto de desarrollo.** Detenerse ante cualquier error; no continuar hacia las migraciones o publicación.

Instalar Docker Engine y el plugin Compose siguiendo el [repositorio oficial para Ubuntu](https://docs.docker.com/engine/install/ubuntu/). Comprobar `sudo docker version` y `sudo docker compose version`. No instalar Angular CLI ni ejecutar `ng serve` o `flask run` en el host.

```bash
sudo apt-get update
sudo apt-get install -y git python3-venv snapd
sudo snap install --classic certbot
sudo /snap/bin/certbot --version
```

Certbot debe ser 5.4 o posterior. Si ya hay otra instalación, resolverla con las [instrucciones oficiales de Certbot](https://certbot.eff.org/instructions?os=snap&ws=nginx); no mezclar instalaciones. Aquí no se usa `certbot --nginx`: Nginx está dentro del contenedor.

Colocar un checkout del repositorio en **`/opt/exploralab`** y seleccionar el commit de entrega aprobado. También se puede transferir un snapshot de archivos versionados mediante `git archive`, añadir un manifiesto `RELEASE_COMMIT` con el hash completo y verificar el SHA-256 del archivo antes de extraerlo. La prueba actual utiliza este segundo método y **no tiene `.git` en la EC2**. Para un repositorio privado, usar acceso de lectura o transferencia segura; no introducir tokens en comandos, historial ni archivos del juego. No copiar `node_modules`, entornos virtuales, `.env`, certificados ni volúmenes locales.

El checkout, sus directorios padres y el entorno de despliegue deben quedar bajo control de root, sin escritura de otros usuarios: Certbot ejecutará el script de esta versión como root. No instalar un hook que importe código modificable por usuarios sin privilegios.

```bash
sudo chown -R root:root /opt/exploralab
sudo chmod -R go-w /opt/exploralab
sudo python3 -m venv /opt/exploralab/.venv-deploy
sudo /opt/exploralab/.venv-deploy/bin/python -m pip install cryptography==50.0.1
cd /opt/exploralab
if [ -d .git ]; then
  sudo git rev-parse HEAD
else
  test -f RELEASE_COMMIT
  cat RELEASE_COMMIT
  printf '\n'
fi
```

La dependencia de este entorno sirve únicamente para revisar certificados; coincide con la versión del lock de producción del backend. Antes de instalar hooks, comprobar que el checkout es la versión aprobada y no contiene cambios inesperados.

## 3. Crear la configuración privada de EC2

Solo en la primera instalación:

```bash
if sudo test -e /opt/exploralab/.env.ec2; then
  printf '%s\n' 'Ya existe una configuración privada; no se reemplaza.'
else
  sudo install -m 600 .env.ec2.example /opt/exploralab/.env.ec2
fi
sudo nano /opt/exploralab/.env.ec2
```

Completar los valores de ejemplo sin comillas, `export`, interpolación ni líneas duplicadas:

- `APP_VERSION`: por ejemplo `ec2-` seguido del hash del commit aprobado.
- `PUBLIC_ORIGIN`: `https://` seguido de la IPv4 pública definitiva, sin barra final. Debe ser la misma IP solicitada a Certbot.
- `POSTGRES_PASSWORD`: contraseña aleatoria nueva, al menos 32 caracteres seguros. Puede generarse en tu propia terminal con `python3 -c 'import secrets; print(secrets.token_hex(32))'`; guardarla de forma privada, no enviarla al chat ni a Git.
- Conservar `0.0.0.0`, puertos 80/443 y `/srv/exploralab/tls`; los hooks dependen de esas rutas.
- Mantener `GOOGLE_CLIENT_ID` vacío. Esta demostración usa correo y contraseña; Google real exige otra configuración y validación.

`.env.ec2` y `.venv-deploy` están ignorados por Git. No imprimir `docker compose config` resuelto: puede mostrar la contraseña. Tampoco usar `source .env.ec2` ni compartir `docker inspect` con secretos.

```bash
sudo .venv-deploy/bin/python -B infra/ec2_preflight.py --configuration-only --compose
```

La comprobación no crea contenedores ni modifica datos. Rechaza los valores de ejemplo, orígenes inseguros, puertos incorrectos y claves repetidas/desconocidas. Este modo **no comprueba TLS ni declara el sitio listo**.

## 4. Obtener y preparar HTTPS

Antes de registrar una cuenta o solicitar un certificado, el titular debe revisar y confirmar que acepta las [condiciones vigentes de Let's Encrypt](https://letsencrypt.org/repository/). Instalar Certbot no equivale a aceptar esas condiciones. Mientras la revisión esté pendiente, no registrar el correo, aceptar condiciones automáticamente ni ejecutar la emisión. Se puede construir las imágenes y arrancar únicamente PostgreSQL/API como en el paso siguiente; no publicar la web sin HTTPS real.

El puerto 80 debe estar libre en el host y accesible desde Internet. Sustituir `IP_PUBLICA_REAL` antes de ejecutar; Certbot preguntará por correo y condiciones del servicio.

```bash
sudo /snap/bin/certbot certonly --standalone \
  --required-profile shortlived \
  --ip-address IP_PUBLICA_REAL \
  --cert-name exploralab-ec2

sudo install -o root -g root -m 755 infra/ec2_certbot_hook.sh \
  /usr/local/sbin/exploralab-certbot-hook
sudo /usr/local/sbin/exploralab-certbot-hook deploy
sudo .venv-deploy/bin/python -B infra/ec2_preflight.py --compose
```

Usar un certificado real, no `--staging`. La revisión comprueba pareja certificado/clave, nombre o IP, vigencia superior a 24 horas y ausencia de autofirma evidente; **no sustituye la validación de confianza de un navegador**.

El hook exporta los PEM a `/srv/exploralab/tls` con permisos privados y publica la pareja cambiando un único enlace `current`. Nginx monta todo ese directorio, no archivos individuales ni los enlaces de Certbot que apuntan fuera del montaje. No sobrescribe una instalación TLS ajena. Conserva los bundles anteriores para recuperación; acordar su retención/limpieza si la prueba se prolonga. Nunca subir las claves privadas a Git ni incluirlas en capturas.

## 5. Construir, migrar y arrancar

En esta sesión Bash, eliminar variables heredadas que podrían imponerse al archivo privado y fijar el comando de Compose:

```bash
unset APP_VERSION PUBLIC_ORIGIN BIND_ADDRESS HTTP_PORT HTTPS_PORT TLS_DIR
unset POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD GOOGLE_CLIENT_ID WEB_CONCURRENCY
release_compose=(sudo docker compose --env-file /opt/exploralab/.env.ec2 \
  -p exploralab-ec2 -f /opt/exploralab/compose.production.yml)

"${release_compose[@]}" config --quiet
"${release_compose[@]}" build backend frontend
"${release_compose[@]}" up -d --wait --wait-timeout 180 database
"${release_compose[@]}" run --rm migrate
"${release_compose[@]}" up -d --wait --wait-timeout 180 backend
"${release_compose[@]}" ps
"${release_compose[@]}" exec -T backend flask --app app db current
```

Estos comandos no publican la API ni PostgreSQL. Solo después de completar el paso 4 y aprobar la comprobación TLS, arrancar la web:

```bash
sudo .venv-deploy/bin/python -B infra/ec2_preflight.py --compose
"${release_compose[@]}" up -d --wait --wait-timeout 180 frontend
"${release_compose[@]}" ps
```

La revisión actual de migraciones es `20261007_0005`; incluye la intro de Open Pit por cuenta. No arrancar la API si la migración falla. Para una actualización posterior, hacer y comprobar una copia **antes** de migrar; no ejecutar un downgrade o reemplazar una base con datos a ciegas. Cambiar la contraseña del archivo después de inicializar PostgreSQL no cambia automáticamente la contraseña del usuario de la base.

No utilizar `infra/release.py up` ni los smoke checks locales en EC2: sus límites a localhost son intencionales. No eliminar esos controles para poder utilizarlos en la nube.

## 6. Configurar y comprobar la renovación

Después de arrancar la web, guardar los hooks en la configuración de este certificado. `reconfigure` ensaya la renovación y conserva los cambios si pasa; `--run-deploy-hooks` prueba la exportación con el certificado real vigente, no publica el certificado de pruebas. [Guía de Certbot](https://eff-certbot.readthedocs.io/en/stable/using.html#modifying-the-renewal-configuration-of-existing-certificates).

```bash
sudo /snap/bin/certbot reconfigure --cert-name exploralab-ec2 \
  --pre-hook '/usr/local/sbin/exploralab-certbot-hook pre' \
  --deploy-hook '/usr/local/sbin/exploralab-certbot-hook deploy' \
  --post-hook '/usr/local/sbin/exploralab-certbot-hook post' \
  --run-deploy-hooks
sudo systemctl list-timers --all
```

Confirmar que el temporizador de renovación instalado por snap está activo. No dar la renovación por configurada solo porque se emitió el primer certificado. Revisar el resultado del ensayo, que la web vuelve a estar saludable, y la fecha del certificado **servido**. El hook detiene solo `frontend`, exporta tras emisión correcta y lo arranca de nuevo; si falla la emisión conserva la última pareja publicada. Una caída del host o fallo del post-hook requiere intervención. Con seis días de vigencia, hay que atender errores antes de la caducidad.

## 7. Qué comprobar antes de compartir el enlace

Desde otro equipo/red, sustituyendo `IP_PUBLICA_REAL`:

```bash
curl --fail --show-error https://IP_PUBLICA_REAL/healthz
curl --fail --show-error https://IP_PUBLICA_REAL/api/v1/ready
curl --head http://IP_PUBLICA_REAL/
```

No usar `-k` ni ignorar advertencias del navegador. El HTTP debe redirigir al mismo origen HTTPS. La comprobación interna de Nginx no demuestra confianza pública del certificado.

- Abrir landing, registro/acceso y una ruta Angular directamente, luego recargar `/world`.
- Crear dos cuentas ficticias distintas y comprobar aislamiento del progreso.
- Jugar intro, C1–C9 y entrega al supervisor mediante la interfaz; confirmar guardados y recuperación al volver. Una petición inventada que complete clases no valida la experiencia.
- Probar celular físico vertical/horizontal, tacto, minimapa, diálogos, audio bloqueado, segundo plano y una interrupción de conexión. La EC2 no resuelve por sí sola los pendientes educativos/móviles de I09.
- Comprobar que 5000/5432 no son accesibles externamente y que los contenedores vuelven tras un reinicio controlado. Mantener la IP elegida; no cambiarla durante la comprobación sin rehacer TLS/origen.
- Observar memoria, CPU, espacio del disco y errores durante una sesión. No afirmar capacidad para grupos grandes sin medirla.

## 8. Datos, copias y fin de la prueba

La base de EC2 comienza vacía. No copiar la base local con cuentas reales. El volumen del proyecto conserva los datos entre recreaciones de contenedores, pero **no es una copia de seguridad** ni protege frente a eliminación de la instancia/disco.

Antes de actualizar o retirar la prueba, crear un `pg_dump` en formato custom, guardarlo con permisos privados, calcular su hash y conservar una copia cifrada fuera de esta EC2. Comprobar restauración en otra base/entorno sin sobrescribir la base que usa el profesor. El procedimiento local de copia/restauración está en [preparación de producción](preparacion-produccion.md); su herramienta no está autorizada para operar sobre EC2. El destino externo, retención y ensayo de restauración de esta instancia siguen pendientes de configurar.

Para apagar únicamente los contenedores, con la variable de Compose del paso 5:

```bash
"${release_compose[@]}" down
```

No añadir `-v`, no borrar volúmenes ni ejecutar un prune general. Apagar contenedores **no detiene los cobros de AWS**. Detener una instancia conserva recursos facturables; terminarla puede destruir el disco según su configuración. Revisar por separado instancia, EBS, snapshots e IP, y retirar solo los recursos identificados de esta prueba después de preservar los datos necesarios. No se automatiza ninguna eliminación aquí.

## Estado y criterio de cierre

Preparado en el repositorio: plantilla privada de EC2, validación previa, hook de certificados, Compose de producción existente y esta guía. Las pruebas nuevas usan certificados ficticios y subprocesses simulados; no crean recursos ni guardan usuarios.

Verificado localmente: 19 pruebas nuevas aprobadas tanto en Windows como en un contenedor Linux aislado sin red, sintaxis Bash y esquema Compose. Las imágenes de backend/frontend se construyeron correctamente con el Compose de producción; Angular mantiene las advertencias anteriores de SCSS en C6/C7. No se arrancó la aplicación ni PostgreSQL, ni se ensayó Certbot/HTTPS público. La CI existente incorpora las comprobaciones ligeras nuevas sin publicar en AWS.

Verificado en la EC2 del usuario el 2026-10-09, antes de activar la prueba HTTP temporal:

- Snapshot `c8d59ee0619fccfe6d0c8083189b6f748a551ecc` transferido por SSH/SCP, hash del archivo verificado antes de extraerlo y manifiesto `RELEASE_COMMIT` comprobado. Código bajo `/opt/exploralab`, propiedad de root y sin escritura de otros usuarios.
- Docker Engine 29.9.0 y Compose 5.6.0 instalados desde el repositorio oficial de Docker. Certbot 5.8.0 instalado mediante snap; no se registró ninguna cuenta ACME ni se solicitó un certificado.
- Configuración nueva creada exclusivamente en la EC2, con contraseña aleatoria y permisos `root:root`/`600`. Validación de configuración y esquema Compose aprobadas sin imprimir secretos.
- Imágenes `exploralab-api:ec2-c8d59ee0619f` y `exploralab-web:ec2-c8d59ee0619f` construidas en el servidor. Se mantienen las advertencias previas de presupuesto SCSS de C6/C7; no impiden el build.
- PostgreSQL nuevo en `exploralab-ec2_production_database`, migraciones desde esquema vacío hasta `20261007_0005 (head)` y API Gunicorn saludables. `/api/v1/health` y `/api/v1/ready` devuelven HTTP 200 dentro del contenedor con la versión esperada. No se copió ni modificó la base local.
- API/PostgreSQL sin puertos publicados, frontend sin arrancar y sin listeners HTTP/HTTPS en el host. El usuario confirmó las reglas 80/443 del Security Group; aún no se validó esa conectividad externa. La inspección puntual mostró unos 14 GB disponibles en el disco y 3 GB de memoria disponibles; no es una prueba de carga ni capacidad concurrente.

Para una publicación **HTTPS** sigue faltando: confirmación del titular para las condiciones de Let's Encrypt, emisión de HTTPS real, exportación y ensayo de renovación, arranque del frontend seguro, validación externa de certificado/rutas/registro/acceso/progreso y dispositivos reales, además de copia externa/restauración/retención. Este camino está aplazado: el usuario autorizó posteriormente [HTTP temporal sin cambiar la configuración segura](prueba-aws-http-temporal.md). Los tres contenedores están saludables, 26 comprobaciones HTTP internas pasaron y ocho lecturas externas desde su computadora aprobaron tras permitir 80 para su IP. SSH abierto a todo Internet, acceso del profesor y pruebas reales del juego/rendimiento siguen pendientes; no se presentó como producción segura ni prueba de capacidad.

Región, costes y duración son decisiones del titular de AWS; no se configuraron presupuestos ni alertas en su cuenta. Revisar también [distribución y soporte](distribucion-soporte.md). No declarar I04/I09 cerrados ni una publicación definitiva antes de esa evidencia. La revisión documental posterior no cambia la versión de aplicación instalada.

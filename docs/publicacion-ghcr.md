# Imágenes Docker en GitHub Container Registry

## Alcance de este paso

GitHub Actions verifica el proyecto automáticamente al subir cambios o abrir un
pull request. La construcción destinada a GHCR y su publicación solo se permiten
en una ejecución manual en `master`. **No crea una EC2, no entra a AWS, no despliega
y no modifica usuarios, progreso o bases de datos reales.** La configuración local
`compose.yml` no cambia; las verificaciones utilizan datos de prueba aislados.

La publicación manual y la instalación HTTP inicial ya se verificaron el 2026-10-11:
ver [estado del instalador EC2](despliegue-ec2-automatico.md). El arranque remoto lo
realizaron los scripts, no este workflow. Para futuras versiones, los commits deben
subirse primero al repositorio aprobado y la publicación debe terminar correctamente.

## Cómo funciona

Se reutiliza `.github/workflows/verify.yml`, sin un segundo flujo de pruebas:

1. Se verifican frontend, PostgreSQL y el ensayo de producción existentes.
2. Solo si los tres trabajos pasan, puede empezar la publicación.
3. Se construyen `backend/Dockerfile.production` y
   `frontend/Dockerfile.production`, ambos con `target: production`.
4. Se publican la API y la web para `linux/amd64`, compatibles con una EC2 x86_64.
5. Cada trabajo muestra la etiqueta de versión y la referencia exacta de su imagen
   en el resumen de GitHub Actions.

La publicación solo se admite mediante `workflow_dispatch` en `master`.
Los push, pull requests y etiquetas Git ejecutan las verificaciones, pero omiten
el trabajo `publish-images`: **subir código no publica imágenes**. Una ejecución
manual en otra rama tampoco publica. La ejecución manual en `master` vuelve a
verificar el código antes de publicar; no reutiliza resultados de una ejecución
anterior. No se usa `pull_request_target` ni se proporcionan credenciales de
publicación a código de un pull request.

El ensayo de producción puede seguir construyendo imágenes locales en el runner
para comprobar la aplicación. Eso no las publica en GHCR ni actualiza un servidor.

Los contextos de construcción son únicamente `backend/` y `frontend/`, no la raíz
del proyecto. Se conservan sus exclusiones de `.env`, cachés y archivos de edición.
La API usa el stage de producción: no incluye pytest ni sus tests. La web usa
Angular compilado y Nginx, no el servidor de desarrollo. Google queda deshabilitado
en esta primera publicación, como en la demostración actual.

## Imágenes y versiones

El nombre se obtiene del repositorio de GitHub en minúsculas. Para el remoto actual:

```text
ghcr.io/rampagewalle2/ml-learning-platform-api:sha-COMMIT_COMPLETO
ghcr.io/rampagewalle2/ml-learning-platform-web:sha-COMMIT_COMPLETO
```

`COMMIT_COMPLETO` es el hash completo que aparece en el resumen de la ejecución.
No se crea ni se consume una etiqueta `latest`.

Una etiqueta basada en el commit identifica el código, pero **no hace inmutable
la imagen**: repetir la construcción podría incorporar una nueva imagen base.
Para utilizar exactamente lo que se publicó, copiar las referencias con digest:

```text
ghcr.io/rampagewalle2/ml-learning-platform-api@sha256:DIGEST_API
ghcr.io/rampagewalle2/ml-learning-platform-web@sha256:DIGEST_WEB
```

Las dos referencias deben proceder de la misma ejecución exitosa. Si solo se
publicó una imagen, el workflow falló o fue cancelado, esa pareja no está lista
para desplegar. Conservar también el commit y los archivos Compose de esa versión.

La caché de construcción es independiente para API y web. Las acciones utilizadas
están fijadas a commits concretos; actualizar esas referencias de forma revisada.

## Activarlo en GitHub

1. Subir el commit al repositorio correcto, después de aprobar el destino del push.
2. Abrir **Actions** y buscar **Verify release and publish GHCR images (no deployment)**.
3. El push ejecutará solo las verificaciones. Comprobar que los tres trabajos
   pasan y que `publish-images` aparece omitido (`skipped`).
4. Cuando se quiera publicar esa versión, usar **Run workflow** y seleccionar
   `master`. El archivo con `workflow_dispatch` debe estar subido a la rama
   predeterminada para que aparezca ese botón.
5. Esperar a que pasen nuevamente las verificaciones y los dos trabajos de publicación.
6. Revisar las imágenes en **Packages** y sus referencias exactas en los resúmenes.

Esta ejecución manual publica imágenes, no despliega la aplicación. Un nuevo push
a la misma rama puede cancelar la ejecución en curso por la política de concurrencia;
evitar subir cambios mientras se publica y no usar una pareja incompleta de imágenes.

La publicación usa el `GITHUB_TOKEN` temporal de esa ejecución, con
`contents: read` y `packages: write` únicamente en el trabajo de publicación. No
hay que crear un token personal ni añadir claves AWS para este paso. Las políticas
de la cuenta u organización deben permitir Actions y la publicación de paquetes.
La primera ejecución real confirmó esos permisos para este repositorio; un archivo
YAML correcto por sí solo no los demuestra ni garantiza que futuras políticas no cambien.

GHCR documenta visibilidad privada inicial por defecto. El workflow no cambia la
visibilidad de paquetes existentes ni los convierte en públicos. Las dos imágenes
utilizadas el 2026-10-11 permitieron lectura anónima desde EC2, sin cambiar permisos
desde las herramientas. Revisar la visibilidad en Packages antes de compartir nuevas versiones.

Según la [documentación de facturación de GitHub](https://docs.github.com/en/billing/concepts/product-billing/github-packages),
el almacenamiento y transferencia de imágenes en Container Registry son
actualmente gratuitos. Los minutos, cachés y otros consumos de GitHub Actions
siguen sujetos al plan y presupuesto de la cuenta. No se afirma que todo el
proceso o AWS sean gratuitos.

## Consumir las imágenes sin recompilar

`compose.ghcr.yml` es un complemento, no un Compose independiente:

- Reemplaza las imágenes de API, web y migraciones.
- Elimina las secciones `build` de esos tres servicios.
- Usa la misma imagen de API para el servidor y las migraciones.
- Mantiene PostgreSQL, su volumen, los puertos, los límites, las cookies y los
  healthchecks del Compose seleccionado.
- Requiere referencias explícitas para ambas imágenes; no tiene un fallback local.

Requiere Docker Compose 2.24.4 o posterior. **Debe ser el último archivo** después
de `compose.production.yml` y de cualquier override de prueba HTTP. Nunca mezclarlo
con `compose.yml`, el entorno de desarrollo.

Los ejemplos siguientes explican cómo consumir las imágenes en una EC2 Ubuntu
preparada; no son un registro de comandos ejecutados. El instalador HTTP verificado
está documentado por separado y HTTPS sigue pendiente. No sustituyen la
[preparación del servidor](despliegue-aws-prueba.md). Usar Bash, no PowerShell;
sustituir todos los marcadores antes de ejecutarlos.

### Acceso a imágenes privadas

El token temporal del workflow no es una credencial permanente de la EC2. Para
descargar paquetes privados, preparar un acceso de lectura autorizado. GHCR admite
un token personal clásico con `read:packages`; usar una caducidad corta y una cuenta
que tenga acceso a esos paquetes. No añadir permisos de escritura para descargarlos.
No pegar el token en Git, el chat, un archivo Compose o un comando del historial.

El login interactivo puede hacerse así, introduciendo el token solo cuando Docker
lo solicite:

```bash
docker login ghcr.io --username RampageWallE2
```

Docker conserva esa autenticación en la configuración del usuario que realizó el
login; mantenerla privada. Usar el mismo usuario para descargar las imágenes, o
configurar el almacén de credenciales correspondiente. Al terminar la prueba,
revocar el token y cerrar el login.

### Preparar una versión HTTPS

Configurar `APP_VERSION` en el archivo privado `.env.ec2` para identificar el
commit elegido, por ejemplo `ec2-` seguido de su hash. Conservar el resto de ajustes
privados y el nombre de proyecto `exploralab-ec2`; no reemplazar la contraseña de
una base ya inicializada.

```bash
cd /opt/exploralab
export GHCR_API_IMAGE='ghcr.io/rampagewalle2/ml-learning-platform-api@sha256:DIGEST_API'
export GHCR_WEB_IMAGE='ghcr.io/rampagewalle2/ml-learning-platform-web@sha256:DIGEST_WEB'

ghcr_compose=(docker compose --env-file /opt/exploralab/.env.ec2 \
  -p exploralab-ec2 -f compose.production.yml -f compose.ghcr.yml)

"${ghcr_compose[@]}" config --quiet
"${ghcr_compose[@]}" --profile tools pull backend frontend migrate
```

Estos comandos validan la configuración y descargan imágenes: **no arrancan la web
ni ejecutan migraciones**. No imprimir `config` resuelto porque contiene secretos.
Las variables de imagen son referencias públicas, no contraseñas; no añadirlas al
archivo privado validado por `ec2_preflight.py`, que conserva sus claves exactas.

### Si se aprueba de nuevo la prueba HTTP temporal

Mantener el override HTTP explícito y poner GHCR al final:

```bash
export HTTP_TEST_ORIGIN='http://IP_PUBLICA_REAL'
ghcr_compose=(docker compose --env-file /opt/exploralab/.env.ec2 \
  -p exploralab-ec2 -f compose.production.yml \
  -f compose.ec2-http-test.yml -f compose.ghcr.yml)

"${ghcr_compose[@]}" config --quiet
"${ghcr_compose[@]}" --profile tools pull backend frontend migrate
```

Esta modalidad conserva las restricciones de la [prueba HTTP temporal](prueba-aws-http-temporal.md)
y no se activa automáticamente por usar GHCR. No usar datos personales reales.

## Lo que falta para desplegar

Ya hay un [instalador para una EC2 Ubuntu nueva](despliegue-ec2-automatico.md):
`infra/deploy-ec2.ps1` transfiere archivos versionados y `infra/ec2_bootstrap.py`
instala Docker, genera configuración privada y arranca la demostración HTTP desde GHCR.
La primera publicación manual y el arranque en EC2 se completaron el 2026-10-11;
las referencias y límites verificados constan en esa guía. Sigue pendiente un
procedimiento de actualización para bases existentes.

La siguiente tarea será un script remoto de actualización que descargue una pareja
verificada, compruebe una copia de seguridad, aplique las migraciones aprobadas y
arranque los servicios con comprobaciones de salud. La instalación desde cero de
Docker, configuración privada, permisos y EC2 es otra pieza separada.

No borrar volúmenes al actualizar. Volver a una imagen anterior **no revierte una
migración de base de datos**; no automatizar un downgrade ni restaurar datos sin
aprobar y comprobar el procedimiento. Las imágenes y sus cachés tampoco son una
copia de la base de datos.

## Comprobaciones locales acotadas

Estas pruebas solo resuelven plantillas públicas con referencias ficticias. No
requieren el daemon de Docker, no se conectan a GHCR y no crean cuentas o datos:

```text
python -B -m unittest discover -s infra/tests -p test_ghcr_config.py -v
python -B -m unittest discover -s infra/tests -p test_ec2_http_test_config.py -v
python -B -m unittest discover -s infra/tests -p test_ghcr_workflow.py -v
```

La última prueba comprueba estáticamente los eventos admitidos, la condición de
publicación manual en `master` y sus dependencias. No ejecuta GitHub Actions ni
sustituye la validación de sintaxis del workflow.

La [primera ejecución manual verificada](https://github.com/RampageWallE2/ml-learning-platform/actions/runs/38179107346)
publicó API y web correctamente. No probar futuras publicaciones usando credenciales
reales desde scripts improvisados en la computadora local.

Referencias: [publicación de imágenes con Actions](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images),
[autenticación y permisos de GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry),
[combinación y eliminación de campos de Compose](https://docs.docker.com/reference/compose-file/merge/).

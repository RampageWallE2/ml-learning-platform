# Instalar la demostración en una EC2 nueva

Este procedimiento automatiza la instalación **dentro de una EC2 ya creada**.
No crea recursos AWS, no cambia Security Groups, no acepta condiciones de certificados
y no instala una variante distinta del juego. Es una primera instalación HTTP temporal,
no un despliegue HTTPS definitivo ni un actualizador de bases existentes.

## Preparar una vez por versión

1. Subir la versión aprobada del proyecto a GitHub.
2. En Actions, ejecutar manualmente **Verify release and publish GHCR images (no deployment)** en `master`.
3. Esperar que termine correctamente, incluidos los dos trabajos de publicación.
4. Copiar el commit completo y las referencias `@sha256:...` de API y web del **mismo run exitoso**.
   No copiar `latest` ni sustituir digests por etiquetas.

El push sigue verificando sin publicar ni desplegar. No hay que repetir compilaciones
en cada EC2: se reutiliza la pareja de imágenes. Ver [publicación en GHCR](publicacion-ghcr.md).

## Preparar cada EC2

- Ubuntu LTS 22.04, 24.04 o 26.04 **x86_64**, IPv4 pública y llave SSH.
  Python 3 debe estar disponible, como en la imagen oficial Ubuntu utilizada.
- Se utiliza `ubuntu` con sudo sin contraseña. No funciona con Amazon Linux o ARM.
- Mantener IMDSv2 habilitado: el instalador comprueba que está realmente en EC2
  y que el origen indicado corresponde a su IP pública, sin necesitar claves AWS.
- Puerto TCP 22 solo desde tu IP administrativa; TCP 80 desde las IP de la demostración.
  No abrir 4200, 5000, 5432, 2375 ni 2376. El script **no** configura estas reglas.
- Necesita salida a repositorios Ubuntu/Docker y GHCR, y al menos 5 GiB libres antes de instalar.
- La instancia de aproximadamente 1 GB no compila nada y utiliza un worker Gunicorn.
  Esa configuración es conservadora; no garantiza capacidad concurrente ni sustituye medir memoria.
  No se añade swap ni se cambia el tamaño/coste de EC2 automáticamente.

Docker se instala desde su [repositorio oficial](https://docs.docker.com/engine/install/ubuntu/),
no mediante un `curl | sh`. Una instalación Docker existente no se actualiza automáticamente;
debe tener Engine operativo y Compose >= 2.24.4. Si hay paquetes de contenedores incompatibles,
se detiene sin desinstalarlos. La identificación del host utiliza
[IMDSv2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html).

## Un comando desde Windows

En PowerShell, desde la raíz del proyecto, sustituir **todos** los marcadores por lo que
muestra Actions. La IP siguiente corresponde a la instancia proporcionada el 2026-10-11,
no está fijada en el programa.

```powershell
.\infra\deploy-ec2.ps1 `
  -InstanceIp '54.145.32.66' `
  -KeyPath 'C:\Users\Chahuayo\Downloads\ExploraLab.pem' `
  -ReleaseCommit 'COMMIT_COMPLETO_DE_40_CARACTERES' `
  -ApiImage 'ghcr.io/rampagewalle2/ml-learning-platform-api@sha256:DIGEST_API' `
  -WebImage 'ghcr.io/rampagewalle2/ml-learning-platform-web@sha256:DIGEST_WEB' `
  -GhcrUsername 'RampageWallE2' `
  -HttpDemo
```

Puedes añadir `-WhatIf` para comprobar parámetros/destino sin subir archivos ni instalar.
El script necesita Git, OpenSSH (`ssh`/`scp`) y un checkout que contenga el commit elegido.
No modifica la política de ejecución de PowerShell: si tu equipo bloquea scripts, revisar
su política antes de ejecutarlo; no se añade un bypass general.

Para imágenes privadas, aparecerá un campo oculto en la terminal remota para introducir
un token clásico GitHub con **solo `read:packages`**, acceso a esos paquetes y vencimiento corto.
No escribirlo en el comando, historial, Compose ni chat. La autenticación se conserva solo
durante la ejecución en un directorio privado temporal y se elimina al salir.
Revoca el token al terminar la demostración. Si las imágenes son públicas, omitir `-GhcrUsername`;
no se cambia su visibilidad automáticamente. [Acceso a GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

## Qué hace automáticamente

1. Prepara un archivo pequeño con **cinco archivos de despliegue del commit elegido**;
   envía también el controlador local. No sube `.env`, mapas sin commit, cuentas ni bases locales.
2. Conecta por SSH y comprueba el SHA-256 de ambos archivos antes de ejecutar el controlador con sudo.
   Recuerda claves SSH nuevas y rechaza cambios de clave conocidos; no deshabilita la validación.
3. Comprueba Ubuntu, arquitectura, identidad/IP de EC2 y espacio; instala Docker y Compose si faltan.
4. Crea `/opt/exploralab` bajo control de root y una `.env.ec2` privada, modo 600,
   con contraseña nueva aleatoria de PostgreSQL. No muestra ni transmite esa contraseña al cliente.
5. Descarga imágenes por digest y comprueba que ambas etiquetas OCI declaran el commit elegido.
   Esto verifica su revisión, no demuestra por sí solo que procedan del mismo run: elegir la pareja del resumen.
6. Arranca PostgreSQL privado, aplica migraciones y espera la API saludable.
7. Valida Nginx antes de publicar la web; arranca el frontend y comprueba salud/versión internas.
8. Comprueba readiness/versión desde tu computadora. Si solo falla este último paso,
   puede estar bloqueado el puerto 80; no abre reglas AWS automáticamente.

API y PostgreSQL nunca publican puertos: únicamente Nginx publica el 80.
Se combinan producción + override HTTP explícito + GHCR, nunca el Compose de desarrollo.
La configuración HTTPS original no se debilita. Los contenedores tienen reinicio
`unless-stopped`, volumen persistente y logs con rotación del Compose existente.
El directorio local `infra/.local/ec2-*` y el upload remoto temporal contienen únicamente
artefactos de despliegue, no tokens ni la configuración privada; pueden conservarse para diagnóstico.

## Repetir, fallos y datos

- Repetir exactamente el mismo comando conserva contraseña, volumen y progreso.
  Una instalación ya completada no repite migraciones. Si estaba incompleta, puede reintentar
  los pasos con los mismos parámetros; no promete reparar una migración fallida.
- Si detecta otra versión, origen, pareja de imágenes, instalación ajena o un volumen previo sin
  configuración reconocida, se detiene. **No adopta, resetea ni sobrescribe datos existentes.**
- Si falla una etapa, devuelve error sin continuar con la publicación. No elimina contenedores,
  archivos privados, volúmenes ni ejecuta `prune`. Tras arrancar servicios, un fallo posterior
  no significa que todo haya quedado apagado: revisar la última etapa y `docker compose ps`.
- No automatiza actualizaciones con datos, rollbacks ni backups. Antes de una versión distinta,
  definir copia externa verificada y procedimiento de actualización por separado.
- Terminar EC2 puede destruir su disco/base. El volumen no es un backup. Parar contenedores
  no detiene los cobros; revisar recursos de AWS al terminar la prueba.

**HTTP no cifra contraseñas/sesiones. Usar solo cuentas ficticias y contraseñas no reutilizadas.**
No es la modalidad adecuada para cuentas reales de tu profesor. Ver [límites de la prueba HTTP](prueba-aws-http-temporal.md).

## Comprobación de los scripts

Pruebas unitarias aisladas en `infra/tests/test_ec2_bootstrap.py`: validación de opciones,
archivo seguro, contraseñas persistentes, rechazo de cambios, orden de arranque,
fallo de migración, ausencia de compilación y token temporal. No instalan Docker ni tocan AWS.
La CI existente las descubre automáticamente. Estas pruebas y el parser PowerShell
no sustituyen una primera instalación real completa, el recorrido del juego o la prueba en móviles.

Las pruebas simuladas por sí solas no validan una instalación en AWS; la primera ejecución real se documenta abajo.

Verificación del 2026-10-11: 16 pruebas nuevas aprobadas en Linux (directorio temporal,
comandos Docker/AWS simulados), 7 comprobaciones existentes del Compose GHCR y 3 de su
política de publicación; parser PowerShell y `-WhatIf` aprobados. También se validó un
bundle real producido por `git archive`. No se instaló Docker ni se desplegó la aplicación
durante estas pruebas.

## Primera ejecución real completada — 2026-10-11

La ejecución manual [38179107346](https://github.com/RampageWallE2/ml-learning-platform/actions/runs/38179107346)
terminó correctamente y publicó ambas imágenes del commit `a93765b59d1d551f15cc13648f90c18f540a045a`:

```text
API: ghcr.io/rampagewalle2/ml-learning-platform-api@sha256:16920a85d49392da0a39daaf7bcd8ec44c197d3f3efc0379be3e9ea75e5d0149
WEB: ghcr.io/rampagewalle2/ml-learning-platform-web@sha256:176ffefe6f234fe52736646f46ffd9a592cdd059374beed30caf25ca73998bc9
```

Ambas referencias permitieron lectura anónima desde EC2. No se usó un token personal
ni se cambiaron permisos/visibilidad; comprobar de nuevo si se utilizan otros paquetes.

En la EC2 `54.145.32.66` se instalaron Docker Engine 29.9.0 y Compose 5.6.0 mediante
la función del instalador, y luego se ejecutó `infra/deploy-ec2.ps1` completo, sin
`-GhcrUsername`. Terminó con código 0: transferencia verificada, configuración privada
nueva, descarga por digest, base PostgreSQL nueva, migraciones y servicios saludables.
El proyecto Docker es `exploralab-ec2`; no se subieron cuentas ni bases de desarrollo.

Comprobaciones acotadas:

- Siete lecturas externas desde la computadora del titular devolvieron HTTP 200:
  landing, login, registro, world, progreso por zona, mapa JSON de Open Pit y readiness
  con la versión exacta. Las rutas Angular y el JSON también tenían el contenido esperado.
- Nueve peticiones de autenticación a través de Nginx en loopback de EC2 comprobaron
  registro, sesión, lectura de progreso vacío, logout, rechazo sin sesión y nuevo login/logout.
  Se dejó **una cuenta ficticia** `example.invalid`, con sesiones revocadas y sin completar
  intro ni lecciones. No se mostraron correo, contraseña ni cookies.
- Los tres contenedores están saludables. Solo Nginx publica `0.0.0.0:80`; los puertos
  EXPOSE de API/PostgreSQL/443 no equivalen a bindings públicos.
- La inspección puntual mostró aproximadamente 394 MiB de RAM disponibles y 15 GiB
  libres de disco. No es una prueba de carga, concurrencia, FPS o capacidad garantizada.

Hay un atajo **local e ignorado por Git** en `infra/.local/deploy-demo.ps1`, que fija
esta pareja de imágenes. Desde la raíz:

```powershell
.\infra\.local\deploy-demo.ps1
# Para otra EC2 vacía, conservando esta misma versión:
.\infra\.local\deploy-demo.ps1 -InstanceIp 'IP_DE_LA_NUEVA_EC2'
```

Sustituir el marcador por una IPv4 real. Este atajo no se distribuye en un clon nuevo;
el comando completo reproducible sigue siendo el de la sección anterior. Para cambiar
el juego, publicar una nueva versión y elegir sus digests: el atajo no consume `latest`.
No usarlo para actualizar otra versión con una base existente.

Pendiente de validación humana: recorrer el juego y probar celulares reales; comprobar
que el Security Group permita al profesor desde su red. HTTPS, backups externos y
actualizaciones con datos siguen fuera de esta demostración. HTTP continúa limitado
a cuentas ficticias y contraseñas no reutilizadas.

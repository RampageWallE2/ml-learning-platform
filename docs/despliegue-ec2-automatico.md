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

No declarar la automatización validada en AWS antes de completar esa ejecución con una pareja real de GHCR.

Verificación del 2026-10-11: 16 pruebas nuevas aprobadas en Linux (directorio temporal,
comandos Docker/AWS simulados), 7 comprobaciones existentes del Compose GHCR y 3 de su
política de publicación; parser PowerShell y `-WhatIf` aprobados. También se validó un
bundle real producido por `git archive`. No se instaló Docker ni se desplegó la aplicación
durante estas pruebas. Falta publicar las imágenes y ejecutar el instalador completo.

# Distribución, datos y soporte: control previo a publicación

Fecha: 2026-10-07. Este documento es un inventario técnico y una propuesta pendiente de aprobación, no un aviso legal publicado ni una certificación de licencias.

## Recursos y derechos

| Grupo | Situación | Acción necesaria |
| --- | --- | --- |
| Mapas propios y configuraciones Tiled | Fuentes conservadas; el juego usa JSON | Confirmar autoría y permisos de los recursos incorporados al mapa. |
| Tilesets y sprites/personaje | Inventariados por ruta, tamaño y hash | Adjuntar origen, licencia y requisitos de atribución de cada pack. No basta encontrarlo gratis. |
| Sonidos ambientales | Inventariados; opcionales para jugar | Comprobar autor/fuente/licencia y autorización de distribución. |
| Logotipo e imágenes de marca | Inventariados | Confirmar procedencia y derechos de uso; no deducirlos del archivo. |
| Fuentes Inter/Press Start 2P declaradas | Nombres en tokens no prueban procedencia ni distribución | Verificar archivos/importaciones reales y conservar licencia/atribución correspondiente. |
| Angular, Phaser y demás bibliotecas | Versiones en manifests/locks; Angular genera avisos de terceros | Conservar `3rdpartylicenses.txt`, revisar licencias de dependencias y no borrar sus avisos de la distribución. |

Ejecutar `python infra/checks/assets_inventory.py` para obtener el detalle completo en `infra/.local/assets-inventory.csv`. Cada recurso sin evidencia permanece pendiente; no se le asignó una licencia inventada. No se establece una licencia general al código sin decisión de su titular.

## Datos que ya utiliza la aplicación

- Cuenta: identificador, correo, nombre y, en Google, identidad/avatar proporcionados por ese método.
- Contraseñas locales: hash, no contraseña en claro. Sesiones: hash de token, vencimiento y revocación.
- Progreso: perfil, clase, estado, paso y fechas. Completar no equivale a dominio ni certificación laboral.
- Protección de acceso: digest del correo, contador y vencimiento. Un digest no garantiza anonimato.
- Navegador: finalizaciones pendientes y borradores separados por cuenta; preferencias, intro y recuperación de posición. Borrar datos del navegador puede perder trabajo no confirmado; no ofrecerlo como primer paso de soporte.
- Nginx: claves de IP transitorias para limitar autenticación, no una nueva tabla persistente de IP. La infraestructura/proveedor futuro puede registrar otros datos: comprobarlo antes del aviso final.
- Copias: contienen datos personales y hashes; proteger también las copias, no solo la base activa.

No se añadió analítica de aprendizaje ni envío externo de errores. No se activó Google en el ensayo local; su uso real requiere revisar información al usuario y configuración aprobadas.

## Decisiones que no debe tomar la IA por su cuenta

- Titular/responsable del proyecto y contacto real de soporte/privacidad.
- Si la entrega es demostración con datos ficticios, piloto cerrado o publicación pública.
- Finalidad de las cuentas, personas autorizadas a acceder y condiciones del uso educativo/laboral.
- Retención de cuentas, progreso, logs y backups; ubicación y acceso de las copias.
- Aviso de privacidad y condiciones adecuadas al público adulto confirmado, revisados por el responsable.
- Licencias y derechos de los recursos; no publicar si faltan permisos necesarios.

Hasta aprobar esto, usar cuentas ficticias para la demostración técnica, no presentar como lanzamiento público listo.

## Procedimiento de soporte y datos

1. Recibir la solicitud por un canal aprobado; verificar identidad sin pedir contraseña, tokens o cookies.
2. Identificar versión, fecha, dispositivo y, para errores de servidor, `X-Request-ID`. No recoger capturas con datos de terceros sin necesidad.
3. Ante fallo de guardado, conservar la finalización/borrador local, comprobar sesión y `/ready`, y reintentar. No dar por completada una clase sin confirmación.
4. Para acceso/exportación/eliminación de datos: obtener autorización del responsable, identificar la cuenta y relaciones, preparar copia segura y comprobar el alcance antes de ejecutar. No borrar cuentas por nombre parecido o mediante limpiezas generales.
5. Una eliminación debe contemplar sesiones/identidades/perfil/progreso y la política de backups. Restaurar una copia antigua podría reintroducir datos eliminados; mantener un registro operativo restringido de esas solicitudes según la política aprobada.
6. Confirmar resultado y plazos al solicitante. No activar eliminación automática, prometer un plazo legal o improvisar recuperación de contraseña: I06 quedó expresamente fuera de esta tarea.

## Notas de versión técnica

Esta preparación refuerza el servidor de progreso, verifica PostgreSQL aislado y migraciones, añade ensayo local de producción/HTTPS, copias y restauración separada, disponibilidad y logs seguros. Mejora la cola/caché de recursos y excluye archivos de edición sin borrarlos. Conserva escenarios, datos matemáticos y flujo educativo.

Para entregar una versión exacta: revisar cambios propios/anteriores, aprobar el conjunto, registrar commit/tag e imágenes usadas y adjuntar evidencia de pruebas. No se creó un commit o tag automáticamente sobre los cambios del usuario.

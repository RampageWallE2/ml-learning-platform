# ExploraLab

Videojuego educativo para aprender las bases matemáticas del **machine learning
(aprendizaje automático)** mediante situaciones del mundo minero.

Recorre una mina, conversa con sus encargados y resuelve actividades con gráficos,
opciones y pequeños retos. El propósito es entender los datos, no memorizar fórmulas.

## ¿Para quién es?

Para personas que trabajan en minería o en áreas relacionadas y quieren retomar
las matemáticas. Las lecciones usan lenguaje sencillo, ejemplos visuales y ayudas;
no requieren conocimientos previos de programación ni de machine learning.

## ¿Qué tiene que ver con machine learning?

El aprendizaje automático busca patrones en los datos. Antes de estudiar sus
modelos, necesitamos entender qué muestran los registros y cómo compararlos.

ExploraLab empieza por esas bases: promedio, dispersión, rango, varianza y
desviación estándar. Actualmente no incluye entrenamiento de modelos de machine
learning; esos contenidos forman parte de la ampliación prevista del proyecto.

## ¿Qué puedes jugar hoy?

**Open Pit (tajo abierto)** es el primer escenario disponible y tiene nueve lecciones.
Durante el relevo de turno, investigas registros de distintas áreas para preparar
un informe. Cada parada aporta una idea a esa investigación.

- Compara cargas y descubre por qué el promedio no cuenta toda la historia.
- Explora el rango, la varianza y la desviación estándar con gráficos y retos guiados.
- Usa lo aprendido para comparar registros con una meta y explicar tus conclusiones.
- Consulta el mapa y tus objetivos; guarda tu avance con una cuenta personal.

Open Pit no es el límite de la plataforma: se prevén más escenarios y temas.
Los datos son ejemplos educativos, no instrucciones para operar equipos mineros.
El proyecto sigue en desarrollo.

## Ejecutar en tu computadora

Necesitas Git y Docker con Compose. En Windows, enciende Docker Desktop primero.

```bash
git clone https://github.com/RampageWallE2/ml-learning-platform.git
cd ml-learning-platform
docker compose up --build
```

Espera a que termine la compilación, abre <http://localhost:4200> y registra una
cuenta. La primera ejecución puede tardar mientras se descargan las dependencias.

No necesitas instalar Node o Python, crear la base de datos ni copiar un `.env`.
Docker prepara los servicios y aplica las migraciones automáticamente. El acceso
con Google es opcional y está desactivado si no se configura.

Para detener el entorno desde otra terminal, en la raíz del proyecto:

```bash
docker compose down
```

Tus cuentas y progresos se conservan en un volumen de Docker. No añadas `-v` si
quieres mantenerlos. Esta configuración es solo para desarrollo local, no para
publicar la aplicación en Internet ni manejar datos reales.

¿Quieres probar desde el celular o cambiar un puerto? Consulta la
[guía de desarrollo local](docs/desarrollo-local.md).

## Tecnologías

| Herramienta | Qué hace en el proyecto |
|---|---|
| Angular, TypeScript y SCSS | Pantallas, lecciones, gráficos y estilos. |
| Phaser | Mundo del juego, movimiento e interacciones. |
| Python y Flask | Acceso a las cuentas y guardado del progreso. |
| PostgreSQL | Almacenamiento de cuentas, sesiones y avance. |
| Docker | Arranque de los servicios y preparación del despliegue. |

## Organización y guías

- `frontend/`: aplicación web, juego y archivos de Tiled.
- `backend/`: API, base de datos, migraciones y pruebas.
- `docs/`: documentación educativa y técnica.
- `infra/`: herramientas de pruebas y despliegue.

Para profundizar, elige la guía que necesitas:

- [Público y alcance educativo](docs/alcance-educativo-open-pit.md).
- [Objetivos de las nueve lecciones de Open Pit](docs/objetivos-lecciones-open-pit.md).
- [Pruebas y preparación para producción](docs/preparacion-produccion.md).
- [Publicación de imágenes con GitHub Actions y GHCR](docs/publicacion-ghcr.md).
- [Despliegue de demostración en AWS EC2](docs/despliegue-ec2-automatico.md).
- [Preparación del despliegue con HTTPS](docs/despliegue-aws-prueba.md).

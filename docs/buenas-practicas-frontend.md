# Comprobaciones de código del frontend

Ejecutar desde `frontend`, con Node 24 y las dependencias de `npm ci`.

## Comandos

- `npm run lint`: analizar TypeScript y plantillas Angular de `src`. Las reglas recomendadas detectan código no utilizado, errores comunes y usos de `any` en código de aplicación. No escribe archivos. Los mocks de pruebas permiten `any` y declaraciones no utilizadas para representar datos inválidos y APIs externas incompletas; conservan las demás reglas.
- `npm run format:check`: comprobar el formato del ámbito inicial, sin modificar archivos: configuración de ESLint, `package.json`, eventos del juego y función del panel de objetivos con sus pruebas. No afirma que todos los archivos antiguos estén formateados. Ampliar este ámbito por bloques aprobados, sin aplicar un reformateo masivo.
- `npm run test:ci -- --include 'src/app/ruta/archivo.spec.ts'`: ejecutar las pruebas de un cambio acotado. Repetir `--include` para más archivos relacionados.
- `npm run build -- --configuration production`: compilar la aplicación y sus plantillas para producción, sin desplegarla.
- `npm run check`: ejecutar lint, comprobación de formato, todas las pruebas y build. Reservar esta comprobación completa para revisiones generales o preparación de una entrega; no repetirla por cada corrección pequeña.

El job del frontend en `.github/workflows/verify.yml` ejecuta lint y formato antes de las pruebas y el build existentes. No se añadieron despliegues ni hooks locales que modifiquen archivos automáticamente.

## Criterios que debemos conservar

- Guardar los estados de C1–C9 mediante `saveExerciseState`, conservando su validación por clase, etapa, propietario y sesión. No cambiar claves o versiones de borradores por una limpieza de código.
- Enviar y escuchar los eventos mediante `gameEvents` y `GameEvents`: cada evento tiene argumentos tipados. Es el mismo emisor de Phaser; el tipado no valida mensajes externos en tiempo de ejecución.
- Leer las propiedades de texto/número de Tiled mediante sus funciones específicas. Una propiedad opcional ausente puede usar su valor por defecto; una propiedad presente con tipo incorrecto se rechaza, sin coerción ni sustitución silenciosa. Las comprobaciones de dominio, como límites de volumen, siguen en sus consumidores. El tipo correcto no demuestra que un identificador o destino exista.
- Mantener el cálculo del panel de objetivos independiente de servicios, almacenamiento y efectos del juego.
- Reutilizar `lesson-statistics.ts` para promedio, rango y estadísticas de los conjuntos finitos y no vacíos de las clases. Conservar los resultados sin redondear y la varianza poblacional (divisor n). No sustituir automáticamente operaciones didácticas distintas, como el centro entre extremos de C4 o la suma de cuadrados de la copia ampliada de C6.
- Exponer las señales de estado de los servicios mediante `asReadonly()` y mantener privadas sus señales escribibles. Los componentes consultan `pendingStorageAvailable` y `syncingPending`; solo `ProgressService` cambia esos valores.
- Mantener el límite compartido de espera de autenticación y progreso en `core/http/request-timeout.ts`: 20 segundos por respuesta HTTP, no por toda la reconciliación. Un timeout no equivale a un 401 ni confirma que el servidor haya rechazado un guardado. Conservar los pendientes y la consulta previa del reintento del HUD; no añadir reenvíos automáticos de escrituras.
- No debilitar reglas para ocultar un defecto de aplicación, convertir datos incorrectos con `as`, ni cambiar comportamiento o diseño para hacer pasar una comprobación de estilo.

Herramientas de desarrollo fijadas en el lockfile, sin actualizar Angular o Phaser: [angular-eslint](https://github.com/angular-eslint/angular-eslint), [typescript-eslint](https://typescript-eslint.io/getting-started/) y [Prettier](https://prettier.io/docs/cli).

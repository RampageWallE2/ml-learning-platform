# Pendientes para la entrega oficial de ExploraLab

Fecha de referencia: 2026-10-05.

Esta es la lista de trabajo acordada a partir del diagnóstico del proyecto. No autoriza implementar todos los pendientes a la vez ni decide una arquitectura nueva.

## Alcance de la primera entrega

- ExploraLab con Open Pit como primer escenario educativo disponible.
- Conservar la secuencia C1–C9. Otros escenarios siguen siendo una expansión futura, no un requisito para entregar esta versión.
- Mantener lenguaje cotidiano, explicaciones visuales y respuestas por opciones. No añadir escritura obligatoria.
- Mantener la identidad retro educativa y mejorar comprensión antes que decoración.
- Distinguir completar una actividad de demostrar aprendizaje. No presentar el progreso como una certificación de dominio.
- Antes de publicar, el usuario confirma público objetivo, dispositivos admitidos y si la entrega será un piloto cerrado o un lanzamiento público.

## Cómo trabajaremos esta lista

1. Elegir un pendiente por su identificador.
2. Revisar el funcionamiento actual y cualquier solución que ya exista fuera del repositorio.
3. Explicar archivos afectados, comportamiento propuesto y comprobaciones.
4. Esperar aprobación antes de cambios importantes.
5. Implementar solo el alcance aprobado; dividir los pendientes grandes en subtareas.
6. Verificar y dejar evidencia del resultado.
7. Marcarlo terminado solo cuando se cumpla su criterio de cierre y el usuario lo valide.

No introducir refactorizaciones generales ni añadir nuevas funcionalidades fuera de esta lista sin revisarlas con el usuario.

## Punto de partida comprobado

- 529 pruebas del frontend aprobadas con el comando normal de pruebas sin modo watch.
- Compilación de producción aprobada; advertencia de presupuesto SCSS en C6, no error.
- Pruebas del backend no ejecutadas en el diagnóstico: dependencias de pruebas no disponibles y Docker no accesible.
- El recorrido completo con backend, PostgreSQL y dispositivos reales sigue pendiente de validación.
- Todos los pendientes siguientes comienzan sin marcar. La existencia de una funcionalidad parcial no equivale a cumplir su criterio de cierre.

## A. Infraestructura y fiabilidad técnica

### Prioridad 1 — Protección del avance del estudiante

- [ ] **I01 — Conservar y recuperar una finalización pendiente de guardar.**
  - Revisar el descarte del intento al cerrar una lección tras un error. Mostrar qué está guardado y qué está pendiente. Diseñar la recuperación sin mezclar cuentas.
  - **Cierre:** si el servidor no recibe la finalización por un corte de conexión, cerrar o recargar no obliga a repetir la actividad; al recuperar la conexión se puede reintentar sin duplicar registros. Probar también cambio de usuario y respuesta perdida después de un guardado exitoso.

- [ ] **I02 — Hacer accesible el reintento de guardado.**
  - Coordinar el aviso con el panel modal y su gestión del foco, sin reactivar accidentalmente el movimiento del personaje.
  - **Cierre:** el estudiante puede leer el error y reintentar con teclado y con pantalla táctil mientras la lección está abierta; el foco permanece visible y coherente.

- [ ] **I03 — Retomar una actividad interrumpida.**
  - Proponer puntos de recuperación, empezando por las lecciones largas. Definir qué estado hace falta conservar; guardar solo un número de paso podría no reconstruir el ejercicio.
  - **Cierre:** salir o recargar permite volver a un punto coherente de la actividad, sin marcarla completada ni conservar respuestas de otra cuenta. La estrategia de almacenamiento y versión requiere aprobación previa.

### Prioridad 2 — Entorno seguro y verificable

- [ ] **I04 — Preparar y documentar el despliegue de producción.**
  - Confirmar primero alojamiento y configuración externa existente. Separar desarrollo y producción: frontend compilado, servidor Flask adecuado para producción, HTTPS, configuración sensible y base de datos no expuesta públicamente.
  - **Cierre:** una versión identificada se puede desplegar siguiendo instrucciones reproducibles, sin debug ni servidores de desarrollo; funcionan API, cookies y enlaces directos a rutas de Angular.

- [ ] **I05 — Revisar y reforzar la seguridad de autenticación.**
  - Comprobar cookies seguras, límites de intentos, protección de solicitudes autenticadas con cookies, límites de entrada y dependencias. Verificar controles externos antes de duplicarlos en la aplicación.
  - **Cierre:** pruebas documentadas de intentos excesivos, sesión vencida y revocada, configuración HTTPS y protección de solicitudes de escritura. No registrar contraseñas, tokens ni secretos.

- [ ] **I06 — Recuperar el acceso a una cuenta.**
  - Diseñar recuperación de contraseña y definir la política de verificación del correo para cuentas locales. No vincular cuentas de Google automáticamente por compartir un correo.
  - **Cierre:** una persona que olvida su contraseña puede recuperar el acceso mediante un proceso seguro; los enlaces expiran y no se pueden reutilizar. Cuenta y progreso se conservan.

- [ ] **I07 — Validar las reglas de progreso en el servidor.**
  - Revisar identificadores de lección, requisitos de avance, pertenencia a la cuenta, límites del estado recibido e idempotencia. Comprobar solicitudes simultáneas.
  - **Cierre:** el servidor rechaza lecciones desconocidas y avances no permitidos según las reglas aprobadas; un usuario no puede modificar el progreso de otro y los reintentos no generan duplicados ni errores sin manejar. Esto no certifica aprendizaje por sí solo.

- [ ] **I08 — Hacer reproducibles las comprobaciones automáticas.**
  - Documentar instalación de dependencias y comandos; configurar integración continua. Ejecutar pruebas del backend y comprobar migraciones tanto desde una base vacía como desde la versión anterior sobre PostgreSQL de pruebas.
  - **Cierre:** frontend, backend, compilación y migraciones pasan en un entorno limpio mediante un proceso repetible, sin utilizar ni modificar la base de datos real.

- [ ] **I09 — Validar el recorrido completo en el entorno de entrega.**
  - Probar registro, acceso, HUB, Open Pit, C1–C9, progreso, salida y regreso con componentes reales. Añadir una prueba automatizada de humo y una matriz manual de dispositivos/navegadores acordada.
  - **Cierre:** evidencias del recorrido completo y de conexión interrumpida, sesión vencida, rotación y regreso desde segundo plano. Las pruebas reales no se sustituyen por componentes con servicios simulados.

### Prioridad 3 — Rendimiento y operación

- [ ] **I10 — Medir y mejorar carga y estabilidad del juego.**
  - Medir primera carga, caché, cambios de mapa y fluidez en los dispositivos objetivo. Optimizar recursos cuando la medición lo justifique y separar archivos esenciales de opcionales, como el audio ambiental.
  - **Cierre:** acordar y cumplir objetivos de rendimiento a partir de la medición inicial; un sonido fallido no impide jugar y un fallo esencial muestra una recuperación útil. Retirar archivos de edición de la distribución cuando no sean necesarios.

- [ ] **I11 — Preparar copias de seguridad y recuperación.**
  - Definir frecuencia, retención, responsable y acceso a las copias. Documentar restauración y vuelta a una versión anterior compatible con la base de datos.
  - **Cierre:** restaurar una copia en un entorno separado y comprobar cuentas y progreso. Un volumen persistente de Docker no cuenta por sí solo como copia de seguridad.

- [ ] **I12 — Detectar fallos después de la publicación.**
  - Añadir o documentar registros útiles, seguimiento de errores y comprobación de disponibilidad de la base de datos, diferenciando que el servidor responda de que pueda operar.
  - **Cierre:** un fallo de API, carga o guardado se puede detectar y diagnosticar sin depender únicamente del reporte del estudiante; se define quién recibe el aviso y qué hace.

- [ ] **I13 — Cerrar documentación, distribución y soporte.**
  - Inventariar licencias y atribuciones de imágenes, sprites, sonidos y fuentes; definir información de privacidad, conservación/eliminación de datos, canal de soporte y responsable. Preparar manual técnico, requisitos y notas de versión.
  - **Cierre:** la versión entregada tiene identificador, instrucciones de instalación y operación, derechos de distribución comprobados y un procedimiento de ayuda y gestión de datos. Los textos y decisiones sobre usuarios menores requieren revisión adecuada al público y contexto, no suposiciones técnicas.

## B. Enseñanza y experiencia de aprendizaje

### Prioridad 1 — Definir qué queremos que el estudiante consiga

- [ ] **E01 — Definir el público, conocimientos previos y alcance educativo.**
  - Acordar para quién es esta primera versión, qué necesita saber al entrar y qué aprenderá en Open Pit. Distinguir estadística descriptiva de contenidos futuros de Machine Learning.
  - **Cierre:** ficha breve aprobada por el usuario con público, conocimientos previos y resultados esperados; sirve de referencia para todas las demás decisiones pedagógicas.

- [ ] **E02 — Revisar los objetivos y la precisión matemática de C1–C9.**
  - Separar la misión narrativa del objetivo de aprendizaje. Para cada clase, identificar una idea principal, una confusión que debe resolver y una acción observable que demuestre comprensión.
  - **Cierre:** nueve fichas breves, conservando el orden actual. Revisar especialmente unidades, escalas, uso de todos los registros, alcance de la varianza descriptiva y límites de las recomendaciones operativas. No convertir los datos de ejemplo en garantías sobre el mundo real.

- [ ] **E03 — Comprobar aprendizaje inicial y final.**
  - Diseñar comprobaciones cortas, por opciones y con gráficos. Usar casos equivalentes pero distintos antes y después, sin convertirlo en otro examen largo.
  - **Cierre:** las preguntas corresponden a los objetivos de E02 y permiten distinguir completar actividades de aplicar las ideas a datos nuevos. Definir qué resultados se conservarán, para qué y con qué tratamiento de datos antes de implementarlo.

### Prioridad 2 — Hacer clara y significativa la investigación

- [ ] **E04 — Mejorar la primera entrada al juego.**
  - Explicar de forma breve quién es el jugador, qué necesita el siguiente turno, cómo moverse e interactuar y cómo reconocer el guardado. Adaptar la ayuda a teclado o móvil.
  - **Cierre:** una persona nueva llega a C1 y entiende por qué empieza, sin instrucciones del desarrollador. La ayuda puede volver a consultarse y no añade una introducción extensa.

- [ ] **E05 — Construir un expediente y un cierre narrativo coherentes.**
  - Proponer una evidencia breve por parada y una entrega final al supervisor. C9 debe conectar las herramientas aprendidas sin mezclar variables ni condiciones de zonas distintas.
  - **Cierre:** el jugador puede consultar lo que averiguó; el cierre refleja su recorrido y distingue evidencias originales de ejercicios de práctica. Definir antes cómo se conserva este expediente y revisar su alcance con el usuario.

- [ ] **E06 — Afinar claridad, ritmo y ayuda de las lecciones.**
  - Revisar una clase por tarea, priorizando C6 y C8. Comprobar vocabulario, una decisión principal por paso, lectura de gráficos, opciones claras, pistas y repeticiones tras errores.
  - **Cierre:** la pregunta, la evidencia necesaria y las opciones se pueden relacionar sin adivinar ni recorrer una cascada confusa de componentes. Las ayudas explican el error sin castigar al estudiante ni atraparlo en repeticiones interminables. Conservar opciones y accesibilidad; no añadir escritura obligatoria.

### Prioridad 3 — Validación con estudiantes y revisión final

- [ ] **E07 — Realizar un piloto con personas del público objetivo.**
  - Observar dónde se pierden, qué entienden de los gráficos, qué responden sin ayuda y qué recuerdan al terminar. Registrar tiempos y dificultades con el mínimo de datos personales necesario.
  - **Cierre:** informe de observaciones reales, resultados de E03 y cambios priorizados. No sustituir este piloto por nuestras propias pruebas ni afirmar eficacia general a partir de un grupo pequeño.

- [ ] **E08 — Aplicar las correcciones del piloto y validar la entrega educativa.**
  - Ajustar solo problemas observados, repetir las comprobaciones relevantes y revisar el cierre y las indicaciones para volver a practicar.
  - **Cierre:** los objetivos, actividades y comprobaciones están alineados; los bloqueos de comprensión detectados se corrigen o quedan expresamente documentados. El usuario aprueba la versión educativa final.

## Orden de ejecución

1. **Inicio técnico:** I01 → I02. Revisar I03 antes de cambiar la persistencia para que ambas soluciones sean compatibles, sin ampliar la primera implementación.
2. **Inicio pedagógico:** E01 → E02 → E03. Estas definiciones pueden avanzar mientras se prepara el entorno técnico.
3. **Preparación de la entrega:** I04–I09, con decisiones y aprobaciones previas para despliegue y cuentas.
4. **Experiencia jugable:** E04–E06 e I10; I03 debe estar resuelto antes del piloto final.
5. **Operación y distribución:** I11–I13 antes de publicar.
6. **Validación educativa:** E07 → E08 antes de presentar la versión como entrega educativa final.

Las prioridades ordenan el trabajo; no convierten las de prioridad 3 en innecesarias. Un piloto cerrado debe indicar sus limitaciones y no equivale a la versión pública final.

## Condiciones para declarar terminada la entrega

- Guardado y recuperación comprobados, sin pérdida silenciosa del trabajo del estudiante.
- Despliegue seguro y reproducible, pruebas reales aprobadas y recuperación de datos ensayada.
- Público, objetivos y alcance educativo definidos; piloto y correcciones documentados.
- Open Pit completo y accesible en los dispositivos admitidos, con comienzo y final claros.
- Licencias, privacidad, soporte y documentación de la versión disponibles.
- Aprobación del usuario sobre la versión exacta que se entregará.

## Registro de seguimiento

Para cada pendiente terminado, añadir aquí: identificador, fecha, alcance implementado, evidencia de comprobación y validación del usuario. No marcar terminados solo porque el código compila.

Todavía no hay pendientes de esta lista cerrados.

### I01 — Implementado; pendiente de validación del usuario

- **Fecha:** 2026-10-05.
- **Alcance:** conservar la finalización pendiente en el navegador antes de enviarla, separada por cuenta. Al regresar al juego o reintentar, consultar primero el servidor; si ya está confirmada, retirar el pendiente, y si no, reenviar sin repetir la actividad. La siguiente clase se desbloquea solo con confirmación del servidor.
- **Interfaz:** avisos de guardado pendiente y confirmado usando el panel y la paleta existentes. Si el navegador no permite conservar el pendiente, advertir que no se debe recargar ni cerrar la página antes de reintentar.
- **Comprobaciones:** 556 pruebas del frontend aprobadas en 39 archivos (27 pruebas añadidas), incluyendo error de conexión, recarga, separación de cuentas, respuestas tardías, respuesta perdida y almacenamiento no disponible. Compilación de producción aprobada, con la advertencia SCSS de C6 ya existente.
- **Revisión visual:** avisos y botón de reintento comprobados en una vista local con servicios simulados, a 393 × 852, 320 × 568 y 568 × 320. Esta revisión no es una prueba del recorrido con el backend real.
- **Límites:** depende del almacenamiento de este navegador; no conserva ejercicios a medio terminar, no ofrece juego completamente sin conexión y no aborda la accesibilidad del reintento dentro del modal (I02) ni solicitudes simultáneas entre pestañas en el servidor (I07).
- **Validación pendiente:** probar con la aplicación y el servidor reales que un fallo de guardado permite cerrar la clase, regresar o recargar y confirmar el progreso sin repetirla. I01 permanece sin marcar hasta esa validación.

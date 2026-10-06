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

### I02 — Implementado; pendiente de validación del usuario

- **Fecha:** 2026-10-06.
- **Alcance:** un único aviso de guardado. Mientras hay una clase o diálogo abierto, se muestra dentro del panel y su botón entra en la navegación con Tab y Shift+Tab. Al cerrar, el aviso pendiente vuelve al mapa. La franja reserva espacio: no flota encima del contenido.
- **Foco y controles:** Enter y Espacio conservan su comportamiento de botón, sin enviar nuevas pulsaciones al juego. Durante el reintento, el botón se deshabilita y el foco permanece dentro del panel. Tras un fallo, se puede volver al botón con Tab; al confirmar y cerrar la clase, el foco regresa al mapa. Reintentar por sí solo no desbloquea al personaje.
- **Comprobaciones:** 565 pruebas del frontend aprobadas en 39 archivos (9 pruebas añadidas), incluidas las secuencias existentes de C1–C9. Compilación de producción aprobada; permanece la advertencia SCSS anterior de C6.
- **Revisión en navegador:** componentes reales con servicios simulados, a 393 × 852, 320 × 568 y 568 × 320. Comprobados aviso único, foco visible, Tab, Shift+Tab, Enter y Espacio, fallo seguido de confirmación y retorno del foco al mapa. No equivale a una prueba con la API, Phaser ni un lector de pantalla reales.
- **Límites:** sin cambios en backend, mapas, contenido educativo ni persistencia de I01. No implementa recuperación de ejercicios a medio terminar (I03).
- **Validación pendiente:** comprobar el fallo y reintento con el servidor real, tanto con teclado como en el teléfono del usuario. I02 permanece sin marcar hasta esa validación.

### I03 — Primera parte implementada: recuperación de C6; pendiente de validación

- **Fecha:** 2026-10-06.
- **Alcance aprobado:** solo C6. Guardado automático de un borrador por cuenta y lección en este navegador: fase de introducción/ejercicio/cierre, etapa del ejercicio, cuadrados formados, exploración de la copia, ronda, ayudas utilizadas, respuesta de varianza comprobada y orden de opciones. Los registros y cálculos se reconstruyen a partir del estado, sin conservar datos personales adicionales ni el texto transitorio de las pistas.
- **Recuperación:** al volver a abrir C6, elegir «Continuar» o «Volver a empezar». La conversación inicial o final se retoma desde su comienzo; el ejercicio vuelve al punto guardado. Las ayudas utilizadas siguen contando y no permiten evitar la nueva práctica sin pistas. Retomar nunca emite la finalización ni desbloquea la siguiente clase.
- **Compatibilidad con I01/I02:** la finalización pendiente tiene prioridad y se reintenta sin repetir el ejercicio. El borrador se retira tras confirmar la finalización o reconciliar su pendiente, no por cerrar la clase, un error de conexión o un resultado de una sesión anterior. Una práctica interrumpida no se descarta solo porque C6 se hubiera completado anteriormente. Se conserva el panel único, la paleta y los botones existentes; no se añaden controles al HUD.
- **Protecciones:** versión de almacenamiento y de lección, comprobación de tipos y combinaciones de estado coherentes, separación por cuenta y rechazo de escrituras/limpieza de una sesión que ya cambió. Un borrador incompatible inicia una actividad nueva con aviso; un fallo de almacenamiento advierte que cerrar o recargar podría perder el intento. La validación del borrador no certifica aprendizaje ni sustituye I07.
- **Comprobaciones:** 640 pruebas del frontend aprobadas en 44 archivos (75 añadidas), incluidas las secuencias anteriores de C1–C9, recarga, elección de reinicio, rondas con ayuda, cierre, cuentas distintas, respuestas tardías y almacenamiento bloqueado. Compilación de producción aprobada; permanece la advertencia SCSS anterior de C6 (11,64 kB frente al umbral de aviso de 10 kB).
- **Incidencia de pruebas:** una ejecución anterior falló en dos pruebas de audio porque faltaba `Math.Clamp` en el doble de Phaser utilizado. No se reprodujo en las dos ejecuciones completas posteriores. Revisar el aislamiento de estos dobles en I09; el audio no se ha modificado en esta tarea.
- **Revisión en navegador:** C6 y LessonRunner reales con cuenta local de prueba, sin API ni Phaser. Recarga real tras formar cuadrados y tras recibir una pista; recuperación de la práctica y del diálogo final desde el primer mensaje. Controles de recuperación revisados a 393 × 852, 320 × 568 y 568 × 320; Tab, Enter, Espacio y Escape, separación entre dos cuentas de prueba y conservación del borrador antes de confirmar guardado. Evidencia visual local en `frontend/tmp/landing-editorial-qa/i03-c6-resume-mobile.png` (archivo de prueba ignorado por Git).
- **Límites:** mismo navegador y dispositivo; depende de su almacenamiento y no constituye modo sin conexión completo. No se cambian backend, mapas ni los ejercicios de C1–C5/C7–C9. No se resuelven conflictos entre pestañas simultáneas. C8 y las demás lecciones quedan fuera de esta primera parte.
- **Validación pendiente:** con la aplicación y servidor reales, interrumpir C6, cerrar o recargar, reabrir desde el mapa y continuar; comprobar también finalización pendiente, cambio de cuenta y teléfono del usuario. I03 permanece abierto: esta subtarea no cierra la recuperación de todas las actividades.

### I03 — Segunda parte implementada: recuperación de C8; pendiente de validación

- **Fecha:** 2026-10-06.
- **Alcance aprobado:** extender la recuperación solo a C8. Conservar introducción/ejercicio/cierre y seis campos del intento: etapa, ronda, ayudas utilizadas, registro seleccionado, ejemplo de comparación visible y orden de opciones. Los datos y cálculos se reconstruyen; no se almacena el texto transitorio de las pistas.
- **Recuperación:** reutilizar «Continuar» y «Volver a empezar» con la misma paleta y controles de C6, sin añadir elementos al HUD. Retomar conserva la práctica pendiente tras usar ayuda y distingue los registros del intento, el ejemplo de comparación y los datos originales del informe. El diálogo final se retoma desde su comienzo, sin repetir el ejercicio. Recuperar nunca completa la clase ni desbloquea la siguiente.
- **Compatibilidad y protecciones:** los borradores v1 de C6 mantienen su clave y formato. C8 utiliza una clave independiente por cuenta y lección; se validan versión, tipos, etapa, ayuda y selección coherente con los datos de la ronda. Las respuestas de sesiones anteriores no escriben ni retiran borradores de la sesión actual. I01 conserva prioridad; el borrador se retira solo al confirmar la finalización o reconciliar su pendiente, no por cerrar o fallar el guardado. Una práctica interrumpida de una clase completada anteriormente se conserva.
- **Comprobaciones:** 713 pruebas del frontend aprobadas en 48 archivos (73 más que al terminar C6; se sustituyó una comprobación que consideraba C8 no compatible). Cubren estados de C8, rondas y ayudas, reinicio, cierre, cuentas distintas, compatibilidad de C6, almacenamiento bloqueado y confirmación/reconciliación de guardado. Compilación de producción aprobada; permanece únicamente la advertencia SCSS anterior de C6 (11,64 kB frente al umbral de aviso de 10 kB).
- **Revisión en navegador:** C8 y LessonRunner reales con cuenta local de prueba, sin API ni Phaser. Recarga real tras una pista, durante el ejemplo de comparación y en el segundo mensaje del cierre; comprobados mismo orden de opciones, mismos datos visibles, práctica adicional tras ayuda, informe con datos originales y cierre recuperado desde el primer mensaje. Panel de recuperación revisado a 393 × 852, 320 × 568 y 568 × 320, sin desbordamiento horizontal y con controles de al menos 44 px; Tab y Enter comprobados. Sin errores de consola observados. Evidencia local en `frontend/tmp/landing-editorial-qa/c8-resume-568x320.png` (archivo de prueba ignorado por Git).
- **Límites:** ahora hay recuperación en C6 y C8, no en las otras siete lecciones. Sigue dependiendo del mismo navegador y dispositivo; no es un modo sin conexión completo ni resuelve conflictos entre pestañas. No se cambian backend, mapas, matemáticas ni diseño del ejercicio de C8.
- **Validación pendiente:** probar desde el mapa con aplicación y servidor reales, incluyendo error de guardado, recarga, cambio de cuenta y teléfono del usuario. Las validaciones pendientes de C6, I01 e I02 no se dan por aprobadas con esta subtarea. I03 continúa sin marcar.

### I03 — Tercera parte implementada: recuperación de C7; pendiente de validación

- **Fecha:** 2026-10-06.
- **Alcance aprobado:** extender la recuperación solo a C7. Conservar introducción/ejercicio/cierre y nueve campos del intento: etapa, ronda, predicción inicial, período activo, cálculos resueltos, ayudas utilizadas, nivel y enfoque de pista, y orden de opciones. Los registros y cálculos se reconstruyen, sin almacenar texto de interfaz ni datos personales adicionales.
- **Recuperación y enseñanza:** reutilizar «Continuar» y «Volver a empezar». Si A ya está resuelto, volver al cálculo B sin repetir A; conservar la predicción que se contrasta en el informe. Reconstruir la misma explicación de pista y sus gráficos sin consumir otra pista ni subir su nivel. La ayuda utilizada sigue exigiendo una práctica nueva; el informe final mantiene los datos originales. Retomar el diálogo final desde su primer mensaje, sin repetir el ejercicio ni completar o desbloquear la clase automáticamente.
- **Protecciones y compatibilidad:** validar la secuencia A → B → informe, pistas correspondientes a la etapa y final sin ayuda pendiente; rechazar estados incoherentes o versiones incompatibles. Clave independiente por cuenta y lección, con rechazo de escrituras o limpieza de sesiones anteriores. C6 y C8 conservan sus claves y formatos v1. I01 mantiene prioridad y el borrador se retira solo después de confirmar/reconciliar la finalización. Reiniciar C7 no toca los otros borradores ni las finalizaciones pendientes. La limpieza existente de WorldPage ya cubre C7, sin modificar su código de ejecución.
- **Comprobaciones:** 794 pruebas del frontend aprobadas en 52 archivos. Incluyen todos los estados y pares de práctica de C7, ambos niveles y enfoques de pista, recuperación de B, práctica adicional, reinicio, cierre, cambio de cuenta/sesión, almacenamiento bloqueado y regresiones de C6/C8 y guardado. Compilación de producción aprobada; permanece únicamente la advertencia SCSS anterior de C6 (11,64 kB frente al umbral de aviso de 10 kB).
- **Revisión en navegador:** C7 y LessonRunner reales con dos cuentas locales de prueba, sin API ni Phaser. Recarga real en el cálculo B con primera pista y explicación completa; comprobados A resuelto, mismo orden de opciones, texto y cuadrados de la pista, predicción inicial, práctica pendiente tras ayuda y separación de cuentas. Recarga en el segundo mensaje del cierre recuperada desde el primero, sin repetir el ejercicio. Escape para cerrar y Tab/Enter para continuar comprobados. Panel de recuperación revisado a 393 × 852, 320 × 568 y 568 × 320, sin desbordamiento horizontal y con controles de al menos 44 px. Sin errores de consola observados. Evidencia local en `frontend/tmp/landing-editorial-qa/c7-resume-568x320.png` (archivo de prueba ignorado por Git).
- **Límites:** recuperación implementada en C6, C7 y C8; C1–C5 y C9 todavía no la tienen. Sigue dependiendo del mismo navegador/dispositivo y no resuelve conflictos entre pestañas ni ofrece modo sin conexión completo. Sin cambios en backend, mapas, datos, matemáticas, HTML o SCSS del ejercicio de C7; se conserva el diseño de recuperación existente.
- **Validación pendiente:** comprobar desde el mapa con aplicación y servidor reales, incluyendo error de guardado, recarga, cambio de cuenta y teléfono del usuario. Las comprobaciones simuladas no cierran I01, I02 ni I03; tampoco sustituyen las validaciones pendientes de C6 y C8.

### I03 — Recuperación extendida a todas las clases; pendiente de validación real

- **Fecha:** 2026-10-06.
- **Alcance aprobado:** implementar lo restante: C1–C5 y C9. Ahora las nueve clases de Open Pit conservan un borrador independiente por cuenta y lección en este navegador, con introducción, ejercicio y conversación final. C6, C7 y C8 mantienen sus claves y formatos v1.
- **Estado educativo:** C1 conserva el camión/grupo elegido y la ronda; C2, reparto explorado, caso de práctica y registro seleccionado; C3, ambos extremos, incluida una selección incompleta; C4, predicción, posición del experimento y si ya se exploró; C5, lectura elegida y cantidad de datos resueltos; C9, respuesta comprobada antes de continuar y tipo de explicación. Todas conservan la ronda y las ayudas usadas, sin convertir un intento con ayuda en un acierto independiente. Los datos y las matemáticas se reconstruyen sin cambiarlos. C1–C5 no conservan el texto transitorio de las pistas; C9 reconstruye su explicación a partir de la respuesta y la ronda.
- **Interfaz y protecciones:** reutilizar el panel retro «Continuar / Volver a empezar», sin cambiar gráficos, vocabulario, SCSS de las clases, mapas ni backend. Validar tipos, selecciones y combinaciones coherentes antes de recuperar; descartar borradores incompatibles con aviso y advertir si el almacenamiento falla. Retomar nunca completa ni desbloquea una clase. Reiniciar afecta solo a ese borrador, no a otra cuenta, otra clase ni la finalización pendiente.
- **Compatibilidad con I01/I02:** la finalización pendiente sigue teniendo prioridad. Retirar el borrador solo tras confirmar o reconciliar el resultado; cerrar la clase, un error de conexión, una sesión reemplazada o un intento anterior ya completado no eliminan la práctica actual. La limpieza de WorldPage ya era genérica; se ampliaron sus pruebas, sin cambiar su lógica de ejecución en esta subtarea.
- **Comprobaciones:** 857 pruebas del frontend aprobadas en 55 archivos (63 más que al terminar C7). Incluyen recuperación de cada acción durante cuatro rondas, ayudas, registros de práctica frente a informes originales, respuesta y explicación de C9, cierre, reinicio, separación de cuentas, sesiones reemplazadas, rechazo de estados incoherentes, almacenamiento bloqueado y prioridad del guardado pendiente. Compilación de producción aprobada; permanece la advertencia SCSS anterior de C6 (11,64 kB frente al umbral de aviso de 10 kB). `git diff --check` sin errores de espacios.
- **Revisión en navegador:** componentes reales y recargas reales con cuentas locales de prueba, sin API ni Phaser. Comprobados camión seleccionado en C1, reparto explorado en C2, mínimo parcial en C3, predicción y experimento reversible en C4, segundo dato y ayuda conservada en C5, y respuesta correcta con explicación pendiente de continuar en C9. La cuenta B no recibe el borrador de A. Panel revisado a 393 × 852, 320 × 568 y 568 × 320, sin desbordamiento horizontal y con botones de más de 44 px; Tab y Enter comprobados. Evidencia local: `frontend/tmp/landing-editorial-qa/remaining-resume-568x320.png` (archivo de prueba ignorado por Git).
- **Límites y siguiente validación:** depende del mismo navegador y dispositivo; no sincroniza ejercicios entre dispositivos, no ofrece modo sin conexión completo ni resuelve conflictos entre pestañas. Probar C1–C9 desde el mapa con la aplicación y servidor reales, incluidos cierre/recarga, fallo y reintento de guardado, cambio de cuenta y teléfono del usuario. I03 continúa sin marcar; tampoco se dan por cerrados I01/I02 ni sus validaciones anteriores.

### I05.1 — Protección de escrituras con cookies implementada; pendiente de validación real

- **Fecha:** 2026-10-06. I04 sigue aplazado hasta antes de la demostración; no se configuró ni desplegó AWS/cPanel.
- **Alcance aprobado:** exigir una cabecera personalizada y un origen autorizado antes de escribir en la API. Control central en Flask para registro, acceso con contraseña/Google, salida y progreso; interceptor de Angular limitado a la API configurada. Sin migraciones, dependencias nuevas, cambios visuales, clases ni mapas.
- **Comportamiento:** devolver 403 `csrf_validation_failed` antes de modificar datos. Origin exacto; Referer solo si Origin no existe. No confiar en Host/cabeceras del proxy, orígenes `null`, comodines ni subdominios implícitos. Configuraciones inválidas impiden el arranque. GET/HEAD/OPTIONS mantienen su funcionamiento; CORS autoriza explícitamente la cabecera. Un 403 conserva la sesión local y la finalización pendiente de I01.
- **Comprobaciones:** 124 pruebas del backend con SQLite en memoria y filtro activo; 896 del frontend en 57 archivos, incluidas 39 nuevas del interceptor e integración con servicios/proveedores reales. Build de producción aprobado; permanece el aviso SCSS anterior de C6 (11,64 kB frente a 10 kB). Navegador con Angular/Flask reales y datos ficticios: proxy local, preflight directo autorizado, registro/acceso/guardado/salida legítimos, formularios con cookie rechazados sin revocación ni pérdida de progreso y origen ajeno rechazado. Sin usar la base real ni Google real. Servidores temporales detenidos y pestañas cerradas.
- **Configuración y evidencia:** [guía de solicitudes seguras](seguridad-solicitudes.md). Añadir manualmente el origen LAN exacto para el teléfono y reiniciar el backend; no se editó `.env` privado. Evidencia local ignorada por Git en `frontend/tmp/csrf-qa/browser-proof.jpg` y `browser-proof-final.jpg`.
- **Límites y siguiente validación:** comprobar Compose habitual, teléfono y Google real, y después el proxy del entorno de entrega. La cabecera pública no sustituye la autenticación ni evita abuso o XSS. I05 continúa sin marcar: siguen pendientes la validación de límites de intentos, tamaño de entradas, validación HTTPS/cookies de producción y revisión de dependencias. La primera parte de I05.2 se registra a continuación.

### I05.2 — Primera parte implementada: límite persistente de acceso con contraseña

- **Fecha:** 2026-10-06. I04 permanece aplazado; no se desplegó ni arrancó Compose.
- **Alcance aprobado:** 8 intentos por correo normalizado en una ventana de 5 minutos, configurable, únicamente en `/api/v1/auth/login`. Cuentan intentos correctos e incorrectos; mismo tratamiento para correos conocidos y desconocidos. El noveno devuelve 429 y tiempo de reintento, sin prolongar la ventana ni revocar sesiones. No se limitan Google, registro, clases, progreso o salida.
- **Implementación:** tabla propia en la base existente, consumo atómico y persistente antes de comprobar la contraseña; sin Redis, nuevas dependencias ni contador local. No se guardan contraseñas/tokens/IP ni correo en claro; el digest no garantiza anonimato. Ante fallo de almacenamiento, acceso rechazado con 503 y aviso simple. Angular conserva formulario y sesión. Comando de limpieza exclusiva de ventanas vencidas, con opción de simulación.
- **Comprobaciones:** 167 pruebas del backend y 900 del frontend aprobadas; build aprobado con el aviso SCSS anterior de C6. Concurrencia de 32 solicitudes, dos instancias y recreación comprobadas sobre SQLite temporal. Migración nueva probada en subida/bajada/subida desde el esquema previo aislado, sin alterar cuentas/sesión. Se mantienen 12 avisos existentes de Alembic/Flask-Migrate. Navegador con Login/AuthService/Flask reales y cuenta ficticia: ocho respuestas 401 y novena 429, aviso visible y formulario conservado. Servidor temporal y pestaña cerrados; sin Google, Phaser ni datos reales.
- **Activación pendiente:** [guía de límites de acceso](limites-acceso.md). Migración creada, **no aplicada a la base real**; sin ella, el nuevo acceso con contraseña responde 503. El Compose actual ejecuta migraciones al iniciar el backend, por lo que reiniciarlo con este código puede aplicarla. Validar primero con PostgreSQL aislado y aprobar la aplicación al entorno elegido. Docker no tenía motor disponible; compilar la sentencia PostgreSQL no sustituye ejecutarla. Evidencia visual ignorada por Git: `frontend/tmp/login-limit-qa/rate-limit-message.jpg`.
- **Límites y cierre:** política por correo, no protección global contra bots o correos distribuidos; posible bloqueo temporal dirigido. Acordar limpieza periódica y políticas de abuso de registro/Google por separado. Pendientes PostgreSQL real de pruebas, Compose/teléfono, tamaño de entradas, HTTPS/cookies y dependencias. I05 continúa sin marcar; no se implementa la siguiente subtarea sin propuesta y aprobación.

### I05.3 — Límite de tamaño implementado; pendiente de validación en el entorno habitual

- **Fecha:** 2026-10-06. I04 sigue aplazado; no se arrancó ni desplegó Compose.
- **Alcance aprobado:** limitar el cuerpo de solicitudes a la API a 64 KiB, configurable, con respuesta JSON 413 y mensaje sencillo. Sin tablas/migraciones, dependencias, cambios de diseño, mapas, lecciones o reglas de progreso.
- **Comportamiento:** conservar CSRF antes del control de tamaño y rechazar antes de crear cuentas/sesiones, consumir intentos, verificar Google, guardar o revocar sesiones. Admitir el límite exacto y rechazar un byte adicional; contar bytes UTF-8. No limitar recursos del juego, rutas ajenas ni respuestas. Lectura WSGI acotada con un byte adicional de comprobación; mantener el fallback seguro para entradas sin tamaño ni terminación. No se refleja el contenido rechazado en el error.
- **Frontend:** aviso 413 de acceso/registro/Google con campos y sesión conservados; mensaje de tamaño visible en guardado/reintento sin retirar la finalización pendiente o el borrador. Conservar siempre la advertencia de almacenamiento local fallido. Los demás avisos mantienen su prioridad anterior. Sin HTML/SCSS modificados en esta subtarea.
- **Comprobaciones:** 216 pruebas del backend y 917 del frontend en 57 archivos aprobadas (49 y 17 nuevas, respectivamente). Build de producción aprobado con el aviso SCSS anterior de C6; se mantienen 12 avisos anteriores de Alembic/Flask-Migrate. HTTP real comprobado con datos ficticios en SQLite desechable; servidor loopback detenido al terminar, sin base real. Componentes/frontend verificados mediante pruebas, no una nueva revisión visual en navegador. `git diff --check` sin errores de espacios.
- **Guía y siguiente validación:** [límites de solicitudes](limites-solicitudes.md). Configurar `API_MAX_REQUEST_BYTES` solo si se necesita otro valor; `.env` privado no editado. Pendientes Compose/teléfono/Google y proxy real. Este límite no cubre frecuencia, cabeceras, tiempos de conexión ni todas las validaciones de campos. I05 continúa sin marcar, y la migración de I05.2 sigue sin aplicar a la base real; reiniciar Compose puede aplicarla automáticamente.

### E06 — Primera parte: lenguaje de C6 revisado; pendiente de revisión del usuario

- **Fecha:** 2026-10-06.
- **Alcance aprobado:** solamente lenguaje de C6: instrucciones, opciones, pistas, etiquetas y diálogos. Explicar primero la acción con datos concretos y después nombrar desviación/varianza; sustituir expresiones como «aporte al cuadrado» por instrucciones vinculadas a las casillas. Diálogos más breves y propósito del siguiente turno explícito.
- **Conservado:** datos, fórmulas, unidades, opciones por botones, secuencia, reglas de ayudas, separación de práctica/informe y recuperación del ejercicio. No afirmar que completar demuestra dominio. Sin cambios de diseño, CSS, backend, mapas ni C8. No se resolvió todavía la repetición de rondas tras ayudas: requiere otra tarea aprobada.
- **Comprobación acotada:** 45 pruebas existentes de C6 aprobadas en un único archivo; actualizadas sus expectativas de texto, sin pruebas nuevas. Comprueban botones, pistas, cálculos, foco y finalización de la clase. Revisión del diff y `git diff --check`; sin suite completa, build de producción ni pruebas visuales/responsive, conforme a la petición del usuario. Los dos últimos ajustes de redacción de títulos/caption se revisaron en el diff, sin repetir la ejecución.
- **Siguiente validación:** revisión del lenguaje por el usuario dentro de C6. E06 permanece abierto; C8 y las siguientes mejoras se proponen por separado.

### E06 — Lenguaje simplificado en C3–C5 y C7–C9; pendiente de revisión del usuario

- **Fecha:** 2026-10-06.
- **Alcance aprobado:** continuar las correcciones de lenguaje señaladas en la revisión. C7 sustituye «aportes» y explicaciones abstractas por diferencias, casillas y acciones concretas. C8 explica raíz y unidades con toneladas por hora, sin confundir desviación estándar con promedio de separaciones. C9 aclara qué significa una referencia y acorta el cierre. C3–C5 reciben retoques de extremos, puntos uno sobre otro, material que entra y siguiente turno. C1, C2 y C6 no se modifican en esta tarea.
- **Conservado:** datos, cálculos, respuestas correctas e incorrectas, secuencia, recuperación, reglas de ayudas y separación entre práctica e informe original. Se mantienen los términos matemáticos y las advertencias: el promedio no es siempre una meta; los datos no explican las causas ni garantizan el futuro; estar fuera de la franja no equivale a trabajar mal; variar menos no basta para trabajar mejor. Sin CSS, mapas, backend ni refactorizaciones.
- **Comprobación acotada:** 213 pruebas existentes aprobadas en siete archivos: los seis componentes afectados y LessonRunner para los diálogos. Solo se actualizaron expectativas de texto, incluidas las de C6 que habían quedado desactualizadas en LessonRunner. La primera ejecución no pudo iniciar las pruebas por permisos del compilador; se repitió fuera del entorno restringido. Comparación de tokens TypeScript antes/después confirma cambios únicamente en cadenas de texto en los seis componentes. Revisión del diff y `git diff --check`; sin suite completa, build de producción ni pruebas visuales/responsive. Los cuatro últimos ajustes de etiquetas visibles/accesibles se revisaron sin repetir las pruebas.
- **Pendiente:** revisión del usuario dentro del juego. E06 sigue abierto: esta tarea no cambia la repetición de prácticas tras usar ayudas ni valida la comprensión con estudiantes.

### E06 — Recordatorio de C6 antes del cálculo de C7

- **Fecha:** 2026-10-06.
- **Alcance aprobado:** añadir en el texto existente de C7 el ejemplo «−2 × −2 = 4» de C6, antes de elegir la varianza. Recordar multiplicar cada diferencia por sí misma, sumar y dividir entre todos los registros, incluidos los que dan 0. El ejemplo no revela las respuestas de C7.
- **Conservado:** estructura visual, CSS, datos, cálculos, opciones, secuencia, recuperación y reglas de ayudas. El recordatorio forma parte de la instrucción y no consume una pista. Solo cambian dos textos del HTML y se amplía una comprobación existente de su archivo de pruebas.
- **Comprobación acotada:** las 48 pruebas existentes de C7 aprobadas en un único archivo; sin pruebas nuevas, suite completa, build de producción ni pruebas visuales. `git diff --check` sin errores.
- **Pendiente:** revisión del usuario en el juego. E06 permanece abierto; limitar las prácticas repetidas tras usar ayuda sigue siendo una tarea separada, aún sin implementar.

### E06 — C7: práctica adicional limitada y cierre con ayuda

- **Fecha:** 2026-10-06.
- **Alcance aprobado:** evitar repeticiones indefinidas en C7 tras usar ayudas. Resolver el caso inicial; si hubo ayuda, ofrecer una sola práctica adicional. Al resolverla, permitir el cierre aunque haya requerido apoyo. Seguir exigiendo los dos cálculos comprobados y la conclusión correcta antes de finalizar.
- **Enseñanza y lenguaje:** avisar antes de la práctica que se puede pedir ayuda y que no habrá otra ronda obligatoria. Mostrar «Completaste con ayuda» en el cierre asistido, sin afirmar dominio independiente. Si la práctica se resuelve sin pistas, indicarlo solo para esa práctica. El informe conserva los datos originales de C7 y no mezcla resultados de práctica.
- **Recuperación:** conservar el formato y los campos del borrador v1. La condición de ayuda se mantiene al guardar y recuperar un cierre guiado; no se convierte en un intento sin ayuda. Admitir borradores antiguos de rondas posteriores y ofrecer cierre explícito a quienes ya estaban en revisión, sin añadir otra ronda ni completar automáticamente al recuperar. Los cierres con ayuda en la ronda inicial siguen siendo inválidos. La conversación final y el guardado confirmado mantienen sus controles anteriores.
- **Conservado:** CSS, gráficos, datos, fórmulas, opciones, orden estable de respuestas, separación de cuentas, ayudas de dos niveles y finalización única. Sin cambios de backend, mapas, LessonRunner de ejecución ni almacenamiento compartido. La distinción con/sin ayuda se conserva en el borrador y la pantalla; no se añade un historial de dominio al servidor.
- **Comprobación acotada:** 133 pruebas aprobadas en cinco archivos relacionados con C7: componente, estado, recuperación, almacenamiento y recuperación mediante LessonRunner. Se adaptaron las comprobaciones que exigían rondas indefinidas y se añadieron casos del cierre guiado, rechazo de finalización prematura y conservación de la ayuda al recuperar. Sin suite completa, build de producción ni pruebas visuales/responsive. `git diff --check` sin errores.
- **Pendiente:** revisión del usuario dentro del juego. Esta regla se implementa solo en C7; C6, C8 y las otras clases requieren tareas separadas. E06 continúa abierto y no se da por validada la comprensión con estudiantes.

### E06 — C6: práctica adicional limitada y cierre con ayuda

- **Fecha:** 2026-10-06.
- **Alcance aprobado:** aplicar en C6 la regla de C7. Conservar la explicación guiada y la práctica inicial. Si esa práctica necesita ayuda, ofrecer una sola práctica adicional. Si también requiere apoyo, permitir terminar con «Completaste con ayuda», sin presentarlo como dominio independiente.
- **Requisitos educativos conservados:** completar el experimento de duplicación, resolver el cuadrado de la práctica, reconocer que repetir los datos conserva la varianza y comprobar su valor numérico antes de continuar. Una respuesta pendiente o incorrecta no permite finalizar. El cierre sigue mostrando los datos originales del SAG, no los de práctica; se conserva la conversación final.
- **Recuperación:** mantener los ocho campos y la versión v1 del borrador. Conservar la ayuda usada en un cierre guiado al guardar/retomar, sin convertirlo en un intento independiente. Los borradores antiguos de revisión en rondas posteriores ofrecen un cierre explícito sin añadir otra práctica. Recuperar nunca completa automáticamente la lección. Rechazar un cierre con ayuda en la ronda inicial o sin la varianza comprobada.
- **Conservado:** diseño, CSS, gráficos, registros, fórmulas, unidades, orden estable de opciones, separación de cuentas y finalización única. Sin cambios en backend, mapas, almacenamiento compartido ni código de ejecución de LessonRunner. La distinción de ayuda permanece en la pantalla y el borrador; no se añade un historial de dominio al servidor.
- **Comprobación acotada:** 116 pruebas aprobadas en cinco archivos de C6: componente, validación de estado, recuperación, almacenamiento y recuperación mediante LessonRunner. Se adaptaron las pruebas que suponían rondas ilimitadas y se añadieron casos de ayuda en el cuadrado, comparación y cálculo numérico, cierre guiado recuperado y borradores antiguos. Sin suite completa, build de producción ni pruebas visuales/responsive. `git diff --check` sin errores.
- **Pendiente:** revisión del usuario en el juego. El límite está implementado en C6 y C7; C8 y las otras clases requieren tareas separadas. E06 continúa abierto y no se da por validada la comprensión con estudiantes.

### E06 — C8: práctica adicional limitada y cierre con ayuda

- **Fecha:** 2026-10-06.
- **Alcance aprobado:** aplicar en C8 la regla de C6 y C7. Si el caso inicial necesita ayuda, ofrecer una sola práctica adicional. Al resolverla con apoyo, permitir terminar indicando «Completaste con ayuda», sin presentar el resultado como dominio independiente.
- **Requisitos educativos conservados:** responder correctamente la raíz de la varianza, identificar un registro fuera de la franja, reconocer que los bordes del ejemplo de comparación están dentro y elegir el aviso correcto. Pedir ayuda o responder mal no permite saltarse esas actividades. El informe final conserva los datos originales de flotación y no incorpora los de práctica. Se mantiene la conversación final.
- **Recuperación:** conservar los seis campos y la versión v1 del borrador. Guardar y recuperar el cierre guiado mantiene la condición de ayuda. Los borradores antiguos de revisión en rondas posteriores ofrecen un cierre explícito, sin otra práctica ni finalización automática al recuperar. Se rechazan cierres con ayuda en la ronda inicial, sin selección correcta o con la comparación aún activa.
- **Conservado:** diseño, CSS, gráficos, datos, fórmulas, unidades, orden estable de respuestas, separación de cuentas y finalización única. Sin cambios de backend, mapas, almacenamiento compartido ni código de ejecución de LessonRunner. La distinción de ayuda permanece en pantalla y borrador, no en un historial de dominio del servidor.
- **Comprobación acotada:** 121 pruebas aprobadas en cinco archivos de C8: componente, estado, recuperación, almacenamiento y recuperación mediante LessonRunner. Se adaptaron las comprobaciones que exigían rondas indefinidas y se cubrieron ayuda en raíz, selección, comparación y aviso, cierre guiado recuperado, borradores antiguos y conversación final obligatoria. Sin suite completa, build de producción ni pruebas visuales/responsive. `git diff --check` sin errores.
- **Pendiente:** revisión del usuario en el juego. El límite está implementado en C6, C7 y C8; no se aplica automáticamente a las otras clases. E06 continúa abierto y no se da por validada la comprensión con estudiantes.

### E06 — C1: explicar la comparación con cargas concretas

- **Fecha:** 2026-10-06.
- **Alcance:** primer ajuste de comprensión de la revisión C1–C9, comenzando por C1. Sustituir la explicación genérica por opciones basadas en las cargas del caso: por ejemplo, D tiene 90, 100 y 110 t frente a 110, 111 y 112 t en C. La pregunta es «¿Qué viste al comparar las cargas?», sin cálculos ni pasos adicionales.
- **Enseñanza:** comparar todas las cargas, no solo la mayor ni la cantidad de camiones. Las opciones incorrectas usan números verdaderos del caso, pero una interpretación equivocada; las pistas explican esa diferencia con los mismos registros. La revisión con apoyo también muestra las cargas comparadas. El orden de opciones cambia entre rondas y permanece estable durante una pregunta y al recuperar.
- **Conservado:** tutorial, gráficos, escala, datos, secuencia, respuestas por botones, informe original, finalización única y borrador v1. Sin CSS, mapas, backend, almacenamiento compartido, cambios de arquitectura ni otras clases. No se cambia en esta tarea la repetición de prácticas tras errores.
- **Comprobación acotada:** 14 pruebas funcionales de C1 aprobadas en un único archivo. Comprobadas opciones concretas, datos y orden en rondas posteriores, pistas, botones, finalización y recuperación de una práctica con ayuda. Sin suite completa, build de producción ni pruebas visuales/responsive. `git diff --check` sin errores.
- **Pendiente:** revisión del usuario dentro de C1 y tarea separada para limitar prácticas tras ayuda. E06 permanece abierto; completar el ejercicio no se presenta como validación de aprendizaje con estudiantes.

### E06 — C1: práctica adicional limitada y cierre con ayuda

- **Fecha:** 2026-10-06.
- **Alcance:** continuar el ajuste de C1 aplicando la regla de C6–C8. Conservar el tutorial y la práctica inicial. Si esa práctica necesita ayuda, realizar una sola práctica adicional. Al resolverla con apoyo, permitir terminar con «Completaste con ayuda», sin afirmar dominio independiente. Se elimina el anuncio contradictorio «Otro ejemplo, sin ayuda».
- **Requisitos educativos conservados:** elegir el grupo cuyas cargas son más diferentes y reconocer la explicación correcta basada en todas sus cargas. Una respuesta pendiente o incorrecta no permite finalizar. La revisión avisa que se pueden usar las pistas y que no habrá otra práctica obligatoria. El informe conserva el hallazgo original del grupo B, no los datos de práctica; sigue siendo necesario completar la conversación final.
- **Recuperación:** mantener los cinco campos y la versión v1 del borrador. Guardar y retomar conserva la condición de ayuda del cierre. Los borradores antiguos de revisión en rondas posteriores permiten ver el informe mediante una acción explícita, sin otra práctica ni finalización automática. Se conserva su ronda y se limpia la selección del punto antes del cierre. Los cierres con ayuda en la práctica inicial o con un grupo incorrecto siguen siendo inválidos.
- **Conservado:** gráficos, escala, datos, opciones concretas y su orden estable, CSS, separación entre cuentas y finalización única. Sin cambios de backend, mapas, arquitectura, almacenamiento compartido ni código de ejecución de LessonRunner. La distinción con/sin ayuda queda en la pantalla y el borrador; no se añade un historial de dominio al servidor.
- **Comprobación acotada:** 33 pruebas funcionales aprobadas en cuatro archivos seleccionados, con filtro por nombres relacionados con C1: componente, validación de estado, recuperación y LessonRunner. El filtro también incluye los seis casos del bloque compartido de recuperación C1–C5 y C9. Se adaptaron las pruebas de rondas indefinidas y se comprobó ayuda al elegir el grupo o la explicación, cierre guiado guardado y recuperado, borradores antiguos y conversación final obligatoria. Sin suite completa, build de producción ni pruebas visuales/responsive. `git diff --check` sin errores.
- **Pendiente:** revisión del usuario dentro de C1. E06 continúa abierto y no se da por validada la comprensión con estudiantes. Las siguientes correcciones de enseñanza de C2–C9 requieren tareas separadas.

### E06 — C2: explicar el promedio y la llegada de las cargas

- **Fecha:** 2026-10-06.
- **Alcance:** continuar la revisión de comprensión con C2. Mostrar el cálculo del ejemplo: sumar 90 + 100 + 110 = 300 t y dividir entre tres camiones, 300 ÷ 3 = 100. El resultado sigue siendo 100 toneladas por camión. Se conserva el reparto imaginario y la advertencia de que las cargas reales no cambian; no se exige escribir ni calcular una respuesta.
- **Enseñanza y propósito:** aclarar que quienes reciben el material piden cargas cercanas a 100 toneladas y que el informe se revisa antes de preparar el siguiente turno. La pregunta «¿Qué podemos saber con estos promedios?» corresponde a las opciones disponibles, sin confundir una observación con una acción. Simplificar «promediaron» a «tuvieron un promedio de».
- **Transiciones:** sustituir «Prueba 1 de 2 / Prueba 2 de 2» por «Primero, mira el resumen / Ahora, compara las cargas». La instrucción y el título del tablero distinguen expresamente cuándo solo hay promedios y cuándo ya se ven las cargas. Al solicitar los registros del caso original, se indica que el encargado los entregó. El estudiante sigue teniendo que reconocer la información faltante, pedirla, comparar todas las cargas y elegir la explicación correcta.
- **Conservado:** datos, cálculos, opciones, gráficos, escala, CSS, secuencia, controles por botones, foco, ayudas, borrador v1, informe original y conversación final. Solo cambian el HTML de C2, las expectativas de sus pruebas y este registro; sin cambios de TypeScript de ejecución, backend, mapas, arquitectura ni otras clases.
- **Comprobación acotada:** las 25 pruebas funcionales existentes de C2 aprobadas en un único archivo. Se ampliaron comprobaciones de suma/división, propósito y textos anteriores/posteriores a revelar las cargas, manteniendo los casos de botones, datos, ayudas, foco y finalización. Sin suite completa, build de producción ni pruebas visuales/responsive. `git diff --check` sin errores.
- **Pendiente:** revisión del usuario dentro del juego. La limitación de prácticas tras necesitar ayuda en C2 sigue siendo una tarea separada, aún sin implementar. E06 continúa abierto; la comprensión con estudiantes requiere un piloto.

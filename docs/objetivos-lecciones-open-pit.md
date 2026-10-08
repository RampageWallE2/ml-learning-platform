# E02 — Objetivos y evidencias de C1–C9

Fecha: 2026-10-06.

**Estado:** nueve fichas propuestas a partir de las actividades implementadas, para validación del usuario. No se modifican las clases ni se afirma que su aprendizaje esté validado.

## Público y forma de aprender

Esta ruta se dirige a personas que ya trabajan en minería o actividades relacionadas y tienen distinta familiaridad con las matemáticas, según [E01](alcance-educativo-open-pit.md). El contexto laboral da un propósito a la actividad; no sustituye la explicación de las unidades ni exige conocer todos los procesos de una mina.

Los objetivos se comprueban mediante acciones y opciones con gráficos, sin escritura obligatoria ni rapidez de cálculo mental. Se pueden consultar ejemplos y apoyos visuales. Resolver con ayuda es un resultado válido del recorrido, pero no equivale a demostrar comprensión independiente en un caso nuevo.

## Reglas comunes de precisión

- **Misión y aprendizaje son distintos:** ir a un área o hablar con un NPC permite acceder a la clase; no demuestra que se comprendió su idea matemática.
- **Cada área tiene sus datos:** C1–C2 usan toneladas de carga por camión; C3–C4, minutos; C5–C9, registros en toneladas por hora (t/h). Cada comparación se hace dentro de su área, con registros comparables, no entre procesos distintos.
- **Promedio no es una meta por defecto:** resume los registros. Solo se compara con una meta cuando el caso la define explícitamente.
- **Escalas y unidades importan:** dos gráficos comparados usan la misma escala. Los puntos uno sobre otro son registros repetidos, no cantidades que se suman por su altura.
- **Varianza descriptiva:** aquí se suman los cuadrados de las diferencias respecto al promedio y se divide entre el número de registros mostrados, incluidos los que tienen diferencia cero. No se enseña la estimación de una población a partir de una muestra ni la corrección que divide entre n − 1. Esta distinción es una nota para revisión docente, no vocabulario obligatorio para el participante.
- **Unidades:** diferencia, rango y desviación estándar conservan la unidad de los datos; la varianza usa esa unidad al cuadrado. Las casillas representan el cálculo, no toneladas físicas.
- **Límites de la conclusión:** los registros no prueban causas ni garantizan el siguiente turno. Menor dispersión no basta para afirmar mejor desempeño, cumplimiento de límites operativos o seguridad.
- **Informe y práctica separados:** el hallazgo final conserva los datos originales de cada parada. Un ejercicio nuevo no reemplaza la evidencia de la investigación.

## C1 — Dispersión de los datos · Carguío

- **Misión laboral:** ayudar al encargado a describir las cargas antes del relevo de turno.
- **Objetivo principal:** comparar todas las cargas de dos grupos y reconocer en cuál se parecen menos entre sí, sin confundir cantidad transportada con variación.
- **Datos y unidades:** A: 98, 102, 100, 101, 99 t; B: 82, 116, 95, 111, 96 t. En la primera práctica, C: 110, 111, 112 t frente a D: 90, 100, 110 t. Cada punto representa un camión.
- **Confusión que debe aclarar:** «el grupo con la carga mayor, o con más camiones, tiene necesariamente más variación».
- **Evidencia observable:** elegir B en la comparación inicial y, en la práctica, D y la explicación basada en todas sus cargas. Reconocer que C llega a una carga mayor que D, pero sus tres cargas se parecen más. No exigir calcular rango, promedio ni varianza en esta clase.
- **Aporte al informe:** «En B las cargas fueron más diferentes entre sí». Se describe lo observado, no la calidad del trabajo ni su causa.

## C2 — Promedio y dispersión · Control de acarreo

- **Misión laboral:** revisar el resumen antes de preparar cargas para quienes reciben el material del siguiente turno.
- **Objetivo principal:** reconocer que dos promedios iguales no bastan para saber cuánto varían las cargas y pedir los registros necesarios antes de comparar.
- **Datos y unidades:** el ejemplo 90, 100, 110 t se resume como 300 ÷ 3 = 100 t por camión mediante un reparto imaginario. A: 98, 101, 100, 99, 102 t; B: 80, 120, 90, 110, 100 t. Ambos promedios son 100 t por camión.
- **Confusión que debe aclarar:** «si los promedios son iguales, todas las cargas se parecen igual» o «cada camión llevó el promedio».
- **Evidencia observable:** con solo los promedios, elegir que faltan datos y pedir cuánto llevó cada camión. Después de ver las cargas, identificar B y reconocer que ahora se puede comparar porque están los registros completos. En la práctica, distinguir cuándo faltan cargas y cuándo ya están disponibles. El reparto no cambia cargas reales.
- **Aporte al informe:** «Ambos promedios fueron 100 t por camión, pero B tuvo cargas más diferentes; el promedio solo no lo mostraba». Revisar qué ocurrió no equivale a conocer su causa.

## C3 — Cálculo del rango · Botadero

- **Misión laboral:** preparar un aviso de los tiempos observados para quienes organizan las llegadas del siguiente turno.
- **Objetivo principal:** identificar el tiempo menor y el mayor, obtener su diferencia y reconocerla como rango.
- **Datos y unidades:** cinco descargas del mismo tipo: 11, 12, 11, 18, 12 minutos. Menor: 11; mayor: 18; rango: 18 − 11 = 7 minutos.
- **Confusión que debe aclarar:** «el rango es el tiempo de la descarga más larga» o «todas las descargas duraron lo que indica el rango».
- **Evidencia observable:** seleccionar ambos extremos, elegir la diferencia correcta y, con otros datos, elegir que esa diferencia es la separación entre la descarga más corta y la más larga. Si se usa la línea de minutos, contar los espacios entre marcas, no las marcas.
- **Aporte al informe:** «Las descargas observadas duraron de 11 a 18 minutos; hubo 7 minutos de separación». Esto no establece cuánto durarán las siguientes ni explica por qué hubo diferencias.

## C4 — Límites del rango · Taller

- **Misión laboral:** comprobar una afirmación del informe antes de usarla para organizar revisiones.
- **Objetivo principal:** reconocer que dos grupos con el mismo rango pueden tener sus tiempos repetidos de forma distinta y señalar una evidencia concreta.
- **Datos y unidades:** A: 8, 10, 10, 10, 12 minutos; B: 8, 8, 10, 12, 12 minutos. Ambos rangos son 4 minutos. El experimento mueve dos tiempos de 10 de una copia de A a 8 y 12; no modifica el original.
- **Confusión que debe aclarar:** «con el mismo rango, cada tiempo se repite igual» o «si el rango no cambia, ningún dato cambió».
- **Evidencia observable:** contar tres revisiones de 10 minutos en A frente a una en B; explorar la copia y explicar que el rango permanece porque los extremos siguen en 8 y 12. En la práctica, corregir la afirmación y elegir una diferencia de frecuencias real. La predicción inicial es una idea por comprobar, no una respuesta que deba acertarse para aprender.
- **Aporte al informe:** «El rango es igual, pero los tiempos no se repiten igual; también hay que mirar los demás registros». No se identifica al equipo que trabaja mejor ni una causa.

## C5 — Desviación respecto al promedio · ROM / chancado

- **Misión laboral:** describir cuánto material entró en cada hora, no solo el promedio de las cuatro.
- **Objetivo principal:** leer cuánto está un registro por debajo, por encima o exactamente en el promedio, distinguiendo el lado de la separación.
- **Datos y unidades:** 80, 80, 120, 120 t/h; promedio de 100 t/h. Diferencias: −20, −20, +20, +20 t/h. En la primera práctica, 80, 100, 110, 110 t/h permiten comprobar también la diferencia cero.
- **Confusión que debe aclarar:** «un número mayor está necesariamente más lejos del promedio» o «el signo negativo es una distancia negativa».
- **Evidencia observable:** reconocer que 80 y 120 están a la misma separación de 100, en lados distintos; elegir lecturas correctas para tres registros de práctica, incluido uno igual al promedio; seleccionar un aviso de lo observado sin afirmar que todas las horas fueron 100 ni que una máquina falló. Las palabras preceden a los signos.
- **Aporte al informe:** «Dos horas estuvieron 20 t/h por debajo del promedio y dos, 20 t/h por encima». Aquí 100 t/h es un promedio, no una meta de producción.

## C6 — Cálculo de la varianza · Molino SAG

- **Misión laboral:** resumir las diferencias de las cuatro horas con una medida que use todos los registros.
- **Objetivo principal:** seguir y aplicar el cálculo de la varianza: obtener las diferencias, multiplicar cada una por sí misma, sumar y dividir entre todos los registros.
- **Datos y unidades:** 98, 100, 100, 102 t/h; promedio 100. Diferencias −2, 0, 0, +2; cuadrados 4, 0, 0, 4; suma 8; varianza 8 ÷ 4 = 2 (t/h)². La copia tiene ocho registros y suma 16, pero 16 ÷ 8 sigue dando 2.
- **Confusión que debe aclarar:** «si las diferencias suman cero, todos los registros fueron iguales» o «más casillas en total siempre significa mayor varianza».
- **Evidencia observable:** reconocer que las diferencias con signo se compensan; formar y leer el cuadrado; distinguir total de casillas y promedio por registro. En la práctica, resolver un cuadrado, reconocer que repetir todos los datos en una copia conserva la varianza descriptiva y seleccionar su valor numérico. También cuentan los registros con cero casillas; duplicar la copia no crea nuevas mediciones.
- **Aporte al informe:** «Promedio de 100 t/h y varianza de 2 (t/h)²». No significa una distancia de 2 t/h ni explica causas. El peso mayor de diferencias grandes se muestra como apoyo, no como otra meta principal.

## C7 — Comparación de varianzas · Bolas e hidrociclones

- **Misión laboral:** comprobar el informe que afirma que dos períodos variaron igual porque tienen el mismo promedio y rango.
- **Objetivo principal:** calcular y comparar las varianzas de dos períodos para detectar una diferencia que promedio y rango no muestran.
- **Datos y unidades:** A: 97, 100, 100, 100, 100, 103 t/h; B: 97, 97, 100, 100, 103, 103 t/h. Ambos promedios son 100 t/h y ambos rangos, 6 t/h. Varianzas: A, 18 ÷ 6 = 3; B, 36 ÷ 6 = 6 (t/h)².
- **Confusión que debe aclarar:** «igual promedio e igual rango implican igual variación» o «menor varianza demuestra mejor trabajo».
- **Evidencia observable:** con los cuadrados y totales visibles, elegir ambas varianzas y el aviso de que B varió más. Incluir los registros de cero casillas en los divisores. Justificar la comparación con los valores y los puntos, no con la letra del período ni con una opinión operativa. La predicción inicial no se penaliza.
- **Aporte al informe:** «A y B tuvieron el mismo promedio y rango, pero sus varianzas fueron 3 y 6 (t/h)²». La varianza resume al grupo; no afirma que cada registro de B esté más lejos ni que A trabaje mejor.

## C8 — Desviación estándar · Flotación

- **Misión laboral:** preparar un aviso con una medida de variación expresada en toneladas por hora.
- **Objetivo principal:** obtener la desviación estándar como raíz de la varianza e interpretarla alrededor del promedio, sin confundirla con una distancia de todos los registros.
- **Datos y unidades:** 96, 100, 100, 100, 102, 102 t/h; promedio 100 t/h; varianza 4 (t/h)²; raíz √4 = 2 t/h. La franja de una desviación estándar a cada lado va de 98 a 102 t/h. El segundo ejemplo usa 98, 98, 98, 102, 102, 102 t/h, con el mismo promedio y desviación estándar.
- **Confusión que debe aclarar:** «la varianza de 4 (t/h)² equivale a 4 t/h» o «todos los datos deben estar dentro de esa franja».
- **Evidencia observable:** elegir 2 como lado del cuadrado que representa la varianza del grupo; identificar 96 fuera de la franja; reconocer los bordes como dentro y que en el segundo ejemplo están todos dentro. Mantener la misma escala al comparar. Seleccionar el aviso correcto al volver a los registros originales. La raíz no es el promedio de las distancias sin signo.
- **Aporte al informe:** «Desviación estándar de 2 t/h; 96 t/h quedó fuera de la franja de 98 a 102». La franja no es un límite de seguridad ni una banda que deba contener un porcentaje fijo; estar fuera no demuestra trabajo incorrecto.

## C9 — Promedio, dispersión y metas · Espesadores

- **Misión laboral:** cerrar el informe con un ejemplo para comparar el siguiente turno y una investigación pendiente, sin prescribir ajustes.
- **Objetivo principal:** tomar una decisión considerando una meta explícita para el promedio junto con la dispersión, reconociendo los límites de los datos.
- **Datos y unidades:** meta de ejemplo: promedio de 100 t/h. A: seis registros de 80 t/h; promedio 80, desviación estándar 0. B: 98, 98, 98, 102, 102, 102 t/h; promedio 100, desviación estándar 2. En la comprobación adicional, A tiene 99 y 101 tres veces cada uno: promedio 100 y desviación estándar 1; B conserva promedio 100 y desviación estándar 2.
- **Confusión que debe aclarar:** «variar menos siempre es mejor» o «cumplir la meta del promedio exige que cada registro sea igual a la meta».
- **Evidencia observable:** identificar que A varió menos, pero B cumplió la meta; elegir B como ejemplo y revisar por qué A quedó bajo la meta antes de cambiar ajustes. En el caso nuevo obligatorio, donde ambos promedios cumplen, elegir A por su menor desviación estándar siguiendo la regla explícita de ese caso, no como una regla universal de operación. Las medidas ya están calculadas: aquí se evalúa su interpretación conjunta.
- **Aporte al informe:** «Usaremos B como ejemplo para comparar el siguiente turno; investigaremos por qué A quedó bajo la meta y los límites permitidos antes de cambiar ajustes». Conservar los datos originales de espesadores, sin reemplazarlos con la comprobación adicional ni mezclar cifras de otras áreas.

## Qué queda por comprobar o corregir

1. **C2:** observar un reparto y leer un cálculo explicado no demuestra calcular el promedio de manera autónoma. Ese resultado no se añade como requisito de cierre de C2 sin una actividad aprobada; E03 debe comprobar lo que sí se declaró como objetivo.
2. **C6:** hay varias exploraciones antes del cálculo final. El objetivo principal sigue siendo construir la varianza, no memorizar todas las explicaciones secundarias. Su ritmo y carga de lectura deben observarse en el piloto antes de decidir una reorganización.
3. **Ayudas:** la subtarea de E06 del 2026-10-06 ya limita a una la práctica adicional en C1–C9. Resolverla con apoyo permite continuar indicando «Completaste con ayuda», sin saltar las respuestas obligatorias ni afirmar dominio independiente. Queda validar el ritmo y la comprensión en el juego y el piloto. No se crea un historial de dominio en el servidor.
4. **C9:** su comprobación adicional verifica aplicar una regla explícita a otros datos, no descubrir por sí sola una política de operación minera. El resumen de la ruta tampoco evalúa individualmente todos los objetivos anteriores; E03 debe cubrir las ideas elegidas sin convertir el cierre en otro examen largo.
5. **E03, E07 y E08:** distinguir respuesta con apoyo, aplicación a datos nuevos y simple finalización. El piloto debe incluir personas del público laboral confirmado. No fijar tiempos rígidos ni declarar eficacia educativa antes de observar el recorrido real.

## Fuentes internas y comprobación de esta ficha

Se revisaron el [catálogo activo](../frontend/src/app/features/world/lessons/lesson-catalog.ts), los diálogos `lesson-01-loading.data.ts` a `lesson-09-thickeners.data.ts` de la [carpeta de datos](../frontend/src/app/features/world/lessons/data), los componentes y los datos de estado de las nueve clases activas. No se incorporan los ejercicios de otros escenarios que no están registrados en el catálogo.

Se recalcularon los ejemplos citados: promedios, extremos, diferencias, cuadrados y unidades; la copia de C6; las varianzas de C7; los dos ejemplos de C8; y los casos original y adicional de C9. Esto es una revisión documental y numérica, no una prueba de aprendizaje ni una ejecución del juego.

Se conserva el orden C1–C9, los datos y todos los controles. No se modifican código, interfaces, almacenamiento, mapas ni backend. Las fichas deben ser validadas por el usuario antes de marcar E02 cerrado o convertirlas en nuevas exigencias para las actividades.

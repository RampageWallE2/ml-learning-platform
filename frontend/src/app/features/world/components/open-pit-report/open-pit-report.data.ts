import { LESSON_NAMES } from '../../lessons/lesson-catalog';
import { c1Groups } from '../../lessons/lesson-01-loading/lesson-01-loading.state';
import { C2_TURNS } from '../../lessons/lesson-02-ramp/lesson-02-ramp.state';
import { C3_TRIPS } from '../../lessons/lesson-03-haulage/lesson-03-haulage.state';
import {
  C4_WORKSHOP_RECORDS, C5_CRUSHING_RECORDS, C6_SAG_RECORDS, C7_BALLS_RECORDS, C9_THICKENERS_RECORDS,
} from '../../lessons/data/open-pit-original-records';
import { C8_ORIGINAL } from '../../lessons/lesson-08-flotation/lesson-08-flotation.state';

export type ReportLessonId = 'lesson-01' | 'lesson-02' | 'lesson-03' | 'lesson-04' | 'lesson-05'
  | 'lesson-06' | 'lesson-07' | 'lesson-08' | 'lesson-09';
type LoadSeries = Readonly<{ label: string; values: readonly number[] }>;
type LoadGraph = Readonly<{ kind: 'loads'; series: readonly LoadSeries[]; mean: number | null }>;
type RangeGraph = Readonly<{ kind: 'range'; values: readonly number[]; min: number; max: number; range: number }>;
type WorkshopGraph = Readonly<{
  kind: 'workshop'; series: readonly Readonly<LoadSeries & { range: number }>[];
  min: number; max: number; ticks: readonly number[];
}>;
type DeviationGraph = Readonly<{
  kind: 'deviations'; values: readonly number[]; mean: number; min: number; max: number; ticks: readonly number[];
}>;
type VarianceGraph = Readonly<{
  kind: 'variance'; values: readonly number[]; mean: number; squares: readonly number[]; sum: number; variance: number;
}>;
type ComparisonSeries = Readonly<LoadSeries & {
  mean: number; range: number; squareSum: number; variance: number; standardDeviation: number;
}>;
type ComparisonGraph = Readonly<{
  kind: 'variance-comparison' | 'goal-comparison'; series: readonly ComparisonSeries[];
  min: number; max: number; ticks: readonly number[]; goal: number | null;
}>;
type StandardDeviationGraph = Readonly<{
  kind: 'standard-deviation'; values: readonly number[]; mean: number; variance: number;
  standardDeviation: number; lower: number; upper: number; min: number; max: number; ticks: readonly number[];
}>;
export type OpenPitReportNote = Readonly<{
  lessonId: ReportLessonId;
  number: number;
  title: string;
  area: string;
  finding: string;
  reminder: string;
  graph: LoadGraph | RangeGraph | WorkshopGraph | DeviationGraph | VarianceGraph | ComparisonGraph | StandardDeviationGraph;
}>;

const dischargeTimes = C3_TRIPS.map(record => record.time);
const shortest = Math.min(...dischargeTimes);
const longest = Math.max(...dischargeTimes);
const meanLoad = C2_TURNS[0].values.reduce((sum, value) => sum + value, 0) / C2_TURNS[0].values.length;
const workshopSeries = C4_WORKSHOP_RECORDS.map(group => ({
  label: group.name, values: group.values, range: Math.max(...group.values) - Math.min(...group.values),
}));
const workshopTimes = C4_WORKSHOP_RECORDS.flatMap(group => group.values);
const crushingMean = C5_CRUSHING_RECORDS.reduce((sum, value) => sum + value, 0) / C5_CRUSHING_RECORDS.length;
const sagMean = C6_SAG_RECORDS.reduce((sum, value) => sum + value, 0) / C6_SAG_RECORDS.length;
const sagSquares = C6_SAG_RECORDS.map(value => (value - sagMean) ** 2);
const sagSum = sagSquares.reduce((sum, value) => sum + value, 0);
const sagVariance = sagSum / C6_SAG_RECORDS.length;

function describeRecords(label: string, values: readonly number[]): ComparisonSeries {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squareSum = values.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const variance = squareSum / values.length;
  return { label, values, mean, squareSum, variance, standardDeviation: Math.sqrt(variance),
    range: Math.max(...values) - Math.min(...values) };
}

const ballsSeries = C7_BALLS_RECORDS.map((values, index) => describeRecords('Período ' + (index === 0 ? 'A' : 'B'), values));
const flotation = describeRecords('Flotación', C8_ORIGINAL);
const thickenerSeries = [describeRecords('Período A', C9_THICKENERS_RECORDS.A), describeRecords('Período B', C9_THICKENERS_RECORDS.B)];

/** Only original cases: practice rounds never replace the investigation notes. */
export const OPEN_PIT_REPORT_NOTES: readonly OpenPitReportNote[] = [
  {
    lessonId: 'lesson-01', number: 1, title: LESSON_NAMES['lesson-01'], area: 'Carguío',
    finding: 'En el grupo B las cargas fueron más diferentes entre sí.',
    reminder: 'Mirar una sola carga no describe todo el grupo.',
    graph: {
      kind: 'loads', mean: null,
      series: c1Groups('compare', 0).map(group => ({ label: 'Grupo ' + group.name, values: group.loads })),
    },
  },
  {
    lessonId: 'lesson-02', number: 2, title: LESSON_NAMES['lesson-02'], area: 'Control de acarreo',
    finding: `Ambos turnos tuvieron un promedio de ${meanLoad} toneladas por camión, pero en B las cargas fueron más diferentes.`,
    reminder: 'El promedio solo no mostraba esas diferencias. Necesitábamos cuánto llevó cada camión.',
    graph: {
      kind: 'loads', mean: meanLoad,
      series: C2_TURNS.map(turn => ({ label: 'Turno ' + turn.id, values: turn.values })),
    },
  },
  {
    lessonId: 'lesson-03', number: 3, title: LESSON_NAMES['lesson-03'], area: 'Botadero',
    finding: `Las descargas observadas duraron de ${shortest} a ${longest} minutos: ${longest - shortest} minutos de diferencia.`,
    reminder: 'El rango describe estos tiempos. Las próximas descargas pueden durar distinto.',
    graph: { kind: 'range', values: dischargeTimes, min: shortest, max: longest, range: longest - shortest },
  },
  {
    lessonId: 'lesson-04', number: 4, title: LESSON_NAMES['lesson-04'], area: 'Taller',
    finding: `Ambos rangos fueron de ${workshopSeries[0].range} minutos. En A hubo ${workshopSeries[0].values.filter(value => value === 10).length} revisiones de 10 minutos y en B, ${workshopSeries[1].values.filter(value => value === 10).length}.`,
    reminder: 'El rango solo usa el tiempo menor y el mayor. Para organizar las revisiones, también necesitamos los demás tiempos.',
    graph: {
      kind: 'workshop', series: workshopSeries,
      min: Math.min(...workshopTimes), max: Math.max(...workshopTimes), ticks: [8, 9, 10, 11, 12],
    },
  },
  {
    lessonId: 'lesson-05', number: 5, title: LESSON_NAMES['lesson-05'], area: 'ROM / chancado',
    finding: `El promedio fue ${crushingMean} t/h. Dos horas estuvieron ${crushingMean - Math.min(...C5_CRUSHING_RECORDS)} t/h por debajo y dos, ${Math.max(...C5_CRUSHING_RECORDS) - crushingMean} t/h por encima.`,
    reminder: 'El promedio no fue el valor de cada hora ni una meta de producción. Estos registros no demuestran una falla.',
    graph: {
      kind: 'deviations', values: C5_CRUSHING_RECORDS, mean: crushingMean,
      min: Math.min(...C5_CRUSHING_RECORDS), max: Math.max(...C5_CRUSHING_RECORDS), ticks: [80, 90, 100, 110, 120],
    },
  },
  {
    lessonId: 'lesson-06', number: 6, title: LESSON_NAMES['lesson-06'], area: 'Molino SAG',
    finding: `El promedio fue ${sagMean} t/h. La varianza de los cuatro registros fue ${sagVariance} (t/h)².`,
    reminder: `Contamos los cuatro registros, incluso los que están en el promedio. ${sagVariance} (t/h)² no significa una separación de ${sagVariance} t/h.`,
    graph: { kind: 'variance', values: C6_SAG_RECORDS, mean: sagMean, squares: sagSquares, sum: sagSum, variance: sagVariance },
  },
  {
    lessonId: 'lesson-07', number: 7, title: LESSON_NAMES['lesson-07'], area: 'Molino de bolas / ciclones',
    finding: `Ambos períodos tuvieron promedio ${ballsSeries[0].mean} t/h y rango ${ballsSeries[0].range} t/h. B varió más: su varianza fue ${ballsSeries[1].variance}, frente a ${ballsSeries[0].variance} (t/h)² de A.`,
    reminder: 'El mismo promedio y rango pueden ocultar diferencias. Menor varianza no demuestra que A trabajó mejor.',
    graph: { kind: 'variance-comparison', series: ballsSeries, min: 97, max: 103, ticks: [97, 100, 103], goal: null },
  },
  {
    lessonId: 'lesson-08', number: 8, title: LESSON_NAMES['lesson-08'], area: 'Flotación',
    finding: `La raíz de la varianza ${flotation.variance} es ${flotation.standardDeviation}. La desviación estándar fue ${flotation.standardDeviation} t/h; el registro de 96 quedó fuera de la franja ${flotation.mean - flotation.standardDeviation}–${flotation.mean + flotation.standardDeviation} t/h.`,
    reminder: 'La franja ayuda a leer los datos: no es un límite de seguridad. Estar fuera no demuestra un mal trabajo ni predice las próximas horas.',
    graph: {
      kind: 'standard-deviation', values: C8_ORIGINAL, mean: flotation.mean, variance: flotation.variance,
      standardDeviation: flotation.standardDeviation,
      lower: flotation.mean - flotation.standardDeviation, upper: flotation.mean + flotation.standardDeviation,
      min: 96, max: 102, ticks: [96, 98, 100, 102],
    },
  },
  {
    lessonId: 'lesson-09', number: 9, title: LESSON_NAMES['lesson-09'], area: 'Espesadores',
    finding: `A varió menos, pero su promedio fue ${thickenerSeries[0].mean} t/h. B alcanzó la meta de promedio: ${C9_THICKENERS_RECORDS.goal} t/h.`,
    reminder: 'Usar B como referencia y revisar qué ocurrió en A. Antes de cambiar ajustes, hacen falta las causas y los límites del equipo. Estos datos no garantizan el resultado del próximo turno.',
    graph: {
      kind: 'goal-comparison', series: thickenerSeries, goal: C9_THICKENERS_RECORDS.goal,
      min: 80, max: 110, ticks: [80, 90, 100, 110],
    },
  },
];

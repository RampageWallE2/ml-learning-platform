export type PopulationStatistics = Readonly<{
  mean: number;
  deviations: readonly number[];
  squares: readonly number[];
  squareSum: number;
  variance: number;
  standardDeviation: number;
}>;

/** Unrounded calculations for the lessons' finite, non-empty datasets. */
export function calculateMean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateRange(values: readonly number[]): number {
  return Math.max(...values) - Math.min(...values);
}

/** Describe all supplied records: divide by n, not the sample divisor n - 1. */
export function calculatePopulationStatistics(values: readonly number[]): PopulationStatistics {
  const mean = calculateMean(values);
  const deviations = values.map((value) => value - mean);
  const squares = deviations.map((deviation) => deviation ** 2);
  const squareSum = squares.reduce((sum, square) => sum + square, 0);
  const variance = squareSum / values.length;
  return {
    mean,
    deviations,
    squares,
    squareSum,
    variance,
    standardDeviation: Math.sqrt(variance),
  };
}

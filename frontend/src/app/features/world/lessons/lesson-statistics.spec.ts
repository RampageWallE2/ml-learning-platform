import {
  C4_WORKSHOP_RECORDS,
  C5_CRUSHING_RECORDS,
  C6_SAG_RECORDS,
  C7_BALLS_RECORDS,
  C9_THICKENERS_RECORDS,
} from './data/open-pit-original-records';
import { C8_ORIGINAL, C8_PRACTICE } from './lesson-08-flotation/lesson-08-flotation.state';
import { calculateMean, calculatePopulationStatistics, calculateRange } from './lesson-statistics';

describe('shared lesson statistics', () => {
  it('uses the population divisor rather than the sample divisor', () => {
    const stats = calculatePopulationStatistics([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(stats.mean).toBe(5);
    expect(stats.deviations).toEqual([-3, -1, -1, -1, 0, 0, 2, 4]);
    expect(stats.squares).toEqual([9, 1, 1, 1, 0, 0, 4, 16]);
    expect(stats.squareSum).toBe(32);
    expect(stats.variance).toBe(4);
    expect(stats.standardDeviation).toBe(2);
  });

  it('does not round the mean, variance or standard deviation', () => {
    expect(calculateMean([90, 100, 111])).toBe(301 / 3);
    const stats = calculatePopulationStatistics([90, 100, 110]);
    expect(stats.squareSum).toBe(200);
    expect(stats.variance).toBe(200 / 3);
    expect(stats.standardDeviation).toBe(Math.sqrt(200 / 3));
  });

  it('handles unsorted negative and fractional records', () => {
    const values = [0.5, -1.5, -0.5];
    expect(calculateRange(values)).toBe(2);
    const stats = calculatePopulationStatistics(values);
    expect(stats.mean).toBe(-0.5);
    expect(stats.deviations).toEqual([1, -1, 0]);
    expect(stats.squareSum).toBe(2);
    expect(stats.variance).toBe(2 / 3);
  });

  it.each([[80], [80, 80, 80, 80]])(
    'reports zero dispersion for constant records %j',
    (...values: number[]) => {
      const stats = calculatePopulationStatistics(values);
      expect(stats.mean).toBe(80);
      expect(calculateRange(values)).toBe(0);
      expect(stats.squareSum).toBe(0);
      expect(stats.variance).toBe(0);
      expect(stats.standardDeviation).toBe(0);
    },
  );

  it('keeps variance unchanged when C6 duplicates every record', () => {
    const original = calculatePopulationStatistics(C6_SAG_RECORDS);
    const copy = calculatePopulationStatistics(C6_SAG_RECORDS.flatMap((value) => [value, value]));
    expect(copy.mean).toBe(original.mean);
    expect(copy.squareSum).toBe(original.squareSum * 2);
    expect(copy.variance).toBe(original.variance);
    expect(copy.standardDeviation).toBe(original.standardDeviation);
  });

  it('does not mutate input or share result arrays between calculations', () => {
    const values = Object.freeze([98, 100, 100, 102]);
    const first = calculatePopulationStatistics(values);
    const second = calculatePopulationStatistics(values);
    expect(values).toEqual([98, 100, 100, 102]);
    expect(first).toEqual(second);
    expect(first.deviations).not.toBe(second.deviations);
    expect(first.squares).not.toBe(second.squares);
    expect(calculateRange(values)).toBe(4);
    expect(calculateMean(values)).toBe(100);
  });

  const cases = [
    ...C4_WORKSHOP_RECORDS.map((group) => ({
      name: 'C4 ' + group.id,
      values: group.values,
    })),
    { name: 'C5', values: C5_CRUSHING_RECORDS },
    { name: 'C6', values: C6_SAG_RECORDS },
    ...C7_BALLS_RECORDS.map((values, index) => ({
      name: 'C7 period ' + index,
      values,
    })),
    { name: 'C8 original', values: C8_ORIGINAL },
    ...C8_PRACTICE.map((values, index) => ({
      name: 'C8 practice ' + index,
      values,
    })),
    { name: 'C9 A', values: C9_THICKENERS_RECORDS.A },
    { name: 'C9 B', values: C9_THICKENERS_RECORDS.B },
  ];

  it.each(cases)('preserves the previous formulas for $name', ({ values }) => {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const deviations = values.map((value) => value - mean);
    const squares = deviations.map((value) => value * value);
    const squareSum = squares.reduce((sum, value) => sum + value, 0);
    // Independent pre-extraction formulas, not expected values from the helper.
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    expect(calculateMean(values)).toBe(mean);
    expect(calculateRange(values)).toBe(Math.max(...values) - Math.min(...values));
    expect(calculatePopulationStatistics(values)).toEqual({
      mean,
      deviations,
      squares,
      squareSum,
      variance,
      standardDeviation: Math.sqrt(variance),
    });
  });
});

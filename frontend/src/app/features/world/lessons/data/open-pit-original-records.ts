/** Original investigation cases only; practice and experimental copies stay in each lesson. */
export type OpenPitRecordGroup = Readonly<{ id: string; name: string; values: readonly number[] }>;

export const C4_WORKSHOP_RECORDS: readonly OpenPitRecordGroup[] = [
  { id: 'A', name: 'Equipo A', values: [8, 10, 10, 10, 12] },
  { id: 'B', name: 'Equipo B', values: [8, 8, 10, 12, 12] },
];

export const C5_CRUSHING_RECORDS = [80, 80, 120, 120] as const;
export const C6_SAG_RECORDS = [98, 100, 100, 102] as const;

export const C7_BALLS_RECORDS = [
  [97, 100, 100, 100, 100, 103],
  [97, 97, 100, 100, 103, 103],
] as const;

export const C9_THICKENERS_RECORDS = {
  goal: 100,
  A: [80, 80, 80, 80, 80, 80],
  B: [98, 98, 98, 102, 102, 102],
} as const;

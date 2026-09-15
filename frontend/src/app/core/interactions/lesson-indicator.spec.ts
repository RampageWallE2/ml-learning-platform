import {
  getLessonIndicatorCopy,
  getLessonInteractionCopy,
  getLessonLabel,
  getLessonStatus,
} from './lesson-indicator';

describe('lesson indicators', () => {
  const progress = {
    currentLessonId: 'lesson-02',
    completedLessonIds: ['lesson-01'],
  } as const;

  it('derives the visible class number from the existing lesson id', () => {
    expect(getLessonLabel('lesson-01')).toBe('CLASE 1');
    expect(getLessonLabel('lesson-08')).toBe('CLASE 8');
    expect(getLessonLabel('custom')).toBe('CLASE');
  });

  it('prioritizes completed lessons and identifies the next lesson', () => {
    expect(getLessonStatus('lesson-01', progress)).toBe('completed');
    expect(getLessonStatus('lesson-02', progress)).toBe('current');
    expect(getLessonStatus('lesson-03', progress)).toBe('pending');
  });

  it('builds concise permanent and proximity messages', () => {
    expect(getLessonIndicatorCopy('lesson-02', 'current'))
      .toBe('SIGUIENTE\nCLASE 2\n▼');
    expect(getLessonInteractionCopy('lesson-01', 'completed'))
      .toContain('Pulsa E para repetir');
  });
});

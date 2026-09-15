import { ProgressService } from './progress.service';

describe('ProgressService — Open Pit MVP', () => {
  it('keeps every registered class available during development', () => {
    const progress = new ProgressService();
    expect(progress.zoneProgress()[0].totalLessons).toBe(3);
    expect(progress.currentObjective()).toContain('encargado del carguío');
    expect(progress.isLessonAvailable('lesson-01')).toBe(true);
    expect(progress.isLessonAvailable('lesson-02')).toBe(true);
    expect(progress.isLessonAvailable('lesson-03')).toBe(true);
    expect(progress.isLessonAvailable('unknown-lesson')).toBe(false);

    progress.completeLesson('lesson-02');
    expect(progress.isLessonCompleted('lesson-02')).toBe(true);
    expect(progress.currentObjective()).toContain('encargado del carguío');

    progress.completeLesson('lesson-01');
    expect(progress.currentObjective()).toContain('acarreo');
    progress.completeLesson('lesson-01');
    expect(progress.zoneProgress()[0].completedLessons).toBe(2);
  });
});

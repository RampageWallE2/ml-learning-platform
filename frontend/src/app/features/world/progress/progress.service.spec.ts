import { ProgressService } from './progress.service';

describe('ProgressService — Open Pit MVP', () => {
  it('tracks three classes and moves the objective to the ramp only after completing loading', () => {
    const progress = new ProgressService();
    expect(progress.zoneProgress()[0].totalLessons).toBe(3);
    expect(progress.currentObjective()).toContain('encargado del carguío');
    progress.completeLesson('lesson-02');
    expect(progress.isLessonCompleted('lesson-02')).toBe(false);
    progress.completeLesson('lesson-01');
    expect(progress.currentObjective()).toContain('encargado del control');
    expect(progress.isLessonAvailable('lesson-02')).toBe(true);
    expect(progress.isLessonAvailable('lesson-01')).toBe(true);
    progress.completeLesson('lesson-01');
    expect(progress.zoneProgress()[0].completedLessons).toBe(1);
  });
});

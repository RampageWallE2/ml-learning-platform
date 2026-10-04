import { LEARNING_ZONES, LESSON_DEFINITIONS } from './lesson-catalog';

describe('lesson catalog', () => {
  it('keeps every registered lesson id unique and connected to its definition', () => {
    const lessons = LEARNING_ZONES.flatMap(zone => zone.lessons);
    const lessonIds = lessons.map(lesson => lesson.lessonId);

    expect(new Set(lessonIds).size).toBe(lessonIds.length);

    for (const lesson of lessons) {
      expect(lesson.definition.id).toBe(lesson.lessonId);
      expect(LESSON_DEFINITIONS[lesson.lessonId]).toBe(lesson.definition);
    }
  });

  it('registers the nine implemented Open Pit lessons in order', () => {
    expect(LEARNING_ZONES).toHaveLength(1);
    expect(LEARNING_ZONES[0]?.lessons.map(lesson => lesson.lessonId)).toEqual([
      'lesson-01',
      'lesson-02',
      'lesson-03',
      'lesson-04',
      'lesson-05',
      'lesson-06',
      'lesson-07',
      'lesson-08',
      'lesson-09',
    ]);
    expect(LESSON_DEFINITIONS['lesson-10']).toBeUndefined();
    expect(LESSON_DEFINITIONS['lesson-09'].steps[1]).toEqual({
      type: 'exercise', exerciseId: 'thickeners-final-report',
    });
    expect(LESSON_DEFINITIONS['lesson-08'].steps[1]).toEqual({
      type: 'exercise', exerciseId: 'flotation-standard-deviation',
    });
    expect(LESSON_DEFINITIONS['lesson-06'].steps[1]).toEqual({
      type: 'exercise', exerciseId: 'sag-build-variance',
    });
    expect(LESSON_DEFINITIONS['lesson-07'].steps[1]).toEqual({
      type: 'exercise', exerciseId: 'balls-apply-variance',
    });
  });
});

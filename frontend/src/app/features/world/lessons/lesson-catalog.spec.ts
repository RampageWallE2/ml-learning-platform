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

  it('registers only the three implemented Open Pit MVP lessons', () => {
    expect(LEARNING_ZONES).toHaveLength(1);
    expect(LEARNING_ZONES[0]?.lessons.map(lesson => lesson.lessonId)).toEqual([
      'lesson-01',
      'lesson-02',
      'lesson-03',
    ]);
  });
});

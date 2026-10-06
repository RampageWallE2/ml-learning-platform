import { TestBed } from '@angular/core/testing';
import { LEARNING_ZONES, LESSON_DEFINITIONS, LESSON_NAMES } from './lesson-catalog';
import { Lesson01Loading } from './lesson-01-loading/lesson-01-loading';
import { Lesson02Ramp } from './lesson-02-ramp/lesson-02-ramp';
import { Lesson03Haulage } from './lesson-03-haulage/lesson-03-haulage';
import { Lesson04Workshop } from './lesson-04-workshop/lesson-04-workshop';
import { Lesson05Crushing } from './lesson-05-crushing/lesson-05-crushing';
import { Lesson06Sag } from './lesson-06-sag/lesson-06-sag';
import { Lesson07Balls } from './lesson-07-balls/lesson-07-balls';
import { Lesson08Flotation } from './lesson-08-flotation/lesson-08-flotation';
import { Lesson09Thickeners } from './lesson-09-thickeners/lesson-09-thickeners';

describe('lesson catalog', () => {
  it('names the Open Pit lessons by their mathematical topic', () => {
    expect(LEARNING_ZONES[0].lessons.map(lesson => lesson.name)).toEqual([
      'Dispersión de los datos',
      'Promedio y dispersión',
      'Cálculo del rango',
      'Límites del rango',
      'Desviación respecto al promedio',
      'Cálculo de la varianza',
      'Comparación de varianzas',
      'Desviación estándar',
      'Promedio, dispersión y metas',
    ]);
    for (const zone of LEARNING_ZONES) {
      for (const lesson of zone.lessons) {
        expect(LESSON_NAMES[lesson.lessonId]).toBe(lesson.name);
      }
    }
  });

  it.each([
    ['lesson-01', Lesson01Loading],
    ['lesson-02', Lesson02Ramp],
    ['lesson-03', Lesson03Haulage],
    ['lesson-04', Lesson04Workshop],
    ['lesson-05', Lesson05Crushing],
    ['lesson-06', Lesson06Sag],
    ['lesson-07', Lesson07Balls],
    ['lesson-08', Lesson08Flotation],
    ['lesson-09', Lesson09Thickeners],
  ] as const)('uses the catalog name in the rendered heading of %s', (lessonId, component) => {
    const fixture = TestBed.createComponent<unknown>(component);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const title = root.querySelector('.lesson-header h2');
    expect(title?.textContent?.trim()).toBe(LESSON_NAMES[lessonId]);
    expect(root.querySelector('section')?.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(root.querySelector('.lesson-tag')?.textContent?.trim()).not.toBe(LESSON_NAMES[lessonId]);
  });

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

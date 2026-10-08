import {
  getLessonIndicatorCopy,
  getLessonInteractionCopy,
  getLessonLabel,
  getLessonPromptContent,
  getLessonStatus,
} from './lesson-indicator';
import { LESSON_NAMES } from '../../features/world/lessons/lesson-catalog';

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

  it('adds the shared mathematical topic to proximity messages for every available lesson', () => {
    for (const [lessonId, name] of Object.entries(LESSON_NAMES)) {
      expect(getLessonInteractionCopy(lessonId, 'pending'))
        .toBe(`${getLessonLabel(lessonId)}\n${name}\nPulsa E para iniciar`);
      expect(getLessonInteractionCopy(lessonId, 'current'))
        .toBe(`${getLessonLabel(lessonId)} · Siguiente\n${name}\nPulsa E para iniciar`);
      expect(getLessonInteractionCopy(lessonId, 'completed'))
        .toBe(`${getLessonLabel(lessonId)} · Completada\n${name}\nPulsa E para repetir`);
      expect(getLessonIndicatorCopy(lessonId, 'pending')).toBe(getLessonLabel(lessonId));
    }
  });

  it('keeps the existing proximity message for lessons without a registered topic', () => {
    expect(getLessonInteractionCopy('custom', 'pending')).toBe('CLASE\nPulsa E para iniciar');
    expect(getLessonInteractionCopy('lesson-99', 'completed'))
      .toBe('CLASE 99 · Completada\nPulsa E para repetir');
  });

  it('separates the topic, status and action and names the existing touch control', () => {
    expect(getLessonPromptContent('lesson-03', 'current')).toEqual({
      label: 'CLASE 3', status: 'Siguiente', topic: 'Cálculo del rango', action: '[E] · Iniciar',
    });
    expect(getLessonPromptContent('lesson-03', 'completed', true).action).toBe('Toca E · Repetir');
    expect(getLessonPromptContent('custom', 'pending').topic).toBe('Actividad');
  });
});

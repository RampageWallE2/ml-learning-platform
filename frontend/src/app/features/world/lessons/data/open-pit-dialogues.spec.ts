import { LEARNING_ZONES } from '../lesson-catalog';
import { OPEN_PIT_CLOSING } from './open-pit-closing.data';
import { OPEN_PIT_INTRO } from './open-pit-intro.data';
import { LESSON_03_HAULAGE } from './lesson-03-haulage.data';

describe('Open Pit — short narrative fragments', () => {
  it('keeps the nine exercises and route while naming each closing destination', () => {
    const lessons = LEARNING_ZONES.find((zone) => zone.id === 'zone-01')!.lessons;
    const route = [
      ['loading-spread', 'Control de acarreo (rampa)'],
      ['ramp-shift-regularity', 'Botadero de desmonte'],
      ['haulage-range', 'Taller de mantenimiento'],
      ['workshop-range-limits', 'ROM / chancado'],
      ['crushing-deviations', 'Molino SAG'],
      ['sag-build-variance', 'Molino de bolas e hidrociclones'],
      ['balls-apply-variance', 'Flotación'],
      ['flotation-standard-deviation', 'Espesadores'],
      ['thickeners-final-report', 'Centro de control'],
    ];
    expect(lessons).toHaveLength(route.length);
    for (const [index, lesson] of lessons.entries()) {
      const [intro, exercise, outro] = lesson.definition.steps;
      expect(lesson.definition.steps, lesson.lessonId).toHaveLength(3);
      expect(exercise, lesson.lessonId).toEqual({ type: 'exercise', exerciseId: route[index][0] });
      if (intro.type !== 'dialogue' || outro.type !== 'dialogue') {
        throw new Error(`${lesson.lessonId} must retain its introductory and closing dialogue.`);
      }
      expect(intro.dialogue.nextDestination, lesson.lessonId).toBeUndefined();
      expect(outro.dialogue.nextDestination, lesson.lessonId).toBe(route[index][1]);
      // These buttons close the lesson; the player still walks to the destination.
      expect(outro.dialogue.completionLabel, lesson.lessonId).toBe('Volver al mapa');
    }
  });

  it('distinguishes the intro transport from returning to the map after the investigation', () => {
    expect(OPEN_PIT_INTRO.nextDestination).toBe('Fondo del tajo');
    expect(OPEN_PIT_INTRO.completionLabel).toBe('Entrar al tajo');
    expect(OPEN_PIT_INTRO.messages.at(-1)?.text).toContain('Te llevo cerca');
    expect(OPEN_PIT_CLOSING.nextDestination).toBeUndefined();
    expect(OPEN_PIT_CLOSING.completionLabel).toBe('Volver al mapa');
  });

  it('keeps C3 findings after the exercise and distinguishes its task and reminders', () => {
    const [intro, exercise, outro] = LESSON_03_HAULAGE.steps;
    expect(exercise).toEqual({ type: 'exercise', exerciseId: 'haulage-range' });
    if (intro.type !== 'dialogue' || outro.type !== 'dialogue') {
      throw new Error('C3 must keep its introductory and closing dialogue.');
    }
    expect(intro.dialogue.messages.at(-1)?.kind).toBe('task');
    expect(intro.dialogue.messages.every((message) => !message.facts)).toBe(true);
    expect(outro.dialogue.messages[0].kind).toBe('finding');
    expect(outro.dialogue.messages[0].facts).toEqual([
      { label: 'Más corta', value: '11 min' },
      { label: 'Más larga', value: '18 min' },
      { label: 'Diferencia', value: '7 min' },
    ]);
    expect(outro.dialogue.messages[2].kind).toBe('reminder');
    expect(outro.dialogue.messages[3].text).toContain('no explican por qué');
    expect(outro.dialogue.messages.at(-1)?.kind).toBe('task');
  });

  it('keeps every fragment brief and self-contained without empty messages', () => {
    const lessons = LEARNING_ZONES.find((zone) => zone.id === 'zone-01')!.lessons;
    const dialogues = [
      OPEN_PIT_INTRO,
      ...lessons.flatMap((lesson) =>
        lesson.definition.steps.flatMap((step) =>
          step.type === 'dialogue' ? [step.dialogue] : [],
        ),
      ),
      OPEN_PIT_CLOSING,
    ];

    for (const dialogue of dialogues) {
      expect(dialogue.messages.length, dialogue.id).toBeGreaterThan(0);
      for (const [index, message] of dialogue.messages.entries()) {
        const context = `${dialogue.id}: fragment ${index + 1}`;
        expect(message.text.trim(), context).toBe(message.text);
        expect(message.text.length, context).toBeGreaterThan(0);
        expect(message.text.split(/\s+/u).length, context).toBeLessThanOrEqual(25);
        expect(message.text.length, context).toBeLessThanOrEqual(160);
        expect(message.text, context).toMatch(/[.!?]$/u);
        expect(message.name.trim().length, context).toBeGreaterThan(0);
      }
    }
  });
});

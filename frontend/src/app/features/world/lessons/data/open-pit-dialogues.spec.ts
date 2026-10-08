import { LEARNING_ZONES } from '../lesson-catalog';
import { OPEN_PIT_CLOSING } from './open-pit-closing.data';
import { OPEN_PIT_INTRO } from './open-pit-intro.data';

describe('Open Pit — short narrative fragments', () => {
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

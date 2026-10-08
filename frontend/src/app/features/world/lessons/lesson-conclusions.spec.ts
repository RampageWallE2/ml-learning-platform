import { OutputEmitterRef, Type, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Lesson01Loading } from './lesson-01-loading/lesson-01-loading';
import { Lesson02Ramp } from './lesson-02-ramp/lesson-02-ramp';
import { Lesson03Haulage } from './lesson-03-haulage/lesson-03-haulage';
import { Lesson04Workshop } from './lesson-04-workshop/lesson-04-workshop';
import { Lesson05Crushing } from './lesson-05-crushing/lesson-05-crushing';
import { Lesson06Sag } from './lesson-06-sag/lesson-06-sag';
import { Lesson07Balls } from './lesson-07-balls/lesson-07-balls';
import { Lesson08Flotation } from './lesson-08-flotation/lesson-08-flotation';
import { Lesson09Thickeners } from './lesson-09-thickeners/lesson-09-thickeners';

// These cases test presentation at the final stage. The existing lesson tests
// still verify how the learner reaches it and how original evidence is restored.
interface ConclusionView {
  stage: { set(value: 'success'): void };
  completed: OutputEmitterRef<void>;
  practiceHelped?: WritableSignal<boolean>;
  helped?: WritableSignal<boolean>;
  round?: WritableSignal<number>;
  practiceRound?: WritableSignal<number>;
}

const lessons: readonly {
  name: string;
  component: Type<ConclusionView>;
  action: string;
  measures: readonly string[];
}[] = [
  {
    name: 'C1',
    component: Lesson01Loading,
    action: 'Volver con el encargado',
    measures: ['Cargas más parecidas', 'Cargas más diferentes'],
  },
  {
    name: 'C2',
    component: Lesson02Ramp,
    action: 'Entregar recomendación',
    measures: ['100 t', '100 t'],
  },
  {
    name: 'C3',
    component: Lesson03Haulage,
    action: 'Entregar el aviso',
    measures: ['11 min', '18 min', '7 min'],
  },
  {
    name: 'C4',
    component: Lesson04Workshop,
    action: 'Entregar la corrección',
    measures: ['4 min', '4 min', '3', '1'],
  },
  {
    name: 'C5',
    component: Lesson05Crushing,
    action: 'Entregar el aviso',
    measures: ['100 t/h', '−20 t/h', '+20 t/h'],
  },
  {
    name: 'C6',
    component: Lesson06Sag,
    action: 'Entregar el hallazgo',
    measures: ['100 t/h', '2 (t/h)²'],
  },
  {
    name: 'C7',
    component: Lesson07Balls,
    action: 'Entregar el informe corregido',
    measures: ['100 t/h', '100 t/h', '6 t/h', '6 t/h', '3 (t/h)²', '6 (t/h)²'],
  },
  {
    name: 'C8',
    component: Lesson08Flotation,
    action: 'Entregar la explicación',
    measures: ['100 t/h', '2 t/h'],
  },
  {
    name: 'C9',
    component: Lesson09Thickeners,
    action: 'Entregar el informe',
    measures: ['80 t/h', '100 t/h', '0 t/h', '2 t/h'],
  },
];

describe('Lesson conclusions — shared reading hierarchy', () => {
  for (const guided of [false, true]) {
    it.each(lessons)(
      'shows $name original findings, visible cautions and one delivery action (guided: ' +
        guided +
        ')',
      ({ component, action, measures }) => {
        const fixture = TestBed.createComponent(component);
        const page = fixture.componentInstance;
        if (guided) {
          (page.practiceHelped ?? page.helped)!.set(true);
          (page.practiceRound ?? page.round)!.set(1);
        }
        page.stage.set('success');
        const completed = vi.fn();
        page.completed.subscribe(completed);
        fixture.detectChanges();
        const root = fixture.nativeElement as HTMLElement;
        const conclusion = root.querySelector<HTMLElement>('.lesson-conclusion')!;
        const title = conclusion.querySelector<HTMLElement>('.conclusion-header h3')!;
        expect(root.querySelectorAll('.lesson-conclusion')).toHaveLength(1);
        expect(conclusion.getAttribute('aria-labelledby')).toBe(title.id);
        expect(title.getAttribute('tabindex')).toBe('-1');
        expect(title.classList.contains('conclusion-title')).toBe(true);
        expect(title.textContent?.trim().length).toBeGreaterThan(0);
        expect(conclusion.querySelector('.conclusion-learning h4')?.textContent).toBe(
          'Qué aprendiste',
        );
        const reminder = conclusion.querySelector<HTMLElement>('.conclusion-reminder')!;
        expect(reminder.querySelector('h4')?.textContent).toBe('Recuerda');
        expect(reminder.querySelectorAll('li').length).toBeGreaterThan(0);
        expect(reminder.closest('details')).toBeNull();
        const values = Array.from(
          conclusion.querySelectorAll('.conclusion-facts dd, .conclusion-comparison td'),
        ).map((element) => element.textContent?.replace(/\s+/gu, ' ').trim());
        expect(values).toEqual(measures);
        expect(!!conclusion.querySelector('.conclusion-status')).toBe(guided);
        if (guided)
          expect(conclusion.querySelector('.conclusion-status')?.textContent).toContain(
            'Completaste con ayuda',
          );
        for (const detail of conclusion.querySelectorAll<HTMLDetailsElement>('details')) {
          expect(detail.open).toBe(false);
          expect(detail.querySelector(':scope > summary')).not.toBeNull();
        }
        const buttons = conclusion.querySelectorAll<HTMLButtonElement>('button');
        expect(buttons).toHaveLength(1);
        expect(buttons[0].type).toBe('button');
        expect(buttons[0].textContent).toContain(action);
        expect(completed).not.toHaveBeenCalled();
        buttons[0].click();
        buttons[0].click();
        expect(completed).toHaveBeenCalledOnce();
      },
    );
  }

  it('keeps the SAG calculation optional without hiding squared units or record counts', () => {
    const fixture = TestBed.createComponent(Lesson06Sag);
    fixture.componentInstance.stage.set('success');
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const detail = root.querySelector<HTMLDetailsElement>('.conclusion-details')!;
    expect(detail.open).toBe(false);
    expect(root.querySelector('.conclusion-reminder')?.textContent).toContain(
      'no es una distancia de 2 t/h',
    );
    expect(root.querySelectorAll('.conclusion-calculation li')).toHaveLength(4);
    expect(detail.textContent).toContain('4 registros');
    expect(detail.textContent).toContain('8 ÷ 4 = 2 (t/h)²');
  });
});

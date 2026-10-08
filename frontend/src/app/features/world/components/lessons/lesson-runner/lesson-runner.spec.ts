import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../../../../../core/auth/auth.service';
import { By } from '@angular/platform-browser';
import { Dialogue } from '../../dialogue/dialogue';
import { InteractionPanel } from '../../interaction-panel/interaction-panel';
import { Lesson01Loading } from '../../../lessons/lesson-01-loading/lesson-01-loading';
import { Lesson02Ramp } from '../../../lessons/lesson-02-ramp/lesson-02-ramp';
import { Lesson03Haulage } from '../../../lessons/lesson-03-haulage/lesson-03-haulage';
import { LessonRunner } from './lesson-runner';
import { Lesson04Workshop } from '../../../lessons/lesson-04-workshop/lesson-04-workshop';
import { Lesson05Crushing } from '../../../lessons/lesson-05-crushing/lesson-05-crushing';
import { Lesson06Sag } from '../../../lessons/lesson-06-sag/lesson-06-sag';
import { Lesson07Balls } from '../../../lessons/lesson-07-balls/lesson-07-balls';
import { Lesson08Flotation } from '../../../lessons/lesson-08-flotation/lesson-08-flotation';
import { Lesson09Thickeners } from '../../../lessons/lesson-09-thickeners/lesson-09-thickeners';
import { LEARNING_ZONES } from '../../../lessons/lesson-catalog';

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { user: signal(null) } }] });
});

function completeDialogue(dialogue: Dialogue): void {
  const messageCount = dialogue.dialogue().messages.length;

  for (let index = 0; index < messageCount; index += 1) {
    if (dialogue.isTyping()) {
      dialogue.next();
    }

    dialogue.next();
  }
}

describe('LessonRunner — shared modal focus', () => {
  it.each(LEARNING_ZONES[0].lessons.map(lesson => lesson.lessonId))(
    'keeps focus inside %s across introduction, activity and closing dialogue',
    async lessonId => {
      const fixture = TestBed.createComponent(LessonRunner);
      fixture.componentRef.setInput('lessonId', lessonId);
      fixture.detectChanges();
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      const panel = root.querySelector('[role="dialog"]')!;
      expect(document.activeElement).toBe(root.querySelector('.continue-button'));

      fixture.componentInstance.nextStep();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(root.querySelector('[role="dialog"]')).toBe(panel);
      expect(document.activeElement).toBe(root.querySelector('h2'));

      fixture.componentInstance.nextStep();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(root.querySelector('[role="dialog"]')).toBe(panel);
      expect(document.activeElement).toBe(root.querySelector('.continue-button'));
    },
  );
});

describe('LessonRunner — thickeners lesson', () => {
  it('requires C9 decisions, transfer, original report and closing dialogue before completion', async () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-09'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('terminar el informe');
    expect(introText).toContain('mismo lugar y dejando el mismo tiempo entre mediciones');
    expect(introText).toContain('condiciones parecidas');
    expect(introText).toContain('datos de espesadores, no de flotación');
    expect(introText).toContain('En este ejemplo, la meta');
    expect(introText).toContain('No exige que cada registro sea 100');
    completeDialogue(intro); fixture.detectChanges();
    await fixture.whenStable();
    const game = fixture.debugElement.query(By.directive(Lesson09Thickeners)).componentInstance as Lesson09Thickeners;
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('activity');
    game.choosePeriod('A'); game.continue(); game.choosePeriod('B'); game.continue();
    game.chooseRecommendation('reference'); game.continue(); game.finish();
    expect(done).not.toHaveBeenCalled(); expect(game.stage()).toBe('transfer-intro');
    game.startTransfer(); game.choosePeriod('A'); game.continue(); game.finish(); fixture.detectChanges();
    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const endText = end.dialogue().messages.map(message => message.text).join(' ');
    expect(endText).toContain('datos originales');
    expect(endText).toContain('A tuvo promedio de 80 t/h');
    expect(endText).toContain('desviación estándar de 2 t/h');
    expect(endText).toContain('Investigaremos por qué A quedó por debajo y los límites permitidos');
    expect(endText).toContain('no reemplazan los del informe');
    expect(endText).toContain('Variar menos no basta: también hay que revisar la meta.');
    completeDialogue(end); expect(done).toHaveBeenCalledExactlyOnceWith('lesson-09');
  });
});

describe('LessonRunner — flotation lesson', () => {
  it('runs C8 and its original-data closing before completing the lesson', async () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-08'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('Ya calculaste la varianza');
    expect(introText).toContain('siguiente turno');
    expect(introText).toContain('mismo lugar y dejando el mismo tiempo entre mediciones');
    expect(introText).toContain('No son los datos del molino');
    completeDialogue(intro); fixture.detectChanges();
    await fixture.whenStable();
    const game = fixture.debugElement.query(By.directive(Lesson08Flotation)).componentInstance as Lesson08Flotation;
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('activity');
    game.startRoot(); game.answerRoot(2); game.continueToReport(); game.finish();
    expect(game.stage()).toBe('checked'); expect(done).not.toHaveBeenCalled();
    game.continueToBand(); game.finish();
    expect(game.stage()).toBe('locate'); expect(done).not.toHaveBeenCalled();
    game.selectRecord(0); game.finish();
    expect(game.stage()).toBe('located'); expect(done).not.toHaveBeenCalled();
    game.continueToReport(); game.finish();
    expect(game.stage()).toBe('locate'); expect(game.comparing()).toBe(true);
    expect(game.stats().outside).toEqual([]);
    game.chooseReport('observed'); game.finish();
    expect(game.stage()).toBe('locate'); expect(done).not.toHaveBeenCalled();
    game.answerComparison('inside'); game.continueToReport();
    expect(game.stage()).toBe('report'); expect(game.comparing()).toBe(false);
    expect(game.records()).toEqual(game.originalStats.values);
    expect(done).not.toHaveBeenCalled();
    game.chooseReport('observed'); game.finish(); fixture.detectChanges();
    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const endText = end.dialogue().messages.map(message => message.text).join(' ');
    expect(endText).toContain('desviación estándar de 2 t/h');
    expect(endText).toContain('No es el promedio de las separaciones');
    expect(endText).toContain('96 queda fuera');
    expect(endText).toContain('En el otro ejemplo estaban todos dentro');
    expect(endText).toContain('ni qué pasará después');
    expect(endText).toContain('También tendremos una meta');
    expect(endText).toContain('menos cambios no significa siempre un mejor resultado');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-08');
  });
});

describe('LessonRunner — balls and hydrocyclones lesson', () => {
  it('runs C7 activity and closing dialogue before completing the lesson', async () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-07'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('SAG');
    expect(introText).toContain('El siguiente turno recibirá este informe');
    expect(introText).toContain('mismo lugar');
    expect(introText).toContain('condiciones parecidas');
    expect(introText).toContain('seis registros');
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('dialogue');
    completeDialogue(intro); fixture.detectChanges();
    await fixture.whenStable();
    const game = fixture.debugElement.query(By.directive(Lesson07Balls)).componentInstance as Lesson07Balls;
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('activity');
    game.startCalculation(); fixture.detectChanges();
    expect(game.stage()).toBe('observe'); expect(done).not.toHaveBeenCalled();
    game.choosePrediction('equal'); game.answerVariance(3); game.continueCalculation();
    game.answerVariance(6); game.continueCalculation(); game.finish();
    expect(game.stage()).toBe('report'); expect(done).not.toHaveBeenCalled();
    expect(game.predictionText()).toBe('Se ven iguales');
    expect(game.helped()).toBe(false);
    game.chooseReport('spread'); game.finish(); fixture.detectChanges();
    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const endText = end.dialogue().messages.map(message => message.text).join(' ');
    expect(endText).toContain('Corregiré el informe');
    expect(endText).toContain('3 (t/h)² y B de 6 (t/h)²');
    expect(endText).toContain('También conté los registros con 0 casillas');
    expect(endText).toContain('no por qué pasó ni qué ajuste hacer');
    expect(endText).toContain('no significa una separación de 3 t/h');
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('dialogue');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-07');
  });
});

describe('LessonRunner — SAG lesson', () => {
  it('runs C6 and its closing dialogue before completing the lesson', async () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-06'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('chancado');
    expect(introText).toContain('explicar al siguiente turno cuánto se separan del promedio los datos');
    expect(introText).toContain('Vamos a resumir sus diferencias con un promedio');
    expect(introText).toContain('98, 100, 100 y 102');
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('dialogue');
    completeDialogue(intro); fixture.detectChanges();
    await fixture.whenStable();
    const game = fixture.debugElement.query(By.directive(Lesson06Sag)).componentInstance as Lesson06Sag;
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('activity');
    game.sumChanges(); game.chooseCancellation('balanced'); game.formSquares(); game.answerSquare(4);
    game.chooseWeight('four');
    game.startPractice(); game.answerPracticeSquare(1);
    expect(done).not.toHaveBeenCalled();
    expect(game.stage()).toBe('practice-checked');
    game.finish(); expect(game.stage()).toBe('practice-checked');
    game.continuePractice(); fixture.detectChanges();
    expect(game.stage()).toBe('practice-checked');
    expect(fixture.debugElement.query(By.directive(Dialogue))).toBeNull();
    expect(done).not.toHaveBeenCalled();
    game.answerPracticeVariance(1);
    game.continuePractice();
    game.finish(); fixture.detectChanges();
    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const endText = end.dialogue().messages.map(message => message.text).join(' ');
    expect(endText).toContain('2 (t/h)²');
    expect(endText).toContain('no significa 2 t/h');
    expect(endText).toContain('También podríamos usar distancias sin signo');
    expect(endText).toContain('8 dividido entre 4 da 2');
    expect(endText).toContain('pero no por qué');
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('dialogue');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-06');
  });
});

describe('LessonRunner — crushing lesson', () => {
  it('runs C5 and its closing dialogue before completing the lesson', async () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-05'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(intro.currentMessage()!.text).toContain('taller');
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('El siguiente turno necesita saber cuánto entró en cada hora');
    expect(introText).toContain('registros de cuatro horas');
    expect(introText).toContain('por debajo o por encima del promedio');
    completeDialogue(intro); fixture.detectChanges();
    await fixture.whenStable();
    const game = fixture.debugElement.query(By.directive(Lesson05Crushing)).componentInstance as Lesson05Crushing;
    game.answerDistance(20); game.compare('same'); game.startPractice();
    for (let index = 0; index < 3; index += 1) {
      const reading = game.readingChoices().find(choice =>
        choice.deviation === game.delta() && choice.distance === Math.abs(game.delta()))!;
      game.chooseReading(reading.id);
    }
    expect(game.stage()).toBe('report');
    game.finish(); expect(done).not.toHaveBeenCalled();
    game.chooseReport('observed'); game.finish(); fixture.detectChanges();
    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(end.currentMessage()!.text).toContain('20 t/h');
    const endText = end.dialogue().messages.map(message => message.text).join(' ');
    expect(endText).toContain('dos horas estuvieron 20 t/h por debajo');
    expect(endText).toContain('La separación es 20 t/h en ambos casos');
    expect(endText).toContain('no explican por qué');
    expect(endText).toContain('no es una meta');
    expect(end.dialogue().messages.at(-1)?.text).toContain('un solo número');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-05');
  });
});

describe('LessonRunner — workshop lesson', () => {
  it('runs C4 activity and closing dialogue before completing the lesson', async () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-04'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(intro.currentMessage()!.text).toContain('botadero');
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('organizando las revisiones del siguiente turno');
    expect(introText).toContain('la misma tarea');
    expect(introText).toContain('todos los registros');
    expect(introText).toContain('tienen el mismo rango');
    expect(introText).toContain('El informe dice que, por eso, sus tiempos se repiten igual');
    completeDialogue(intro); fixture.detectChanges();
    await fixture.whenStable();
    const game = fixture.debugElement.query(By.directive(Lesson04Workshop)).componentInstance as Lesson04Workshop;
    game.compare('a');
    expect(game.stage()).toBe('discovery'); expect(done).not.toHaveBeenCalled();
    game.startPractice(); game.chooseClaim('different'); game.chooseEvidence('a');
    game.finish(); fixture.detectChanges(); expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(end.currentMessage()!.text).toContain('Corregiré el informe');
    const endText = end.dialogue().messages.map(message => message.text).join(' ');
    expect(endText).toContain('tres revisiones de 10 minutos');
    expect(endText).toContain('no solo el rango');
    expect(endText).toContain('no dice qué equipo trabaja mejor');
    expect(endText).toContain('ni explica la causa');
    expect(end.dialogue().messages.at(-1)?.text).toContain('ROM / chancado');
    completeDialogue(end); expect(done).toHaveBeenCalledExactlyOnceWith('lesson-04');
  });
});

describe('LessonRunner — loading lesson', () => {
  it('plays the planned intro, activity and closing dialogue before completing lesson-01', async () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-01');
    fixture.detectChanges();
    const done = vi.fn();
    fixture.componentInstance.completed.subscribe(done);

    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(intro.currentMessage()!.text).toContain('El siguiente turno');
    expect(intro.dialogue().messages.map(message => message.text).join(' ')).not.toMatch(/dispersión|promedio|rango/i);
    completeDialogue(intro);
    fixture.detectChanges();

    await fixture.whenStable();
    const game = fixture.debugElement.query(By.directive(Lesson01Loading)).componentInstance as Lesson01Loading;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('activity');
    game.selectLoad('Ejemplo2');
    game.startComparison();
    game.chooseGroup('B');
    game.startPractice();
    game.chooseGroup('D');
    game.chooseReason('spread');
    game.finish();
    fixture.detectChanges();

    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(end.currentIndex()).toBe(0);
    expect(end.currentMessage()!.text).toContain('El grupo B');
    expect(end.dialogue().messages.at(-1)?.text).toContain('control de acarreo');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-01');
  });
});

describe('LessonRunner — ramp lesson', () => {
  it('plays the planned Class 2 flow before completing lesson-02', async () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-02');
    fixture.detectChanges();
    const done = vi.fn();
    fixture.componentInstance.completed.subscribe(done);

    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(intro.currentMessage()!.text).toContain('lo que encontraste en el tajo');
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('las cargas del siguiente turno');
    expect(introText).toContain('Quienes reciben el mineral');
    expect(introText).toContain('cargas cercanas a 100 toneladas');
    expect(introText).toContain('antes de decidir');
    expect(intro.dialogue().messages.map(message => message.text).join(' ')).not.toMatch(/rango|mínimo|máximo/i);
    completeDialogue(intro);
    fixture.detectChanges();

    await fixture.whenStable();
    const game = fixture.debugElement.query(By.directive(Lesson02Ramp)).componentInstance as Lesson02Ramp;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('activity');
    game.showSharing();
    game.startReport();
    game.assess('unknown');
    game.request('records');
    game.compare('b');
    game.startPractice();
    game.answerPractice('unknown');
    expect(game.stage()).toBe('practice'); expect(game.practiceCase()).toBe(1);
    game.finish(); expect(done).not.toHaveBeenCalled();
    game.answerPractice('b');
    game.explain('summary');
    game.finish();
    fixture.detectChanges();

    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(end.currentIndex()).toBe(0);
    expect(end.currentMessage()!.text).toContain('No decidiré solo con los promedios');
    const endText = end.dialogue().messages.map(message => message.text).join(' ');
    expect(endText).toContain('Eso no explica por qué pasó');
    expect(endText).toContain('hablaré con el equipo antes de cambiar el plan');
    expect(end.dialogue().messages.at(-1)?.text).toContain('encargado del botadero');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-02');
  });
});

describe('LessonRunner — haulage lesson', () => {
  it('plays the planned Class 3 flow before completing lesson-03', async () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-03');
    fixture.detectChanges();
    const done = vi.fn();
    fixture.componentInstance.completed.subscribe(done);

    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(intro.currentMessage()!.text).toContain('botadero');
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('organiza las llegadas del siguiente turno');
    expect(introText).toContain('preparar un aviso');
    expect(introText).not.toMatch(/rango|máximo|mínimo|dispersos/);
    expect(intro.dialogue().messages.at(-1)?.text).toContain('más corta, la más larga');
    completeDialogue(intro);
    fixture.detectChanges();

    await fixture.whenStable();
    const game = fixture.debugElement.query(By.directive(Lesson03Haulage)).componentInstance as Lesson03Haulage;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('activity');
    game.selectTrip('trip-1');
    game.selectTrip('trip-4');
    game.showSeparation();
    game.answerRange(7);
    game.startPractice();
    game.selectTrip('practice-0-2');
    game.selectTrip('practice-0-4');
    game.answerRange(5);
    game.explainRange('separation');
    game.finish();
    fixture.detectChanges();

    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(end.currentMessage()!.text).toContain('diferencia de 7 minutos');
    const endText = end.dialogue().messages.map(message => message.text).join(' ');
    expect(endText).toContain('Añadiré tu aviso al informe del siguiente turno');
    expect(endText).toContain('las próximas descargas pueden durar distinto');
    expect(endText).toContain('no explican por qué');
    expect(end.dialogue().messages.at(-1)?.text).toContain('registros del taller');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-03');
  });
});

import { TestBed } from '@angular/core/testing';
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

function completeDialogue(dialogue: Dialogue): void {
  const messageCount = dialogue.dialogue().messages.length;

  for (let index = 0; index < messageCount; index += 1) {
    if (dialogue.isTyping()) {
      dialogue.next();
    }

    dialogue.next();
  }
}

describe('LessonRunner — thickeners lesson', () => {
  it('requires C9 decisions, transfer, original report and closing dialogue before completion', () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-09'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('informe del relevo');
    expect(introText).toContain('mismo punto y a intervalos iguales');
    expect(introText).toContain('condiciones equivalentes');
    expect(introText).toContain('nuestros propios datos, no los de flotación');
    expect(introText).toContain('meta ficticia');
    expect(introText).toContain('No exige que cada registro sea 100');
    completeDialogue(intro); fixture.detectChanges();
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
    expect(endText).toContain('A tuvo media de 80 t/h');
    expect(endText).toContain('desviación estándar de 2 t/h');
    expect(endText).toContain('causas y los límites de variación aceptables');
    expect(endText).toContain('no reemplaza los registros originales');
    expect(endText).toContain('Ni menor ni mayor dispersión');
    completeDialogue(end); expect(done).toHaveBeenCalledExactlyOnceWith('lesson-09');
  });
});

describe('LessonRunner — flotation lesson', () => {
  it('runs C8 and its original-data closing before completing the lesson', () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-08'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('bolas e hidrociclones');
    expect(introText).toContain('informe del relevo');
    expect(introText).toContain('mismo punto y a intervalos iguales');
    expect(introText).toContain('Son datos de flotación, no del molino');
    completeDialogue(intro); fixture.detectChanges();
    const game = fixture.debugElement.query(By.directive(Lesson08Flotation)).componentInstance as Lesson08Flotation;
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('activity');
    game.startRoot(); game.answerRoot(2); game.continueToReport(); game.finish();
    expect(game.stage()).toBe('checked'); expect(done).not.toHaveBeenCalled();
    game.continueToBand(); game.finish();
    expect(game.stage()).toBe('locate'); expect(done).not.toHaveBeenCalled();
    game.selectRecord(0); game.finish();
    expect(game.stage()).toBe('located'); expect(done).not.toHaveBeenCalled();
    game.continueToReport(); game.finish();
    expect(done).not.toHaveBeenCalled();
    game.chooseReport('observed'); game.finish(); fixture.detectChanges();
    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const endText = end.dialogue().messages.map(message => message.text).join(' ');
    expect(endText).toContain('desviación estándar de 2 t/h');
    expect(endText).toContain('no es el promedio simple de las distancias');
    expect(endText).toContain('registro de 96 está fuera');
    expect(endText).toContain('no predice los registros futuros');
    expect(endText).toContain('objetivo operativo explícito');
    expect(endText).toContain('menor dispersión no significa automáticamente mejor operación');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-08');
  });
});

describe('LessonRunner — balls and hydrocyclones lesson', () => {
  it('runs C7 activity and closing dialogue before completing the lesson', () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-07'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('SAG');
    expect(introText).toContain('informe que recibirá el siguiente turno');
    expect(introText).toContain('mismo punto');
    expect(introText).toContain('condiciones equivalentes');
    expect(introText).toContain('seis registros');
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('dialogue');
    completeDialogue(intro); fixture.detectChanges();
    const game = fixture.debugElement.query(By.directive(Lesson07Balls)).componentInstance as Lesson07Balls;
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('activity');
    game.startCalculation(); game.answerVariance(3); game.continueCalculation();
    game.answerVariance(6); game.continueCalculation(); game.finish();
    expect(game.stage()).toBe('report'); expect(done).not.toHaveBeenCalled();
    game.chooseReport('spread'); game.finish(); fixture.detectChanges();
    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const endText = end.dialogue().messages.map(message => message.text).join(' ');
    expect(endText).toContain('Corregiré el informe');
    expect(endText).toContain('3 (t/h)² y B de 6 (t/h)²');
    expect(endText).toContain('También conté los que aportaban 0');
    expect(endText).toContain('No explica la causa');
    expect(endText).toContain('no es una distancia de 3 t/h');
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('dialogue');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-07');
  });
});

describe('LessonRunner — SAG lesson', () => {
  it('runs C6 and its closing dialogue before completing the lesson', () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-06'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('chancado');
    expect(introText).toContain('comparar cómo varió la alimentación');
    expect(introText).toContain('distinta cantidad de registros');
    expect(introText).toContain('98, 100, 100 y 102');
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('dialogue');
    completeDialogue(intro); fixture.detectChanges();
    const game = fixture.debugElement.query(By.directive(Lesson06Sag)).componentInstance as Lesson06Sag;
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('activity');
    game.sumChanges(); game.chooseCancellation('balanced'); game.formSquares(); game.answerSquare(4);
    game.chooseWeight('four'); game.setDuplicated(true); game.compareCopy(); game.chooseSummary('per-record');
    game.startPractice(); game.answerPracticeSquare(1); game.choosePracticeSummary('same');
    expect(done).not.toHaveBeenCalled();
    expect(game.stage()).toBe('practice-checked');
    game.finish(); expect(game.stage()).toBe('practice-checked');
    game.continuePractice();
    game.finish(); fixture.detectChanges();
    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    const endText = end.dialogue().messages.map(message => message.text).join(' ');
    expect(endText).toContain('2 (t/h)²');
    expect(endText).toContain('no es una distancia de 2 t/h');
    expect(endText).toContain('opción válida');
    expect(endText).toContain('Duplicar los mismos datos en una copia');
    expect(endText).toContain('no explica por qué');
    expect((fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()).toBe('dialogue');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-06');
  });
});

describe('LessonRunner — crushing lesson', () => {
  it('runs C5 and its closing dialogue before completing the lesson', () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-05'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(intro.currentMessage()!.text).toContain('taller');
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('aviso de alimentación para el siguiente turno');
    expect(introText).toContain('registros de cuatro horas');
    expect(introText).toContain('por debajo o por encima del promedio');
    completeDialogue(intro); fixture.detectChanges();
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
    expect(endText).toContain('dos horas 20 t/h por debajo');
    expect(endText).toContain('las cuatro distancias son 20 t/h');
    expect(endText).toContain('no explican por qué');
    expect(endText).toContain('no una meta de producción');
    expect(end.dialogue().messages.at(-1)?.text).toContain('una sola medida');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-05');
  });
});

describe('LessonRunner — workshop lesson', () => {
  it('runs C4 activity and closing dialogue before completing the lesson', () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-04'); fixture.detectChanges();
    const done = vi.fn(); fixture.componentInstance.completed.subscribe(done);
    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(intro.currentMessage()!.text).toContain('botadero');
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('organizando las revisiones del siguiente turno');
    expect(introText).toContain('la misma tarea');
    expect(introText).toContain('todos los registros');
    completeDialogue(intro); fixture.detectChanges();
    const game = fixture.debugElement.query(By.directive(Lesson04Workshop)).componentInstance as Lesson04Workshop;
    game.compare('a'); game.setExperiment('apart'); game.showChanges();
    expect(game.stage()).toBe('predict'); expect(done).not.toHaveBeenCalled();
    game.predictRange('increase'); game.setExperiment('apart'); game.showChanges(); game.explain('extremes');
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
  it('plays the planned intro, activity and closing dialogue before completing lesson-01', () => {
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
  it('plays the planned Class 2 flow before completing lesson-02', () => {
    const fixture = TestBed.createComponent(LessonRunner);
    fixture.componentRef.setInput('lessonId', 'lesson-02');
    fixture.detectChanges();
    const done = vi.fn();
    fixture.componentInstance.completed.subscribe(done);

    const intro = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(intro.currentMessage()!.text).toContain('observación sobre las cargas del tajo');
    const introText = intro.dialogue().messages.map(message => message.text).join(' ');
    expect(introText).toContain('plan de carga del siguiente turno');
    expect(introText).toContain('organizar las entregas');
    expect(introText).toContain('cargas cercanas a 100 toneladas');
    expect(introText).toContain('antes de cerrarlo');
    expect(intro.dialogue().messages.map(message => message.text).join(' ')).not.toMatch(/rango|mínimo|máximo/i);
    completeDialogue(intro);
    fixture.detectChanges();

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
    game.explain('summary');
    game.finish();
    fixture.detectChanges();

    expect(done).not.toHaveBeenCalled();
    const end = fixture.debugElement.query(By.directive(Dialogue)).componentInstance as Dialogue;
    expect(
      (fixture.debugElement.query(By.directive(InteractionPanel)).componentInstance as InteractionPanel).mode()
    ).toBe('dialogue');
    expect(end.currentIndex()).toBe(0);
    expect(end.currentMessage()!.text).toContain('No cerraré el plan solo con los promedios');
    const endText = end.dialogue().messages.map(message => message.text).join(' ');
    expect(endText).toContain('Eso no explica por qué pasó');
    expect(endText).toContain('consultaré al equipo antes de decidir cambios');
    expect(end.dialogue().messages.at(-1)?.text).toContain('encargado del botadero');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-02');
  });
});

describe('LessonRunner — haulage lesson', () => {
  it('plays the planned Class 3 flow before completing lesson-03', () => {
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
    expect(intro.dialogue().messages.at(-1)?.text).toContain('más corta y la más larga');
    completeDialogue(intro);
    fixture.detectChanges();

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
    expect(endText).toContain('Añadiré tu aviso al informe del relevo');
    expect(endText).toContain('no garantiza');
    expect(endText).toContain('no explican por qué');
    expect(end.dialogue().messages.at(-1)?.text).toContain('registros del taller');
    completeDialogue(end);
    expect(done).toHaveBeenCalledExactlyOnceWith('lesson-03');
  });
});

import { OutputEmitterRef, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Lesson01Loading } from './lesson-01-loading/lesson-01-loading';
import { Lesson02Ramp } from './lesson-02-ramp/lesson-02-ramp';
import { Lesson03Haulage } from './lesson-03-haulage/lesson-03-haulage';
import { Lesson04Workshop } from './lesson-04-workshop/lesson-04-workshop';
import { Lesson05Crushing } from './lesson-05-crushing/lesson-05-crushing';
import { Lesson09Thickeners } from './lesson-09-thickeners/lesson-09-thickeners';
import { DraftLessonId, LessonExerciseState, isLessonExerciseState, loadLessonDraft, saveLessonDraft } from '../progress/lesson-draft.storage';

interface Recoverable<S extends LessonExerciseState> { stateChanged: OutputEmitterRef<S>; completed: OutputEmitterRef<void>; finish(): void }
describe('Exercise snapshots at every action — C1–C5 and C9', () => {
  function exercise<S extends LessonExerciseState, T extends Recoverable<S>>(type: Type<T>, id: DraftLessonId) {
    const fixture = TestBed.createComponent(type); const game = fixture.componentInstance;
    const states: S[] = []; const order: string[] = [];
    game.stateChanged.subscribe(state => { states.push(state); order.push(state.stage); });
    game.completed.subscribe(() => order.push('completed'));
    fixture.componentRef.setInput('initialState', null); fixture.detectChanges();
    const run = (action: () => void) => {
      action(); fixture.detectChanges(); const state = states.at(-1)!;
      expect(isLessonExerciseState(id, state), JSON.stringify(state)).toBe(true);
      const memory = new Map<string, string>();
      const storage = { getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => { memory.set(key, value); }, removeItem: (key: string) => { memory.delete(key); } };
      expect(saveLessonDraft('qa', id, { step: 1, exercise: state }, storage)).toBe(true);
      const copy = TestBed.createComponent(type); const copied = vi.fn(); const completed = vi.fn();
      copy.componentInstance.stateChanged.subscribe(copied); copy.componentInstance.completed.subscribe(completed);
      copy.componentRef.setInput('initialState', loadLessonDraft('qa', id, storage).draft!.exercise); copy.detectChanges();
      expect(copied).toHaveBeenCalledExactlyOnceWith(state); expect(completed).not.toHaveBeenCalled(); copy.destroy();
    };
    return { game, run, states, finish: () => { run(() => game.finish()); expect(order.slice(-2)).toEqual(['success', 'completed']); } };
  }
  it('C1 preserves point selection, reasoning and help through its single additional practice and closure', () => {
    const { game: g, run, finish } = exercise(Lesson01Loading, 'lesson-01');
    run(() => g.selectLoad('Ejemplo1')); run(() => g.startComparison()); run(() => g.chooseGroup('B')); run(() => g.startPractice());
    for (let round = 0; round < 2; round++) {
      run(() => g.chooseGroup(g.groups().find(group => group.name !== g.correctGroup())!.name));
      run(() => g.selectLoad(g.plots()[0].points[0].id)); run(() => g.chooseGroup(g.correctGroup()));
      run(() => g.chooseReason('spread')); if (round === 0) run(() => g.continueAfterHelp());
    }
    expect(g.stage()).toBe('success'); expect(g.practiceRound()).toBe(1);
    expect(g.practiceHelped()).toBe(true); expect(g.guidedCompletion()).toBe(true); finish();
  });
  it('C2 keeps report versus records, selected data and practice case across rounds', () => {
    const { game: g, run, finish } = exercise(Lesson02Ramp, 'lesson-02');
    run(() => g.showSharing()); run(() => g.startReport()); run(() => g.assess('unknown')); run(() => g.request('records'));
    run(() => g.selectLoad('A1')); run(() => g.compare('b')); run(() => g.startPractice());
    for (let round = 0; round < 4; round++) {
      if (round < 3) run(() => g.answerPractice('a'));
      run(() => g.answerPractice('unknown')); run(() => g.selectLoad(g.plots()[0].points[0].id));
      run(() => g.answerPractice(g.correctPracticeAnswer())); run(() => g.explain('summary'));
      if (round < 3) run(() => g.continueAfterHelp());
    }
    expect(g.stage()).toBe('success'); finish();
  });
  it('C3 keeps the first extreme and validates practice IDs even in the final report', () => {
    const { game: g, run, finish } = exercise(Lesson03Haulage, 'lesson-03');
    run(() => g.selectTrip('trip-1')); run(() => g.selectTrip('trip-4')); run(() => g.showSeparation());
    run(() => g.answerRange(g.separation())); run(() => g.startPractice());
    for (let round = 0; round < 4; round++) {
      if (round < 3) run(() => g.selectTrip(g.records().find(record => record.time !== g.minimum())!.id));
      run(() => g.selectTrip(g.records().find(record => record.time === g.minimum())!.id));
      run(() => g.selectTrip(g.records().find(record => record.time === g.maximum())!.id));
      run(() => g.answerRange(g.separation())); run(() => g.explainRange('separation'));
      if (round < 3) run(() => g.continueAfterHelp());
    }
    expect(g.stage()).toBe('success'); finish();
  });
  it('C4 remembers a viewed experiment even after resetting its visual position', () => {
    const { game: g, run, finish } = exercise(Lesson04Workshop, 'lesson-04');
    run(() => g.compare('a')); run(() => g.predictRange('increase')); run(() => g.setExperiment('apart'));
    run(() => g.setExperiment('together')); run(() => g.setExperiment('apart')); run(() => g.showChanges());
    run(() => g.explain('extremes')); run(() => g.startPractice());
    for (let round = 0; round < 4; round++) {
      if (round < 3) run(() => g.chooseClaim('same'));
      run(() => g.chooseClaim('different')); run(() => g.chooseEvidence(g.concentratedSide()));
      if (round < 3) run(() => g.continueAfterHelp());
    }
    expect(g.stage()).toBe('success'); finish();
  });
  it('C5 retains solved readings, their order and assistance without re-solving them', () => {
    const { game: g, run, finish } = exercise(Lesson05Crushing, 'lesson-05');
    run(() => g.select(2)); run(() => g.answerDistance(20)); run(() => g.compare('same')); run(() => g.startPractice());
    for (let round = 0; round < 4; round++) {
      if (round < 3) run(() => g.chooseReading(g.readingChoices().find(choice => choice.deviation !== g.delta())!.id));
      for (let i = 0; i < 3; i++) run(() => g.chooseReading(g.readingChoices().find(choice => choice.deviation === g.delta() && choice.distance === Math.abs(g.delta()))!.id));
      if (round < 3) run(() => g.continueAfterHelp());
    }
    run(() => g.chooseReport('observed')); expect(g.stage()).toBe('success'); finish();
  });
  it('C9 restores a correct answer and its explanation before Continue, plus help and transfer rounds', () => {
    const { game: g, run, finish, states } = exercise(Lesson09Thickeners, 'lesson-09');
    for (let round = 0; round < 4; round++) {
      if (round < 3) run(() => g.requestHint());
      run(() => g.choosePeriod(g.lessSpread()));
      const copy = TestBed.createComponent(Lesson09Thickeners); copy.componentRef.setInput('initialState', states.at(-1)); copy.detectChanges();
      expect(copy.componentInstance.answered()).toBe(true); expect(copy.componentInstance.feedback()).toBe(g.feedback()); copy.destroy();
      run(() => g.continue()); run(() => g.choosePeriod(g.closerToGoal())); run(() => g.continue());
      if (round < 3) run(() => g.chooseRecommendation('adjust'));
      run(() => g.chooseRecommendation('reference')); run(() => g.continue()); run(() => g.startTransfer());
      run(() => g.choosePeriod(g.lessSpread())); run(() => g.continue());
      if (round < 3) run(() => g.continueAfterHelp());
    }
    expect(g.stage()).toBe('success'); finish();
  });
});

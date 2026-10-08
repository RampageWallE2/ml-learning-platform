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
    for (let round = 0; round < 2; round++) {
      run(() => g.answerPractice('a'));
      run(() => g.answerPractice('unknown')); run(() => g.selectLoad(g.plots()[0].points[0].id));
      run(() => g.answerPractice(g.correctPracticeAnswer())); run(() => g.explain('summary'));
      if (round === 0) run(() => g.continueAfterHelp());
    }
    expect(g.stage()).toBe('success'); expect(g.round()).toBe(1);
    expect(g.practiceHelped()).toBe(true); expect(g.guidedCompletion()).toBe(true); finish();
  });
  it('C3 keeps the first extreme and validates practice IDs even in the final report', () => {
    const { game: g, run, finish } = exercise(Lesson03Haulage, 'lesson-03');
    run(() => g.selectTrip('trip-1')); run(() => g.selectTrip('trip-4')); run(() => g.showSeparation());
    run(() => g.answerRange(g.separation())); run(() => g.startPractice());
    for (let round = 0; round < 2; round++) {
      run(() => g.selectTrip(g.records().find(record => record.time !== g.minimum())!.id));
      run(() => g.selectTrip(g.records().find(record => record.time === g.minimum())!.id));
      run(() => g.selectTrip(g.records().find(record => record.time === g.maximum())!.id));
      run(() => g.answerRange(g.separation())); run(() => g.explainRange('separation'));
      if (round === 0) run(() => g.continueAfterHelp());
    }
    expect(g.stage()).toBe('success'); expect(g.round()).toBe(1);
    expect(g.practiceHelped()).toBe(true); expect(g.guidedCompletion()).toBe(true); finish();
  });
  it('C3 preserves consulted support in its existing draft without completing or losing selected extremes', () => {
    const { game: g, run, states } = exercise(Lesson03Haulage, 'lesson-03');
    run(() => g.selectTrip('trip-1')); run(() => g.selectTrip('trip-4')); run(() => g.showSeparation());
    run(() => g.answerRange(7)); run(() => g.startPractice());
    run(() => g.selectTrip('practice-0-2')); run(() => g.selectTrip('practice-0-4'));
    expect(g.practiceHelped()).toBe(false);
    run(() => g.toggleMeasureSupport()); expect(g.practiceHelped()).toBe(true);
    run(() => g.toggleMeasureSupport()); expect(g.practiceHelped()).toBe(true);
    const reopened = TestBed.createComponent(Lesson03Haulage); const done = vi.fn();
    reopened.componentInstance.completed.subscribe(done);
    reopened.componentRef.setInput('initialState', states.at(-1)); reopened.detectChanges();
    const copy = reopened.componentInstance;
    expect(copy.stage()).toBe('practice-range'); expect(copy.practiceHelped()).toBe(true);
    expect(copy.selectedMinId()).toBe('practice-0-2'); expect(copy.selectedMaxId()).toBe('practice-0-4');
    expect(copy.practiceMeasureVisible()).toBe(false); expect(copy.separation()).toBe(5);
    copy.toggleMeasureSupport(); reopened.detectChanges();
    expect(reopened.nativeElement.querySelectorAll('.minute-step')).toHaveLength(5);
    expect(done).not.toHaveBeenCalled(); copy.finish(); expect(done).not.toHaveBeenCalled();
    copy.answerRange(5); copy.explainRange('separation'); expect(copy.stage()).toBe('review');
    copy.finish(); expect(done).not.toHaveBeenCalled(); reopened.destroy();
  });
  it('C4 preserves the direct explanation, practice evidence and assistance across reloads', () => {
    const { game: g, run, finish } = exercise(Lesson04Workshop, 'lesson-04');
    run(() => g.compare('a'));
    expect(g.stage()).toBe('discovery');
    run(() => g.startPractice());
    for (let round = 0; round < 2; round++) {
      run(() => g.chooseClaim('same'));
      run(() => g.chooseClaim('different')); run(() => g.chooseEvidence(g.concentratedSide()));
      if (round === 0) run(() => g.continueAfterHelp());
    }
    expect(g.stage()).toBe('success'); expect(g.round()).toBe(1);
    expect(g.practiceHelped()).toBe(true); expect(g.guidedCompletion()).toBe(true); finish();
  });
  it('C5 retains solved readings, their order and assistance without re-solving them', () => {
    const { game: g, run, finish } = exercise(Lesson05Crushing, 'lesson-05');
    run(() => g.select(2)); run(() => g.answerDistance(20)); run(() => g.compare('same')); run(() => g.startPractice());
    for (let round = 0; round < 2; round++) {
      run(() => g.chooseReading(g.readingChoices().find(choice => choice.deviation !== g.delta())!.id));
      for (let i = 0; i < 3; i++) run(() => g.chooseReading(g.readingChoices().find(choice => choice.deviation === g.delta() && choice.distance === Math.abs(g.delta()))!.id));
      if (round === 0) run(() => g.continueAfterHelp());
    }
    expect(g.stage()).toBe('report'); expect(g.round()).toBe(1); expect(g.practiceHelped()).toBe(true);
    run(() => g.finish()); expect(g.stage()).toBe('report');
    run(() => g.chooseReport('observed')); expect(g.stage()).toBe('success'); finish();
  });
  it('C9 restores a correct answer and its explanation before Continue, plus help and transfer rounds', () => {
    const { game: g, run, finish, states } = exercise(Lesson09Thickeners, 'lesson-09');
    for (let round = 0; round < 2; round++) {
      run(() => g.requestHint());
      run(() => g.choosePeriod(g.lessSpread()));
      const copy = TestBed.createComponent(Lesson09Thickeners); copy.componentRef.setInput('initialState', states.at(-1)); copy.detectChanges();
      expect(copy.componentInstance.answered()).toBe(true); expect(copy.componentInstance.feedback()).toBe(g.feedback()); copy.destroy();
      run(() => g.continue()); run(() => g.choosePeriod(g.closerToGoal())); run(() => g.continue());
      run(() => g.chooseRecommendation('adjust'));
      run(() => g.chooseRecommendation('reference')); run(() => g.continue()); run(() => g.startTransfer());
      run(() => g.choosePeriod(g.lessSpread())); run(() => g.continue());
      if (round === 0) run(() => g.continueAfterHelp());
    }
    expect(g.stage()).toBe('success'); expect(g.round()).toBe(1);
    expect(g.helped()).toBe(true); expect(g.guidedCompletion()).toBe(true); finish();
  });
});

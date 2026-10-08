import {
  Component,
  ElementRef,
  Injector,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { AuthenticatedUser } from '../../../../../core/auth/auth.types';
import { LessonDraftService } from '../../../progress/lesson-draft.service';
import { C6DraftContent, DraftLessonId, isDraftLessonId, isLessonExerciseState, LessonDraft, LessonExerciseState } from '../../../progress/lesson-draft.storage';
import { C1State } from '../../../lessons/lesson-01-loading/lesson-01-loading.state';
import { C2State } from '../../../lessons/lesson-02-ramp/lesson-02-ramp.state';
import { C3State } from '../../../lessons/lesson-03-haulage/lesson-03-haulage.state';
import { C4State } from '../../../lessons/lesson-04-workshop/lesson-04-workshop.state';
import { C5State } from '../../../lessons/lesson-05-crushing/lesson-05-crushing.state';
import { C9State } from '../../../lessons/lesson-09-thickeners/lesson-09-thickeners.state';
import { C6State } from '../../../lessons/lesson-06-sag/lesson-06-sag.state';
import { C7State } from '../../../lessons/lesson-07-balls/lesson-07-balls.state';
import { C8State } from '../../../lessons/lesson-08-flotation/lesson-08-flotation.state';

import { Dialogue } from '../../dialogue/dialogue';
import { InteractionPanel } from '../../interaction-panel/interaction-panel';
import { LESSON_DEFINITIONS, LESSON_NAMES } from '../../../lessons/lesson-catalog';
import { Lesson01Loading } from '../../../lessons/lesson-01-loading/lesson-01-loading';

import { Lesson02Ramp } from '../../../lessons/lesson-02-ramp/lesson-02-ramp';

import { Lesson03Haulage } from '../../../lessons/lesson-03-haulage/lesson-03-haulage';
import { Lesson05Crushing } from '../../../lessons/lesson-05-crushing/lesson-05-crushing';
import { Lesson04Workshop } from '../../../lessons/lesson-04-workshop/lesson-04-workshop';
import { Lesson06Sag } from '../../../lessons/lesson-06-sag/lesson-06-sag';
import { Lesson07Balls } from '../../../lessons/lesson-07-balls/lesson-07-balls';
import { Lesson08Flotation } from '../../../lessons/lesson-08-flotation/lesson-08-flotation';
import { Lesson09Thickeners } from '../../../lessons/lesson-09-thickeners/lesson-09-thickeners';

@Component({
  selector: 'app-lesson-runner',

  imports: [
    NgTemplateOutlet,
    Dialogue,
    InteractionPanel,
    Lesson01Loading,
    Lesson02Ramp,
    Lesson03Haulage,
    Lesson04Workshop,
    Lesson05Crushing,
    Lesson06Sag,
    Lesson07Balls,
    Lesson08Flotation,
    Lesson09Thickeners
  ],

  templateUrl: './lesson-runner.html',
  styleUrl: './lesson-runner.scss'
})
export class LessonRunner implements OnChanges {

  private readonly drafts = inject(LessonDraftService);
  private readonly injector = inject(Injector);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly exerciseContent = viewChild<unknown, ElementRef<HTMLElement>>('exerciseContent', { read: ElementRef });
  private readonly exerciseNotice = viewChild<ElementRef<HTMLElement>>('exerciseNotice');
  private readonly owner = signal<AuthenticatedUser | null>(null);
  private exerciseState: LessonExerciseState | null = null;
  private readonly storageAvailable = signal(true);
  private readonly discardedDraft = signal(false);

  private readonly draftLessonId = computed(() => {
    const id = this.lessonId();
    return isDraftLessonId(id) ? id : null;
  });
  readonly resumeOffer = signal<LessonDraft | null>(null);
  // Only seed the child on opening/resuming, never on its own state emissions.
  readonly initialExerciseState = signal<C6State | null>(null);
  readonly initialC1State = signal<C1State | null>(null);
  readonly initialC2State = signal<C2State | null>(null);
  readonly initialC3State = signal<C3State | null>(null);
  readonly initialC4State = signal<C4State | null>(null);
  readonly initialC5State = signal<C5State | null>(null);
  readonly initialC9State = signal<C9State | null>(null);
  readonly initialC7State = signal<C7State | null>(null);
  readonly initialC8State = signal<C8State | null>(null);
  readonly resumeTitle = computed(() => {
    const id = this.draftLessonId();
    return id ? 'C' + Number(id.slice(-2)) + ' · ' + LESSON_NAMES[id] : '';
  });
  readonly sessionChanged = computed(() => !!this.draftLessonId()
    && this.owner() !== this.drafts.currentUser());
  readonly draftNotice = computed(() => {
    if (!this.draftLessonId() || this.sessionChanged()) return null;
    if (!this.storageAvailable()) return 'Este navegador no pudo guardar dónde vas. Si cierras o recargas, podrías tener que empezar de nuevo.';
    return this.discardedDraft() ? 'El ejercicio guardado no es compatible con esta versión. Empezaremos de nuevo; tu progreso confirmado no cambia.' : null;
  });
  readonly resumeLocation = computed(() => {
    const draft = this.resumeOffer();
    return draft?.step === 2 ? 'Terminaste el ejercicio. Falta la conversación final.'
      : draft?.step === 1 ? 'Retoma el ejercicio de ' + LESSON_NAMES[draft.lessonId].toLowerCase() + ' donde lo dejaste.'
      : 'Retoma la conversación inicial.';
  });

  lessonId = input.required<string>();

  readonly returnFocusTarget = input<HTMLElement | null>(null);
  readonly statusTemplate = input<TemplateRef<{ inline: boolean }> | null>(null);
  readonly statusBusy = input(false);

  completed = output<string>();

  closed = output<void>();

  currentStepIndex = signal(0);

  lesson = computed(() =>
    LESSON_DEFINITIONS[this.lessonId()]
  );

  currentStep = computed(() =>
    this.lesson()?.steps[
      this.currentStepIndex()
    ] ?? null
  );

  constructor() {
    afterRenderEffect(() => {
      // A deferred exercise replaces its loading notice without changing the panel mode.
      const content = this.exerciseContent();
      const notice = this.exerciseNotice();
      if (this.sessionChanged() || content || notice) this.focusContent();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['lessonId']) return;
    this.currentStepIndex.set(0);
    this.resetSeeds();
    this.exerciseState = null;
    this.resumeOffer.set(null);
    this.storageAvailable.set(true);
    this.discardedDraft.set(false);
    const owner = this.drafts.currentUser();
    this.owner.set(owner);
    const lessonId = this.draftLessonId();
    if (!lessonId || !owner) return;
    const result = this.drafts.load(owner, lessonId);
    this.storageAvailable.set(result.available);
    this.discardedDraft.set(result.discarded);
    if (result.draft) this.resumeOffer.set(result.draft as LessonDraft);
    else this.persistDraft();
  }

  resumeDraft(): void {
    const draft = this.resumeOffer();
    if (!draft || draft.lessonId !== this.lessonId() || this.sessionChanged()) return;
    this.exerciseState = draft.exercise;
    switch (draft.lessonId) {
      case 'lesson-01': this.initialC1State.set(draft.exercise); break;
      case 'lesson-02': this.initialC2State.set(draft.exercise); break;
      case 'lesson-03': this.initialC3State.set(draft.exercise); break;
      case 'lesson-04': this.initialC4State.set(draft.exercise); break;
      case 'lesson-05': this.initialC5State.set(draft.exercise); break;
      case 'lesson-06': this.initialExerciseState.set(draft.exercise); break;
      case 'lesson-07': this.initialC7State.set(draft.exercise); break;
      case 'lesson-08': this.initialC8State.set(draft.exercise); break;
      case 'lesson-09': this.initialC9State.set(draft.exercise); break;
    }
    this.currentStepIndex.set(draft.step);
    this.resumeOffer.set(null);
    this.persistDraft();
    this.focusResumedContent();
  }

  restartDraft(): void {
    if (this.sessionChanged()) return;
    this.resumeOffer.set(null);
    this.exerciseState = null;
    this.resetSeeds();
    this.currentStepIndex.set(0);
    this.persistDraft();
    this.focusResumedContent();
  }

  saveExerciseState(id: DraftLessonId, state: LessonExerciseState): void {
    if (this.lessonId() !== id || this.sessionChanged() || this.resumeOffer()
      || this.currentStepIndex() !== 1 || !isLessonExerciseState(id, state)) return;
    this.exerciseState = state;
    this.persistDraft();
  }

  private resetSeeds(): void {
    this.initialC1State.set(null); this.initialC2State.set(null); this.initialC3State.set(null);
    this.initialC4State.set(null); this.initialC5State.set(null); this.initialExerciseState.set(null);
    this.initialC7State.set(null); this.initialC8State.set(null); this.initialC9State.set(null);
  }

  private persistDraft(): void {
    const owner = this.owner();
    const lessonId = this.draftLessonId();
    if (!lessonId || !owner || this.sessionChanged() || this.resumeOffer()) return;
    const step = this.currentStepIndex() as C6DraftContent['step'];
    const state = this.exerciseState;
    if (state === null || isLessonExerciseState(lessonId, state)) {
      this.storageAvailable.set(this.drafts.save(owner, { step, exercise: state }, lessonId));
    }
  }

  private focusResumedContent(): void {
    afterNextRender(() => this.focusContent(), { injector: this.injector });
  }

  private focusContent(): void {
    const panel = this.element.nativeElement.querySelector<HTMLElement>('[role="dialog"]');
    const active = this.document.activeElement;
    if (!panel || (active !== panel && panel.contains(active))) return;
    const selector = !this.sessionChanged() && this.currentStep()?.type === 'dialogue' ? '[autofocus]' : 'h2';
    const target = panel.querySelector<HTMLElement>(selector) ?? panel;
    if (!target.hasAttribute('tabindex') && !target.matches('button')) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }

  nextStep(): void {
    const lesson = this.lesson();

    if (!lesson || this.sessionChanged() || this.resumeOffer()) {
      return;
    }

    const isLastStep =
      this.currentStepIndex() >=
      lesson.steps.length - 1;

    if (isLastStep) {
      this.completed.emit(lesson.id);
      return;
    }

    // A recoverable lesson must have finished its exercise before the closing
    // draft is written. Restoring a draft alone never emits completion.
    if (this.draftLessonId() && this.owner() && this.currentStepIndex() === 1
      && this.exerciseState?.stage !== 'success') return;

    this.currentStepIndex.update(
      index => index + 1
    );
    this.persistDraft();
  }
}

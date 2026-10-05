import {
  Component,
  computed,
  input,
  output,
  signal
} from '@angular/core';

import { Dialogue } from '../../dialogue/dialogue';
import { InteractionPanel } from '../../interaction-panel/interaction-panel';
import { LESSON_DEFINITIONS } from '../../../lessons/lesson-catalog';
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

  templateUrl: './lesson-runner.html'
})
export class LessonRunner {

  lessonId = input.required<string>();

  readonly returnFocusTarget = input<HTMLElement | null>(null);

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

  nextStep(): void {
    const lesson = this.lesson();

    if (!lesson) {
      return;
    }

    const isLastStep =
      this.currentStepIndex() >=
      lesson.steps.length - 1;

    if (isLastStep) {
      this.completed.emit(lesson.id);
      return;
    }

    this.currentStepIndex.update(
      index => index + 1
    );
  }
}

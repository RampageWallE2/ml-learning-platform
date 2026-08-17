import {
  Component,
  computed,
  input,
  output,
  signal
} from '@angular/core';

import { Dialogue } from '../../dialogue/dialogue';
import { LessonDefinition } from '../../../lessons/lesson.types';

import { LESSON_01 } from '../../../lessons/data/lesson-01.data';
import { Lesson01Nursery } from '../../../lessons/lesson-01-nursery/lesson-01-nursery';

import { LESSON_02 } from '../../../lessons/data/lesson-02.data';
import { Lesson02Farm } from '../../../lessons/lesson-02-farm/lesson-02-farm';

import { LESSON_03 } from '../../../lessons/data/lesson-03.data';
import { Lesson03Granary } from '../../../lessons/lesson-03-granary/lesson-03-granary';

import { LESSON_04 } from '../../../lessons/data/lesson-04.data';
import { Lesson04Plaza } from '../../../lessons/lesson-04-plaza/lesson-04-plaza';

const LESSONS: Record<string, LessonDefinition> = {
  'lesson-01': LESSON_01,
  'lesson-02': LESSON_02,
  'lesson-03': LESSON_03,
  'lesson-04': LESSON_04,
};

@Component({
  selector: 'app-lesson-runner',

  imports: [
    Dialogue,
    Lesson01Nursery,
    Lesson02Farm,
    Lesson03Granary,
    Lesson04Plaza
  ],

  templateUrl: './lesson-runner.html'
})
export class LessonRunner {

  lessonId = input.required<string>();

  completed = output<string>();

  currentStepIndex = signal(0);

  lesson = computed(() =>
    LESSONS[this.lessonId()]
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
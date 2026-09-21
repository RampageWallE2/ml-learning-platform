import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-learning-preview',
  templateUrl: './learning-preview.html',
  styleUrl: './learning-preview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningPreview {
  readonly selectedAnswer = signal<number | null>(null);
}

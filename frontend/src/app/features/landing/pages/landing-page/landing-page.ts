import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LearningPreview } from './learning-preview';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, LearningPreview],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage {
  readonly menuOpen = signal(false);
}

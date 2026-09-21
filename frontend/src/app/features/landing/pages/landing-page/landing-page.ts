import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '../../../../shared/ui/reveal-on-scroll.directive';
import { TypewriterTextDirective } from '../../../../shared/ui/typewriter-text.directive';
import { LearningPreview } from './learning-preview';
import { LearningScene } from './learning-scene';

@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink,
    LearningPreview,
    LearningScene,
    RevealOnScrollDirective,
    TypewriterTextDirective,
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage {
  readonly menuOpen = signal(false);
}

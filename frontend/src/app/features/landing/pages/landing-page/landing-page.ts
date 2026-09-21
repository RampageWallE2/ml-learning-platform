import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { RevealOnScrollDirective } from '../../../../shared/ui/reveal-on-scroll.directive';
import { SiteHeader } from '../../../../shared/ui/site-header/site-header';
import { TypewriterTextDirective } from '../../../../shared/ui/typewriter-text.directive';
import { LearningScene } from './learning-scene';

@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink,
    SiteHeader,
    LearningScene,
    RevealOnScrollDirective,
    TypewriterTextDirective,
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage {
  readonly auth = inject(AuthService);
}

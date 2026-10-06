import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { RevealOnScrollDirective } from '../../../../shared/ui/reveal-on-scroll.directive';
import { SiteHeader } from '../../../../shared/ui/site-header/site-header';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, SiteHeader, RevealOnScrollDirective],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage {
  readonly auth = inject(AuthService);
  readonly previewMode = signal<'lesson' | 'map'>('lesson');
}

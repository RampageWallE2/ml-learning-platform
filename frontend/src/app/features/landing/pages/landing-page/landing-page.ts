import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { RevealOnScrollDirective } from '../../../../shared/ui/reveal-on-scroll.directive';
import { TypewriterTextDirective } from '../../../../shared/ui/typewriter-text.directive';
import { AccountMenu } from '../../../auth/components/account-menu/account-menu';
import { LearningScene } from './learning-scene';

@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink,
    AccountMenu,
    LearningScene,
    RevealOnScrollDirective,
    TypewriterTextDirective,
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage implements OnInit {
  readonly auth = inject(AuthService);

  readonly menuOpen = signal(false);

  ngOnInit(): void {
    this.auth.restoreSession().subscribe();
  }
}

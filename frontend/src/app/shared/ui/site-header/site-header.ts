import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LocationStrategy } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { AccountMenu } from '../account-menu/account-menu';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, AccountMenu],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  readonly auth = inject(AuthService);
  readonly menuOpen = signal(false);

  private readonly router = inject(Router);
  private readonly locationStrategy = inject(LocationStrategy);

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  sectionHref(sectionId: string): string {
    return this.locationStrategy.prepareExternalUrl(`/#${sectionId}`);
  }

  navigateToSection(event: MouseEvent, sectionId: string): void {
    this.closeMenu();

    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();

    void this.router.navigate(['/'], { fragment: sectionId }).then(() => {
      const target = document.getElementById(sectionId);
      const reduceMotion =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

      target?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  }
}

import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal
} from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-account-menu',
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss'
})
export class AccountMenu {
  readonly auth = inject(AuthService);

  private readonly router = inject(Router);
  private readonly element = inject(ElementRef<HTMLElement>);

  readonly menuOpen = signal(false);
  readonly loggingOut = signal(false);
  readonly logoutError = signal<string | null>(null);
  readonly avatarFailed = signal(false);

  readonly initials = computed(() => {
    const user = this.auth.user();
    if (!user) {
      return '';
    }

    const names = user.displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (names.length >= 2) {
      return `${names[0][0]}${names.at(-1)?.[0] ?? ''}`.toUpperCase();
    }

    return (names[0]?.slice(0, 2) ?? user.email[0] ?? '?').toUpperCase();
  });

  toggleMenu(): void {
    this.logoutError.set(null);
    this.menuOpen.update(open => !open);
  }

  markAvatarAsFailed(): void {
    this.avatarFailed.set(true);
  }

  logout(): void {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);
    this.logoutError.set(null);

    this.auth.logout().pipe(
      finalize(() => this.loggingOut.set(false))
    ).subscribe({
      next: () => {
        void this.router.navigate(['/login'], {
          queryParams: {
            loggedOut: 'true'
          }
        });
      },
      error: () => {
        this.logoutError.set(
          'No se pudo cerrar la sesión. Comprueba la conexión e inténtalo nuevamente.'
        );
      }
    });
  }

  @HostListener('document:click', ['$event'])
  closeWhenClickingOutside(event: MouseEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeWithEscape(): void {
    this.menuOpen.set(false);
  }
}

import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-account-menu',
  imports: [RouterLink],
  templateUrl: './account-menu.html',
  styleUrl: './account-menu.scss'
})
export class AccountMenu {
  private static nextPanelId = 0;

  readonly auth = inject(AuthService);
  readonly panelId = `account-menu-panel-${AccountMenu.nextPanelId++}`;

  readonly appearance =
    input<'game' | 'landing'>('game');
  readonly placement = input<'top-right' | 'bottom-left'>('top-right');

  readonly helpAvailable = input(false);
  readonly helpRequested = output<void>();

  private readonly router = inject(Router);
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);

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

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  openHelp(): void {
    if (!this.helpAvailable() || this.appearance() !== 'game') return;
    this.closeMenu();
    // The disclosure disappears while the modal opens. Keep a stable return target.
    this.element.nativeElement.querySelector<HTMLButtonElement>('.account-menu__trigger')?.focus();
    this.helpRequested.emit();
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
        this.closeMenu();
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
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape')
  closeWithEscape(): void {
    if (!this.menuOpen()) {
      return;
    }

    this.closeMenu();
    this.element.nativeElement
      .querySelector<HTMLButtonElement>('.account-menu__trigger')?.focus();
  }
}

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthenticatedUser } from '../../../core/auth/auth.types';
import { AccountMenu } from './account-menu';

describe('AccountMenu', () => {
  const user: AuthenticatedUser = {
    id: 'user-id',
    email: 'ana.torres@example.com',
    displayName: 'Ana Torres',
    avatarUrl: null
  };
  const userState = signal<AuthenticatedUser | null>(user);
  const auth = {
    user: userState.asReadonly(),
    logout: vi.fn(() => of(undefined))
  };
  let router: Router;

  let fixture: ComponentFixture<AccountMenu>;

  beforeEach(async () => {
    userState.set(user);
    auth.logout.mockReset();
    auth.logout.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        { provide: AuthService, useValue: auth },
        provideRouter([]),
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(AccountMenu);
    fixture.detectChanges();
  });

  it('shows a visible account label and initials in the game', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.account-menu__label')?.textContent).toBe('Cuenta');
    expect(element.querySelector('.account-menu__name')).toBeNull();
    expect(element.querySelector('.account-menu__initials')?.textContent)
      .toContain('AT');
  });

  it('supports the expanded landing appearance', () => {
    fixture.componentRef.setInput('appearance', 'landing');
    fixture.componentRef.setInput('helpAvailable', true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.account-menu--landing')).not.toBeNull();
    expect(element.querySelector('.account-menu__name')?.textContent)
      .toContain('Ana Torres');
    expect(element.querySelector('.account-menu__label')).toBeNull();

    element.querySelector<HTMLButtonElement>('.account-menu__trigger')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.account-menu__progress')).toBeNull();
    expect(element.querySelector('.account-menu__help')).toBeNull();
    expect(element.querySelector('.account-menu__logout')).not.toBeNull();
  });

  it('opts into bottom-left placement for the game without changing the default landing placement', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.account-menu--bottom-left')).toBeNull();
    fixture.componentRef.setInput('placement', 'bottom-left'); fixture.detectChanges();
    expect(element.querySelector('.account-menu--bottom-left')).not.toBeNull();
    expect(element.querySelector('.account-menu__arrow')?.textContent?.trim()).toBe('▲');
    element.querySelector<HTMLButtonElement>('.account-menu__trigger')!.click(); fixture.detectChanges();
    expect(element.querySelector('.account-menu__arrow')?.textContent?.trim()).toBe('▼');
    expect(element.querySelector('.account-menu__progress')).not.toBeNull();
  });

  it('offers help only when connected by the world and returns a stable focus target', () => {
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.account-menu__trigger')!;
    trigger.click(); fixture.detectChanges();
    expect(element.querySelector('.account-menu__help')).toBeNull();
    fixture.componentRef.setInput('helpAvailable', true); fixture.detectChanges();
    const requested = vi.fn(); fixture.componentInstance.helpRequested.subscribe(requested);
    const button = element.querySelector<HTMLButtonElement>('.account-menu__help')!;
    expect(button.type).toBe('button');
    expect(button.textContent).toBe('Cómo jugar');
    button.focus(); button.click(); fixture.detectChanges();
    expect(requested).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.menuOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('opens a disclosure with identity and a working progress link, closing it on navigation', () => {
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.account-menu__trigger')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    fixture.detectChanges();

    const panel = element.querySelector<HTMLElement>('.account-menu__panel')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    expect(element.querySelector('[role="menu"], [role="menuitem"]')).toBeNull();
    expect(panel.textContent).toContain(user.displayName);
    expect(panel.textContent).toContain(user.email);

    const link = element.querySelector<HTMLAnchorElement>('.account-menu__progress')!;
    expect(link.getAttribute('href')).toBe('/progress');
    expect(link.textContent).toContain('Mi progreso');
    link.click();
    fixture.detectChanges();

    const target = vi.mocked(router.navigateByUrl).mock.calls[0][0];
    expect(typeof target === 'string' ? target : router.serializeUrl(target)).toBe('/progress');
    expect(fixture.componentInstance.menuOpen()).toBe(false);
    expect(element.querySelector('.account-menu__panel')).toBeNull();
  });

  it('closes on Escape and returns focus to the account trigger', () => {
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLButtonElement>('.account-menu__trigger')!;
    trigger.click();
    fixture.detectChanges();
    element.querySelector<HTMLAnchorElement>('.account-menu__progress')!.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.account-menu__panel')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('does not move focus on Escape when its disclosure is closed', () => {
    const element = fixture.nativeElement as HTMLElement;
    document.body.focus();
    const focused = document.activeElement;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(document.activeElement).toBe(focused);
    expect(document.activeElement).not.toBe(element.querySelector('.account-menu__trigger'));
  });

  it('falls back to initials when the avatar cannot load', () => {
    userState.set({ ...user, avatarUrl: 'https://example.com/avatar.png' });
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLImageElement>('.account-menu__avatar')!
      .dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(element.querySelector('.account-menu__avatar')).toBeNull();
    expect(element.querySelector('.account-menu__initials')?.textContent).toContain('AT');
  });

  it('logs out and redirects to login with a confirmation flag', () => {
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.account-menu__trigger')?.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.account-menu__logout')?.click();

    expect(auth.logout).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { loggedOut: 'true' }
    });
    expect(fixture.componentInstance.menuOpen()).toBe(false);
  });

  it('keeps the menu open and shows an error when logout fails', () => {
    auth.logout.mockReturnValue(
      throwError(() => new Error('Server unavailable'))
    );
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.account-menu__trigger')?.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.account-menu__logout')?.click();
    fixture.detectChanges();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')?.textContent)
      .toContain('No se pudo cerrar la sesión');
    expect(element.querySelector('.account-menu__panel')).not.toBeNull();
  });
});

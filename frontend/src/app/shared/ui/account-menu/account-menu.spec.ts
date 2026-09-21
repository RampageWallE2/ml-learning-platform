import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
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
  const router = {
    navigate: vi.fn(() => Promise.resolve(true))
  };

  let fixture: ComponentFixture<AccountMenu>;

  beforeEach(async () => {
    userState.set(user);
    auth.logout.mockReset();
    auth.logout.mockReturnValue(of(undefined));
    router.navigate.mockClear();

    await TestBed.configureTestingModule({
      imports: [AccountMenu],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountMenu);
    fixture.detectChanges();
  });

  it('shows the user name and initials', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Ana Torres');
    expect(element.querySelector('.account-menu__initials')?.textContent)
      .toContain('AT');
  });

  it('supports the expanded landing appearance', () => {
    fixture.componentRef.setInput('appearance', 'landing');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.account-menu--landing')).not.toBeNull();
    expect(element.querySelector('.account-menu__name')?.textContent)
      .toContain('Ana Torres');
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

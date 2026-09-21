import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthenticatedUser, AuthSessionStatus } from '../../../core/auth/auth.types';
import { SiteHeader } from './site-header';

describe('SiteHeader', () => {
  const userState = signal<AuthenticatedUser | null>(null);
  const statusState = signal<AuthSessionStatus>('anonymous');
  const auth = {
    user: userState.asReadonly(),
    status: statusState.asReadonly(),
    logout: vi.fn(() => of(undefined)),
  };

  beforeEach(async () => {
    userState.set(null);
    statusState.set('anonymous');

    await TestBed.configureTestingModule({
      imports: [SiteHeader],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  it('shows the shared public navigation', () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLImageElement>('.brand-logo')?.src)
      .toContain('assets/branding/exploralab-logo.png');
    expect(element.textContent).toContain('La experiencia');
    expect(element.textContent).toContain('Cómo aprendemos');
    expect(element.querySelector('a[href^="/login"]')).not.toBeNull();
  });

  it('shows progress and the account menu for an authenticated user', () => {
    userState.set({
      id: 'user-id',
      email: 'ana.torres@example.com',
      displayName: 'Ana Torres',
      avatarUrl: null,
    });
    statusState.set('authenticated');

    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('a[href="/progress"]')).not.toBeNull();
    expect(element.querySelector('app-account-menu')?.textContent).toContain('Ana Torres');
  });

  it('opens and closes the responsive navigation', () => {
    const fixture = TestBed.createComponent(SiteHeader);
    fixture.detectChanges();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.menu-toggle',
    );

    toggle?.click();
    fixture.detectChanges();
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');

    toggle?.click();
    fixture.detectChanges();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
  });

  it('uses Angular navigation for landing sections', () => {
    const fixture = TestBed.createComponent(SiteHeader);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    fixture.componentInstance.navigateToSection(new MouseEvent('click'), 'experiencia');

    expect(navigate).toHaveBeenCalledWith(['/'], { fragment: 'experiencia' });
  });
});

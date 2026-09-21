import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import {
  AuthenticatedUser,
  AuthSessionStatus
} from '../../../../core/auth/auth.types';
import { LandingPage } from './landing-page';

describe('LandingPage', () => {
  const userState =
    signal<AuthenticatedUser | null>(null);

  const statusState =
    signal<AuthSessionStatus>('anonymous');

  const auth = {
    user: userState.asReadonly(),
    status: statusState.asReadonly(),
    logout: vi.fn(() => of(undefined))
  };

  beforeEach(async () => {
    userState.set(null);
    statusState.set('anonymous');
    auth.logout.mockReset();
    auth.logout.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth }
      ],
    }).compileComponents();
  });

  it('presents the learning experience and its main call to action', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Los datos se entienden');
    expect(element.querySelector('app-site-header')).not.toBeNull();
    expect(element.querySelector<HTMLImageElement>('.hero-visual img')?.src)
      .toContain('assets/branding/exploralab-mining-world.png');
    expect(element.querySelector('a[href^="/login"]')?.textContent).toContain('Iniciar sesión');
    expect(element.querySelector('#como-funciona')).not.toBeNull();
    expect(element.querySelector('#experiencia')).not.toBeNull();
    expect(element.querySelector<HTMLImageElement>('app-learning-scene img')?.src)
      .toContain('assets/branding/exploralab-experience.png');
    expect(element.querySelector('#metodologia')).not.toBeNull();
    expect(element.querySelector('app-learning-preview')).toBeNull();
    expect(element.querySelector('a[href="/world"]')).toBeNull();
  });

  it('shows the profile and continuation actions for an authenticated user', () => {
    userState.set({
      id: 'user-id',
      email: 'ana.torres@example.com',
      displayName: 'Ana Torres',
      avatarUrl: null
    });
    statusState.set('authenticated');
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-account-menu')?.textContent)
      .toContain('Ana Torres');
    expect(element.querySelector('a[href="/login"]')).toBeNull();
    expect(element.querySelector('a[href="/register"]')).toBeNull();
    expect(element.textContent).not.toContain('Continuar');
    expect(element.querySelector('a[href="/progress"]')?.textContent)
      .toContain('Mi progreso');
    expect(element.querySelectorAll('a[href="/progress"]').length)
      .toBeGreaterThan(2);
    expect(element.querySelector('a[href="/world"]')).toBeNull();
  });

  it('does not flash anonymous actions while checking the session', () => {
    statusState.set('checking');

    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('a[href="/login"]')).toBeNull();
    expect(element.querySelector('a[href="/register"]')).toBeNull();
    expect(element.textContent).toContain('Comprobando sesión');
  });

  it('marks sections for scroll reveal and preserves accessible title text', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const animatedTitles = element.querySelectorAll<HTMLElement>('[appTypewriterText]');

    expect(element.querySelectorAll('[appRevealOnScroll]').length).toBeGreaterThan(5);
    expect(animatedTitles.length).toBe(4);
    expect(animatedTitles[0].getAttribute('aria-label')).toBe(
      'Los datos se entienden cuando los exploras.',
    );
    expect(animatedTitles[0].textContent).toContain('cuando los exploras');
  });
});

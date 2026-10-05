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

  it('uses the shared primary action for account and learning entry points', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const actions = element.querySelectorAll<HTMLAnchorElement>('a.button');

    expect(actions).toHaveLength(3);
    for (const action of actions) {
      expect(action.classList.contains('btn')).toBe(true);
      expect(action.classList.contains('btn--primary')).toBe(true);
      expect(action.getAttribute('href')).toContain('/register');
    }
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

  it('offers responsive WebP illustrations while retaining the original PNG fallbacks', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    for (const [selector, name, widths, dimensions] of [
      ['.hero-visual', 'exploralab-mining-world', [640, 960, 1536], [1536, 1024]],
      ['app-learning-scene', 'exploralab-experience', [640, 960, 1254], [1254, 1254]],
    ] as const) {
      const source = element.querySelector(`${selector} picture source`)!;
      const image = element.querySelector<HTMLImageElement>(`${selector} picture img`)!;
      expect(source.getAttribute('type')).toBe('image/webp');
      const candidates = source.getAttribute('srcset')?.replace(/\s+/g, ' ');
      for (const width of widths) {
        expect(candidates).toContain(`assets/branding/${name}-${width}.webp ${width}w`);
      }
      expect(source.getAttribute('sizes')).toContain('100vw');
      expect(image.getAttribute('src')).toBe(`assets/branding/${name}.png`);
      expect([image.width, image.height]).toEqual(dimensions);
      expect(image.alt.length).toBeGreaterThan(10);
      expect(image.getAttribute('decoding')).toBe('async');
    }
  });

  it('prioritizes the hero and defers the experience and footer images', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const hero = element.querySelector<HTMLImageElement>('.hero-visual img')!;
    expect(hero.getAttribute('loading')).toBe('eager');
    expect(hero.getAttribute('fetchpriority')).toBe('high');
    expect(element.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);

    for (const selector of ['app-learning-scene img', 'footer .brand img']) {
      const image = element.querySelector(selector)!;
      expect(image.getAttribute('loading')).toBe('lazy');
      expect(image.getAttribute('decoding')).toBe('async');
      expect(image.hasAttribute('fetchpriority')).toBe(false);
    }
  });

  it('reuses the lightweight header logo in the footer without changing the accessible brand name', () => {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const headerSource = element.querySelector('app-site-header .brand source')!;
    const footerSource = element.querySelector('footer .brand source')!;
    expect(headerSource.getAttribute('srcset')).toBe('assets/branding/exploralab-logo-540.webp');
    expect(footerSource.getAttribute('srcset')).toBe(headerSource.getAttribute('srcset'));
    expect(footerSource.getAttribute('type')).toBe('image/webp');
    expect(element.querySelector('footer .brand')?.getAttribute('aria-label')).toBe('ExploraLab, inicio');
    expect(element.querySelector('footer .brand img')?.getAttribute('alt')).toBe('');
  });
});

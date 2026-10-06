import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { AuthenticatedUser, AuthSessionStatus } from '../../../../core/auth/auth.types';
import { LandingPage } from './landing-page';

describe('LandingPage', () => {
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
    auth.logout.mockReset();
    auth.logout.mockReturnValue(of(undefined));
    await TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('presents ExploraLab and a real panorama without limiting the platform to Open Pit', () => {
    const { element } = render();
    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelector('h1')?.textContent).toContain('Entiende los datos.');
    expect(element.querySelector('.hero-brand')?.textContent).toBe('ExploraLab');
    expect(element.querySelector('.lead')?.textContent).toContain('Explora escenarios');
    expect(element.querySelector('.hero')?.textContent).not.toMatch(/9\s+(clases|lecciones)/i);
    expect(element.querySelector('app-site-header')).not.toBeNull();
    expect(element.querySelector('.hero-visual figcaption')?.textContent).toContain(
      'Experiencia disponible',
    );
    expect(element.querySelector<HTMLImageElement>('.hero-visual img')?.getAttribute('src')).toBe(
      'assets/branding/exploralab-open-pit-map.png',
    );
    expect(element.querySelector('app-learning-scene')).toBeNull();
    expect(element.querySelector('canvas')).toBeNull();
  });

  it('preserves navigation anchors and uses a purpose-driven description of Open Pit', () => {
    const { element } = render();
    for (const id of ['contenido', 'experiencia', 'metodologia', 'como-funciona']) {
      expect(element.querySelector('#' + id)).not.toBeNull();
    }
    expect(element.querySelector('.skip')?.getAttribute('href')).toBe('#contenido');
    expect(element.querySelector('.hero-actions .text-link')?.getAttribute('href')).toBe(
      '#experiencia',
    );
    expect(element.querySelector('.experience-copy')?.textContent).toContain(
      'preparar el siguiente turno',
    );
    expect(element.querySelector('.experience-note')?.textContent).toContain('dispersión de datos');
  });

  it('marks future scenarios as planned rather than playable or dated', () => {
    const { element } = render();
    const future = element.querySelector('.future-note')!;
    expect(future.textContent).toContain('Nuevos escenarios en planificación.');
    expect(future.querySelector('a, button')).toBeNull();
    expect(element.querySelector('a[href="/world"]')).toBeNull();
  });

  it('keeps registration actions and the progress return URL for anonymous visitors', () => {
    const { element } = render();
    const actions = element.querySelectorAll<HTMLAnchorElement>('a.button');
    expect(actions).toHaveLength(3);
    for (const action of actions) {
      expect(action.classList.contains('btn')).toBe(true);
      expect(action.classList.contains('btn--brand')).toBe(true);
      expect(action.classList.contains('btn--primary')).toBe(false);
      const url = new URL(action.href);
      expect(url.pathname).toBe('/register');
      expect(url.searchParams.get('returnUrl')).toBe('/progress');
    }
    expect(element.querySelector('a[href^="/login"]')?.textContent).toContain('Iniciar sesión');
    expect(element.querySelector('a[href="/progress"]')).toBeNull();
  });

  it('preserves the profile and progress actions for authenticated users', () => {
    userState.set({
      id: 'user-id',
      email: 'ana.torres@example.com',
      displayName: 'Ana Torres',
      avatarUrl: null,
    });
    statusState.set('authenticated');
    const { element } = render();
    expect(element.querySelector('app-account-menu')?.textContent).toContain('Ana Torres');
    expect(element.querySelector('a[href^="/login"]')).toBeNull();
    expect(element.querySelector('a[href^="/register"]')).toBeNull();
    expect(element.querySelectorAll('a[href="/progress"]').length).toBeGreaterThan(2);
    expect(element.querySelector('.hero-actions a[href="/progress"]')?.textContent).toContain(
      'Ver mi progreso',
    );
    for (const action of element.querySelectorAll('a.button')) {
      expect(action.classList.contains('btn--brand')).toBe(true);
      expect(action.classList.contains('btn--primary')).toBe(false);
    }
    expect(element.querySelector('a[href="/world"]')).toBeNull();
  });

  it.each(['unknown', 'checking'] as const)(
    'does not flash account or registration actions while session status is %s',
    (status) => {
      statusState.set(status);
      const { element } = render();
      expect(element.querySelector('a[href^="/login"]')).toBeNull();
      expect(element.querySelector('a[href^="/register"]')).toBeNull();
      expect(element.textContent).toContain('Comprobando sesión');
    },
  );

  it('keeps entry actions available when session restoration is temporarily unavailable', () => {
    statusState.set('unavailable');
    const { element } = render();
    expect(element.querySelector('.hero-actions a[href^="/register"]')).not.toBeNull();
    expect(element.textContent).not.toContain('Comprobando sesión');
  });

  it('starts with a clearly labeled genuine lesson preview rather than an embedded game', () => {
    const { element } = render();
    const buttons = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.preview-controls button'),
    );
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'El escenario',
      'Una actividad',
    ]);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    for (const button of buttons) {
      expect(button.type).toBe('button');
      expect(button.getAttribute('aria-controls')).toBe('game-preview');
    }
    expect(element.querySelector('#game-preview img')?.getAttribute('src')).toBe(
      'assets/branding/exploralab-open-pit-lesson.png',
    );
    expect(element.querySelector('#game-preview figcaption')?.textContent).toContain('clase 7');
    expect(element.querySelector('#game-preview figcaption')?.textContent).toContain(
      'Las actividades se realizan dentro del juego.',
    );
  });

  it('switches the image, selected control and announced caption together', () => {
    const { fixture, element } = render();
    const buttons = element.querySelectorAll<HTMLButtonElement>('.preview-controls button');
    buttons[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.previewMode()).toBe('map');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
    expect(element.querySelector('#game-preview img')?.getAttribute('src')).toBe(
      'assets/branding/exploralab-open-pit-map.png',
    );
    expect(element.querySelector('#game-preview figcaption')?.textContent).toContain(
      'explora el mapa',
    );

    buttons[1].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.previewMode()).toBe('lesson');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelectorAll('#game-preview img')).toHaveLength(1);
    expect(element.querySelector('#game-preview img')?.getAttribute('src')).toBe(
      'assets/branding/exploralab-open-pit-lesson.png',
    );
    expect(element.querySelector('#game-preview figcaption')?.getAttribute('aria-live')).toBe(
      'polite',
    );
    expect(element.querySelector('#game-preview figcaption')?.getAttribute('aria-atomic')).toBe(
      'true',
    );
  });

  it('provides complete accessible headings without repeated typewriter effects', () => {
    const { element } = render();
    expect(element.querySelectorAll('[appRevealOnScroll]').length).toBeGreaterThan(5);
    expect(element.querySelector('[appTypewriterText]')).toBeNull();
    const section = element.querySelector('.hero')!;
    expect(section.getAttribute('aria-labelledby')).toBe('hero-title');
    expect(element.querySelector('#hero-title')?.textContent).toBe(
      'Entiende los datos.Descubre lo que cuentan.',
    );
    for (const id of ['experience-title', 'method-title', 'invitation-title']) {
      expect(element.querySelector('#' + id)).not.toBeNull();
      expect(element.querySelector('[aria-labelledby="' + id + '"]')).not.toBeNull();
    }
  });

  it('uses responsive WebP screenshots with PNG fallbacks, dimensions and descriptions', () => {
    const { element } = render();
    for (const [selector, name, widths, dimensions] of [
      ['.hero-visual', 'exploralab-open-pit-map', [640, 960, 1536], [1536, 768]],
      ['#game-preview', 'exploralab-open-pit-lesson', [480, 960], [962, 691]],
    ] as const) {
      const source = element.querySelector(selector + ' source')!;
      const image = element.querySelector<HTMLImageElement>(selector + ' img')!;
      expect(source.getAttribute('type')).toBe('image/webp');
      const candidates = source.getAttribute('srcset')?.replace(/\s+/g, ' ');
      for (const width of widths) {
        expect(candidates).toContain(
          'assets/branding/' + name + '-' + width + '.webp ' + width + 'w',
        );
      }
      expect(source.getAttribute('sizes')).toContain('100vw');
      expect(image.getAttribute('src')).toBe('assets/branding/' + name + '.png');
      expect([image.width, image.height]).toEqual(dimensions);
      expect(image.alt.length).toBeGreaterThan(20);
      expect(image.getAttribute('decoding')).toBe('async');
    }
  });

  it('prioritizes the panorama and lazy loads the preview and footer', () => {
    const { fixture, element } = render();
    const hero = element.querySelector<HTMLImageElement>('.hero-visual img')!;
    expect(hero.getAttribute('loading')).toBe('eager');
    expect(hero.getAttribute('fetchpriority')).toBe('high');
    expect(element.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
    for (const selector of ['#game-preview img', 'footer .brand img']) {
      const image = element.querySelector(selector)!;
      expect(image.getAttribute('loading')).toBe('lazy');
      expect(image.getAttribute('decoding')).toBe('async');
      expect(image.hasAttribute('fetchpriority')).toBe(false);
    }
    fixture.componentInstance.previewMode.set('map');
    fixture.detectChanges();
    expect(element.querySelector('#game-preview img')?.getAttribute('loading')).toBe('lazy');
    expect(element.querySelectorAll('img[fetchpriority="high"]')).toHaveLength(1);
  });

  it('reuses the existing lightweight logo and accessible brand name', () => {
    const { element } = render();
    const headerSource = element.querySelector('app-site-header .brand source')!;
    const footerSource = element.querySelector('footer .brand source')!;
    expect(headerSource.getAttribute('srcset')).toBe('assets/branding/exploralab-logo-540.webp');
    expect(footerSource.getAttribute('srcset')).toBe(headerSource.getAttribute('srcset'));
    expect(footerSource.getAttribute('type')).toBe('image/webp');
    expect(element.querySelector('footer .brand')?.getAttribute('aria-label')).toBe(
      'ExploraLab, inicio',
    );
    expect(element.querySelector('footer .brand img')?.getAttribute('alt')).toBe('');
  });
});

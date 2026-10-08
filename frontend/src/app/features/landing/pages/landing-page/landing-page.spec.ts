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

  it('presents a simple educational landing without limiting the platform to Open Pit', () => {
    const { element } = render();
    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelector('h1')?.textContent).toContain('Entiende los datos.');
    expect(element.querySelector('.hero-brand')?.textContent).toBe('ExploraLab');
    expect(element.querySelector('.lead')?.textContent).toContain('leer datos de la minería');
    expect(element.querySelector('.hero')?.textContent).not.toMatch(/9\s+(clases|lecciones)/i);
    expect(element.querySelector('app-site-header')).not.toBeNull();
    expect(element.querySelector('.hero img, .hero figure')).toBeNull();
    expect(element.querySelector('app-learning-scene')).toBeNull();
    expect(element.querySelector('canvas')).toBeNull();
  });

  it('preserves navigation anchors and explains mining AI in simple language', () => {
    const { element } = render();
    for (const id of ['contenido', 'experiencia', 'metodologia', 'como-funciona']) {
      expect(element.querySelector('#' + id)).not.toBeNull();
    }
    expect(element.querySelector('.skip')?.getAttribute('href')).toBe('#contenido');
    expect(element.querySelector('.hero-actions .text-link')?.getAttribute('href')).toBe(
      '#experiencia',
    );
    expect(element.querySelector('.experience-copy')?.textContent).toContain(
      'La inteligencia artificial (IA) busca patrones',
    );
    expect(element.querySelector('.experience-note')?.textContent).toContain(
      'Entender los datos es el primer paso.',
    );
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

  it('replaces exercises with three brief, non-interactive mining applications', () => {
    const { element } = render();
    const applications = element.querySelectorAll('.mining-applications article');
    expect(applications).toHaveLength(3);
    expect(Array.from(applications, (article) => article.querySelector('h3')?.textContent)).toEqual(
      ['Anticipar fallas', 'Mejorar el proceso', 'Usar mejor los recursos'],
    );
    for (const article of applications) {
      expect(article.querySelector('p')?.textContent?.trim().length).toBeLessThan(100);
      expect(article.querySelector('button, input, select, img, canvas')).toBeNull();
    }
    expect(element.querySelector('#game-preview, .preview-controls')).toBeNull();
  });

  it('distinguishes learning to read data from industrial uses of AI and links the source', () => {
    const { element } = render();
    expect(element.querySelector('.experience-note')?.textContent).toContain(
      'En ExploraLab practicas cómo leerlos y compararlos',
    );
    const source = element.querySelector<HTMLAnchorElement>('.industry-source')!;
    expect(source.href).toBe(
      'https://www.bhp.com/news/bhp-insights/2024/08/artificial-intelligence-is-unearthing-a-smarter-future',
    );
    expect(source.target).toBe('_blank');
    expect(source.rel).toContain('noopener');
    expect(source.getAttribute('aria-label')).toContain('en inglés, abre una nueva pestaña');
    expect(element.querySelector('.experience')?.textContent).not.toMatch(/asistente|tutor de IA/i);
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

  it('does not include or request Open Pit imagery anywhere on the landing', () => {
    const { element } = render();
    expect(element.querySelectorAll('main img, main source')).toHaveLength(0);
    expect(element.querySelector('[src*="open-pit"], [srcset*="open-pit"]')).toBeNull();
    expect(element.querySelector('link[rel="preload"]')).toBeNull();
  });

  it('keeps only brand imagery and lazy loads the footer logo', () => {
    const { element } = render();
    expect(element.querySelectorAll('img')).toHaveLength(2);
    const footer = element.querySelector('footer .brand img')!;
    expect(footer.getAttribute('loading')).toBe('lazy');
    expect(footer.getAttribute('decoding')).toBe('async');
    expect(element.querySelector('[fetchpriority="high"]')).toBeNull();
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

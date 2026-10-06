import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { routes } from '../../../../../app.routes';
import { authGuard } from '../../../../../core/auth/auth.guard';
import { AuthService } from '../../../../../core/auth/auth.service';
import { AuthenticatedUser, AuthSessionStatus } from '../../../../../core/auth/auth.types';
import { ProgressService } from '../../progress.service';
import { ZoneProgress } from '../../progress.types';
import { ProgressPage } from './progress-page';

describe('ProgressPage', () => {
  const user: AuthenticatedUser = {
    id: 'user-id',
    email: 'ana.torres@example.com',
    displayName: 'Ana Torres',
    avatarUrl: null,
  };

  const userState = signal<AuthenticatedUser | null>(user);

  const statusState = signal<AuthSessionStatus>('authenticated');

  const zoneState = signal<ZoneProgress[]>([
    {
      id: 'zone-01',
      name: 'Open Pit',
      topic: 'Dispersión',
      completedLessons: 1,
      totalLessons: 3,
      percentage: 33,
      completed: false,
      lessons: [
        {
          lessonId: 'lesson-01',
          name: 'Carguío en el fondo del tajo',
          objective: 'Objetivo 1',
          status: 'completed',
        },
        {
          lessonId: 'lesson-02',
          name: 'Control de turnos en la rampa',
          objective: 'Ve a la rampa.',
          status: 'current',
        },
        {
          lessonId: 'lesson-03',
          name: 'Puesto de control de acarreo',
          objective: 'Objetivo 3',
          status: 'pending',
        },
      ],
    },
  ]);

  const initialZone = zoneState()[0];
  const routeParams = new BehaviorSubject(convertToParamMap({ zoneId: 'zone-01' }));

  // Segundo escenario solo en pruebas, sin registrarlo como contenido disponible.
  const otherZone: ZoneProgress = {
    id: 'test-zone',
    name: 'Escenario de prueba',
    topic: 'Otro tema',
    completedLessons: 0,
    totalLessons: 1,
    percentage: 0,
    completed: false,
    lessons: [{
      lessonId: 'test-lesson',
      name: 'Otra clase',
      objective: 'Otro objetivo',
      status: 'pending',
    }],
  };

  const progress = {
    zoneProgress: zoneState.asReadonly(),
    loadProgress: vi.fn(() => of(undefined)),
  };

  const auth = {
    user: userState.asReadonly(),
    status: statusState.asReadonly(),
    logout: vi.fn(() => of(undefined)),
  };

  let fixture: ComponentFixture<ProgressPage>;

  beforeEach(async () => {
    userState.set(user);
    routeParams.next(convertToParamMap({ zoneId: 'zone-01' }));
    zoneState.set([
      { ...initialZone, lessons: initialZone.lessons.map((lesson) => ({ ...lesson })) },
    ]);
    progress.loadProgress.mockReset();
    progress.loadProgress.mockReturnValue(of(undefined));
    auth.logout.mockReset();
    auth.logout.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [ProgressPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: routeParams.asObservable(),
            snapshot: { paramMap: routeParams.value },
          },
        },
        { provide: ProgressService, useValue: progress },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressPage);
  });

  it('lists scenarios first without fetching or exposing personal progress', () => {
    routeParams.next(convertToParamMap({}));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const scenario = element.querySelector<HTMLAnchorElement>('.scenario-link')!;

    expect(progress.loadProgress).not.toHaveBeenCalled();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Mi progreso');
    expect(element.textContent).toContain('Selecciona un escenario');
    expect(scenario.getAttribute('href')).toBe('/progress/zone-01');
    expect(scenario.getAttribute('aria-label')).toBe('Ver mi progreso en Open Pit');
    expect(scenario.querySelector('h2')?.textContent).toBe('Open Pit');
    expect(scenario.querySelector('picture source')?.getAttribute('type')).toBe('image/webp');
    expect(scenario.querySelector('img')?.getAttribute('src')).toBe(
      'assets/branding/exploralab-mining-world.png',
    );
    expect(
      scenario.querySelector('.scenario-image')?.classList.contains('scenario-image--pit'),
    ).toBe(true);
    expect(scenario.querySelector('picture source')?.getAttribute('srcset')).toContain(
      'exploralab-mining-world-640.webp 640w',
    );
    expect(scenario.querySelector('picture source')?.getAttribute('srcset')).toContain(
      'exploralab-mining-world-960.webp 960w',
    );
    expect(scenario.querySelector('img')?.getAttribute('height')).toBe('1024');
    expect(scenario.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(element.querySelector('.scenario-action')?.classList.contains('btn--brand')).toBe(true);
    expect(element.querySelector('[role="progressbar"]')).toBeNull();
    expect(element.querySelector('.lesson-list')).toBeNull();
    expect(element.querySelector('.next-step')).toBeNull();
    expect(element.querySelector('main a[href="/world"]')).toBeNull();
    expect(element.textContent).not.toContain('33%');
  });

  it('lists only available scenarios and links each one to its own detail', () => {
    routeParams.next(convertToParamMap({}));
    zoneState.set([initialZone, otherZone]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const links = element.querySelectorAll('.scenario-link');

    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('/progress/zone-01');
    expect(links[1].getAttribute('href')).toBe('/progress/test-zone');
    expect(links[1].querySelector('.scenario-image--placeholder')).not.toBeNull();
    expect(links[1].querySelector('img')).toBeNull();
    expect(element.querySelector('.lesson-list')).toBeNull();
  });

  it('loads and presents the Open Pit progress', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(progress.loadProgress).toHaveBeenCalledOnce();
    expect(element.querySelector('app-site-header')).not.toBeNull();
    expect(element.textContent).toContain('Dispersión');
    expect(element.textContent).toContain('1 de 3 clases completadas');
    expect(element.textContent).toContain('33%');
    expect(element.textContent).toContain('✓ Completada');
    expect(element.textContent).toContain('● Siguiente');
    expect(element.textContent).toContain('Ve a la rampa.');
    expect(element.querySelector('.back')?.getAttribute('href')).toBe('/progress');
    expect(element.querySelector('[role="progressbar"]')?.getAttribute('aria-label')).toBe(
      'Progreso de Open Pit',
    );
    expect(element.querySelector('.scenario-list')).toBeNull();
  });

  it('shows an error and retries loading progress', () => {
    progress.loadProgress.mockReturnValueOnce(throwError(() => new Error('Network error')));

    fixture.detectChanges();
    let element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar');
    expect(element.querySelector('.lesson-list')).toBeNull();
    expect(element.querySelector('.next-step')).toBeNull();
    expect(
      element.querySelector('.state-card--error button')?.classList.contains('btn--secondary'),
    ).toBe(true);

    element.querySelector<HTMLButtonElement>('.state-card--error button')?.click();
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;

    expect(progress.loadProgress).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Dispersión');
  });

  it('puts the next objective before the lesson list', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const nextStep = element.querySelector('.next-step')!;
    const lessonRoute = element.querySelector('.lesson-route')!;

    expect(
      nextStep.compareDocumentPosition(lessonRoute) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(nextStep.querySelector('h2')?.textContent).toBe('Control de turnos en la rampa');
    expect(nextStep.textContent).toContain('Ve a la rampa.');
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Open Pit');
  });

  it('has one clearly labelled primary action that opens the world, not a lesson', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const links = element.querySelectorAll<HTMLAnchorElement>('main a[href="/world"]');

    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain('Continuar en el mundo');
    expect(links[0].classList.contains('btn--brand')).toBe(true);
    expect(links[0].classList.contains('btn--primary')).toBe(false);
    expect(element.textContent).not.toContain('Ir a la clase');
  });

  it('presents an ordered list with an accessible current step and unchanged statuses', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const lessons = element.querySelectorAll('ol.lesson-list > li');

    expect(lessons).toHaveLength(3);
    expect(lessons[0].classList.contains('lesson--completed')).toBe(true);
    expect(lessons[0].hasAttribute('aria-current')).toBe(false);
    expect(lessons[1].getAttribute('aria-current')).toBe('step');
    expect(lessons[1].classList.contains('lesson--current')).toBe(true);
    expect(lessons[2].hasAttribute('aria-current')).toBe(false);
    expect(lessons[2].textContent).toContain('○ Pendiente');
    const progressBar = element.querySelector('[role="progressbar"]')!;
    expect(progressBar.getAttribute('aria-valuenow')).toBe('33');
    expect(progressBar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressBar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('keeps the loading status visible until progress arrives', () => {
    const response = new Subject<undefined>();
    progress.loadProgress.mockReturnValue(response);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Consultando tu recorrido',
    );
    expect(element.querySelector('.lesson-list')).toBeNull();
    expect(element.querySelector('.next-step')).toBeNull();

    response.next(undefined);
    response.complete();
    fixture.detectChanges();

    expect(element.querySelector('[role="status"]')).toBeNull();
    expect(element.querySelectorAll('.lesson')).toHaveLength(3);
  });

  it('shows the first objective for a new learner with zero completed lessons', () => {
    zoneState.set([
      {
        ...initialZone,
        completedLessons: 0,
        percentage: 0,
        lessons: initialZone.lessons.map((lesson, index) => ({
          ...lesson,
          status: index === 0 ? 'current' : 'pending',
        })),
      },
    ]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.next-step h2')?.textContent).toBe(
      'Carguío en el fondo del tajo',
    );
    expect(element.textContent).toContain('0 de 3 clases completadas');
    expect(element.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('0');
    expect(element.querySelectorAll('.lesson--completed')).toHaveLength(0);
    expect(element.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  });

  it('shows completion without inventing a next objective', () => {
    zoneState.set([
      {
        ...initialZone,
        completedLessons: initialZone.totalLessons,
        percentage: 100,
        completed: true,
        lessons: initialZone.lessons.map((lesson) => ({ ...lesson, status: 'completed' })),
      },
    ]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const completion = element.querySelector('.next-step--completed')!;

    expect(completion.textContent).toContain('Terminaste las clases de esta zona.');
    expect(completion.querySelector('a')?.textContent).toContain('Volver al mundo');
    expect(completion.querySelector('a')?.getAttribute('href')).toBe('/world');
    expect(completion.querySelector('a')?.classList.contains('btn--brand')).toBe(true);
    expect(completion.querySelector('a')?.classList.contains('btn--primary')).toBe(false);
    expect(element.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe(
      '100',
    );
    expect(element.querySelectorAll('.lesson--completed')).toHaveLength(3);
    expect(element.querySelector('[aria-current]')).toBeNull();
    expect(element.textContent).not.toContain('SIGUIENTE OBJETIVO');
  });

  it('shows only the selected scenario and does not mistake pending lessons for completion', () => {
    zoneState.set([initialZone, otherZone]);
    routeParams.next(convertToParamMap({ zoneId: otherZone.id }));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const main = element.querySelector('main')!;

    expect(main.querySelector('h1')?.textContent?.trim()).toBe(otherZone.name);
    expect(main.textContent).toContain('0 de 1 clases completadas');
    expect(main.querySelectorAll('.lesson')).toHaveLength(1);
    expect(main.textContent).toContain('Otra clase');
    expect(main.textContent).not.toContain('Control de turnos en la rampa');
    expect(main.textContent).not.toContain('Dispersión');
    expect(main.textContent).toContain('Aún tienes clases por completar.');
    expect(main.querySelector('.next-step--completed')).toBeNull();
  });

  it('reacts to a change of scenario while the same route component is reused', () => {
    zoneState.set([initialZone, otherZone]);
    fixture.detectChanges();
    routeParams.next(convertToParamMap({ zoneId: otherZone.id }));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent?.trim()).toBe(otherZone.name);
    expect(element.querySelectorAll('.lesson')).toHaveLength(1);
    expect(progress.loadProgress).toHaveBeenCalledTimes(2);
  });

  it('does not reload merely because personal progress changed', () => {
    fixture.detectChanges();
    zoneState.set([{ ...initialZone, percentage: 67, completedLessons: 2 }]);
    fixture.detectChanges();

    expect(progress.loadProgress).toHaveBeenCalledOnce();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('67');
  });

  it('explains an unknown scenario without showing another scenario or fetching its progress', () => {
    routeParams.next(convertToParamMap({ zoneId: 'unknown-zone' }));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(progress.loadProgress).not.toHaveBeenCalled();
    expect(element.textContent).toContain('No encontramos este escenario.');
    expect(element.querySelector('.back')?.getAttribute('href')).toBe('/progress');
    expect(element.querySelector('.lesson-list')).toBeNull();
    expect(element.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('explains an empty scenario list without inventing future content', () => {
    routeParams.next(convertToParamMap({}));
    zoneState.set([]);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Todavía no hay escenarios disponibles.');
    expect(element.querySelector('.scenario-link')).toBeNull();
    expect(progress.loadProgress).not.toHaveBeenCalled();
  });

  it('cancels a pending request when returning to the scenario list', () => {
    const response = new Subject<undefined>();
    progress.loadProgress.mockReturnValue(response);
    fixture.detectChanges();
    expect(response.observed).toBe(true);

    routeParams.next(convertToParamMap({}));
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(response.observed).toBe(false);
    expect(element.querySelector('.scenario-list')).not.toBeNull();
    expect(element.querySelector('.state-marker')).toBeNull();
  });
});

describe('ProgressPage navigation', () => {
  const progress = {
    zoneProgress: signal<ZoneProgress[]>([
      {
        id: 'zone-01',
        name: 'Open Pit',
        topic: 'Dispersión',
        completedLessons: 0,
        totalLessons: 1,
        percentage: 0,
        completed: false,
        lessons: [{
          lessonId: 'lesson-01',
          name: 'Primera clase',
          objective: 'Ir al tajo',
          status: 'current',
        }],
      },
    ]),
    loadProgress: vi.fn(() => of(undefined)),
  };
  const auth = {
    user: signal<AuthenticatedUser | null>(null),
    status: signal<AuthSessionStatus>('authenticated'),
    restoreSession: vi.fn(() => of(true)),
  };

  beforeEach(async () => {
    progress.loadProgress.mockClear();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: auth },
        { provide: ProgressService, useValue: progress },
      ],
    }).compileComponents();
  });

  it('opens the selected detail from the list and can return to the list', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/progress', ProgressPage);
    expect(progress.loadProgress).not.toHaveBeenCalled();
    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.scenario-link')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/progress/zone-01');
    expect(harness.routeNativeElement!.querySelector('h1')?.textContent?.trim()).toBe('Open Pit');
    expect(harness.routeNativeElement!.querySelector('.lesson-list')).not.toBeNull();
    expect(progress.loadProgress).toHaveBeenCalledOnce();

    harness.routeNativeElement!.querySelector<HTMLAnchorElement>('.back')!.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/progress');
    expect(harness.routeNativeElement!.querySelector('.scenario-list')).not.toBeNull();
    expect(harness.routeNativeElement!.querySelector('.lesson-list')).toBeNull();
  });

  it('supports opening the detail directly without requiring a previous selection', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/progress/zone-01', ProgressPage);

    expect(harness.routeNativeElement!.querySelector('h1')?.textContent?.trim()).toBe('Open Pit');
    expect(progress.loadProgress).toHaveBeenCalledOnce();
  });

  it('keeps both list and scenario detail protected by the existing authentication guard', () => {
    for (const path of ['progress', 'progress/:zoneId']) {
      expect(routes.find((route) => route.path === path)?.canActivate).toEqual([authGuard]);
    }
  });
});

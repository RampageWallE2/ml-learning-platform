import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

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
        { provide: ProgressService, useValue: progress },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressPage);
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
    expect(element.querySelector('h1')?.textContent).toBe('Mi progreso');
  });

  it('has one clearly labelled primary action that opens the world, not a lesson', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const links = element.querySelectorAll<HTMLAnchorElement>('main a[href="/world"]');

    expect(links).toHaveLength(1);
    expect(links[0].textContent).toContain('Continuar en el mundo');
    expect(links[0].classList.contains('btn--primary')).toBe(true);
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
    expect(element.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe(
      '100',
    );
    expect(element.querySelectorAll('.lesson--completed')).toHaveLength(3);
    expect(element.querySelector('[aria-current]')).toBeNull();
    expect(element.textContent).not.toContain('SIGUIENTE OBJETIVO');
  });
});

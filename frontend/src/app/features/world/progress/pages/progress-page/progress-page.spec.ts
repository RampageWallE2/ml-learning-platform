import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../../../core/auth/auth.service';
import { AuthenticatedUser } from '../../../../../core/auth/auth.types';
import { ProgressService } from '../../progress.service';
import { ZoneProgress } from '../../progress.types';
import { ProgressPage } from './progress-page';


describe('ProgressPage', () => {
  const user: AuthenticatedUser = {
    id: 'user-id',
    email: 'ana.torres@example.com',
    displayName: 'Ana Torres',
    avatarUrl: null
  };

  const userState =
    signal<AuthenticatedUser | null>(user);

  const zoneState =
    signal<ZoneProgress[]>([{
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
          status: 'completed'
        },
        {
          lessonId: 'lesson-02',
          name: 'Control de turnos en la rampa',
          objective: 'Ve a la rampa.',
          status: 'current'
        },
        {
          lessonId: 'lesson-03',
          name: 'Puesto de control de acarreo',
          objective: 'Objetivo 3',
          status: 'pending'
        }
      ]
    }]);

  const progress = {
    zoneProgress: zoneState.asReadonly(),
    loadProgress: vi.fn(() => of(undefined))
  };

  const auth = {
    user: userState.asReadonly(),
    logout: vi.fn(() => of(undefined))
  };

  let fixture: ComponentFixture<ProgressPage>;

  beforeEach(async () => {
    userState.set(user);
    progress.loadProgress.mockReset();
    progress.loadProgress.mockReturnValue(of(undefined));
    auth.logout.mockReset();
    auth.logout.mockReturnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [ProgressPage],
      providers: [
        provideRouter([]),
        { provide: ProgressService, useValue: progress },
        { provide: AuthService, useValue: auth }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressPage);
  });


  it('loads and presents the Open Pit progress', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(progress.loadProgress).toHaveBeenCalledOnce();
    expect(element.textContent).toContain('Dispersión');
    expect(element.textContent).toContain('1 de 3 clases completadas');
    expect(element.textContent).toContain('33%');
    expect(element.textContent).toContain('✓ Completada');
    expect(element.textContent).toContain('● Siguiente');
    expect(element.textContent).toContain('Ve a la rampa.');
  });


  it('shows an error and retries loading progress', () => {
    progress.loadProgress.mockReturnValueOnce(
      throwError(() => new Error('Network error'))
    );

    fixture.detectChanges();
    let element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[role="alert"]')?.textContent)
      .toContain('No se pudo cargar');

    element
      .querySelector<HTMLButtonElement>(
        '.state-card--error button'
      )
      ?.click();
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;

    expect(progress.loadProgress).toHaveBeenCalledTimes(2);
    expect(element.textContent).toContain('Dispersión');
  });
});

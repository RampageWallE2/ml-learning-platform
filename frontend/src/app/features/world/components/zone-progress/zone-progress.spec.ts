import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ZoneProgress as ZoneProgressData } from '../../progress/progress.types';
import { ZoneProgress } from './zone-progress';

describe('ZoneProgress — mission first', () => {
  let fixture: ComponentFixture<ZoneProgress>;
  let root: HTMLElement;
  let zone: ZoneProgressData;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ZoneProgress] });
    zone = {
      id: 'zone01',
      name: 'Open Pit',
      topic: 'Dispersión',
      completedLessons: 2,
      totalLessons: 4,
      percentage: 50,
      completed: false,
      lessons: [
        { lessonId: 'c1', name: 'Carguío', objective: 'Ve al tajo.', status: 'completed' },
        { lessonId: 'c2', name: 'Turnos', objective: 'Ve a la rampa.', status: 'completed' },
        {
          lessonId: 'c3',
          name: 'Descarga',
          objective: 'Ve al botadero y habla con su encargado.',
          status: 'current',
        },
        { lessonId: 'c4', name: 'Mantenimiento', objective: 'Ve al taller.', status: 'pending' },
      ],
    };
    fixture = TestBed.createComponent(ZoneProgress);
    fixture.componentRef.setInput('name', zone.name);
    fixture.componentRef.setInput('topic', zone.topic);
    fixture.componentRef.setInput('objective', zone.lessons[2].objective);
    fixture.componentRef.setInput('shortObjective', 'Ve al botadero');
    fixture.componentRef.setInput('zone', zone);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  it('shows the brief next objective in the button and keeps the full instruction in the collapsed details', () => {
    expect(root.querySelector('.progress-next-objective')?.textContent).toBe('Ve al botadero');
    expect(root.querySelector('.progress-step')?.textContent).toContain('C3');
    expect(root.querySelector<HTMLElement>('.progress-content')?.hidden).toBe(true);
    expect(root.querySelector('.progress-toggle')?.contains(root.querySelector('h2'))).toBe(false);
    expect(root.querySelector('.progress-overview h2')?.textContent).toBe(
      zone.lessons[2].objective,
    );
    expect(root.querySelector('.objective-label')?.textContent).toContain('C3');
    expect(root.querySelector('.objective-label')?.textContent).toContain('Siguiente paso');
    expect(root.querySelector('.progress-zone')?.textContent).toContain('Open Pit');
    expect(root.querySelector('.progress-topic')?.textContent).toContain('Dispersión');
  });

  it('reports completed classes, not a learning score', () => {
    const meter = root.querySelector('[role="progressbar"]');
    expect(root.querySelector('.progress-counter-full')?.textContent?.trim()).toBe(
      '2 de 4 clases completadas',
    );
    expect(root.querySelector('.progress-counter-compact [aria-hidden]')?.textContent?.trim()).toBe(
      '2/4',
    );
    expect(root.querySelector('.progress-counter-compact .sr-only')?.textContent).toContain(
      '2 de 4 clases completadas',
    );
    expect(meter?.getAttribute('aria-valuenow')).toBe('2');
    expect(meter?.getAttribute('aria-valuemax')).toBe('4');
    expect(meter?.getAttribute('aria-valuetext')).toBe('2 de 4 clases completadas');
    expect((root.querySelector('.progress-bar-value') as HTMLElement).style.width).toBe('50%');
  });

  it('updates the compact counter and full instruction as the next class advances', () => {
    fixture.componentRef.setInput('zone', {
      ...zone,
      completedLessons: 3,
      percentage: 75,
      lessons: zone.lessons.map((lesson, index) => ({
        ...lesson,
        status: index < 3 ? 'completed' : 'current',
      })),
    });
    fixture.componentRef.setInput('objective', zone.lessons[3].objective);
    fixture.componentRef.setInput('shortObjective', 'Ve al taller');
    fixture.detectChanges();

    expect(root.querySelector('.progress-counter-compact [aria-hidden]')?.textContent?.trim()).toBe(
      '3/4',
    );
    expect(root.querySelector('.progress-step')?.textContent).toContain('C4');
    expect(root.querySelector('.progress-next-objective')?.textContent).toBe('Ve al taller');
    expect(root.querySelector('.progress-overview h2')?.textContent).toBe(
      zone.lessons[3].objective,
    );
  });

  it('provides an accessible disclosure with a stable target and explicit statuses', () => {
    const button = root.querySelector<HTMLButtonElement>('.progress-toggle')!;
    const panel = root.querySelector<HTMLElement>('.progress-content')!;
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-controls')).toBe(panel.id);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.querySelector('.progress-next-objective')?.textContent).toBe('Ve al botadero');
    expect(button.textContent).toContain('Ver detalles.');
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-label')).toBe('Objetivo y clases del recorrido');
    expect(panel.hidden).toBe(true);
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.textContent).toContain('Ocultar detalles.');
    expect(panel.hidden).toBe(false);
    expect(panel.tabIndex).toBe(0);
    const labels = [...root.querySelectorAll('.progress-item small')].map((el) =>
      el.textContent?.trim(),
    );
    expect(labels).toEqual(['Completada', 'Completada', 'Siguiente', 'Pendiente']);
    button.click();
    fixture.detectChanges();
    expect(panel.hidden).toBe(true);
    expect(button.textContent).toContain('Ver detalles.');
  });

  it('opens the HUB instruction without a fictional class or progress meter', () => {
    fixture.componentRef.setInput('zone', null);
    fixture.componentRef.setInput('name', 'HUB');
    fixture.componentRef.setInput('objective', 'Elige un ámbito para comenzar tu recorrido.');
    fixture.componentRef.setInput('shortObjective', 'Elige dónde empezar');
    fixture.detectChanges();
    const button = root.querySelector<HTMLButtonElement>('.progress-toggle')!;
    expect(button.textContent).toContain('Elige dónde empezar');
    expect(root.querySelector('.progress-step')).toBeNull();
    expect(root.querySelector('.progress-counter-compact')).toBeNull();
    expect(root.querySelector<HTMLElement>('.progress-content')?.hidden).toBe(true);
    button.click();
    fixture.detectChanges();
    expect(root.querySelector<HTMLElement>('.progress-content')?.hidden).toBe(false);
    expect(root.querySelector('[role="progressbar"]')).toBeNull();
    expect(root.querySelector('.objective-label')?.textContent).not.toContain('C3');
    expect(root.querySelector('h2')?.textContent).toBe(
      'Elige un ámbito para comenzar tu recorrido.',
    );
  });

  it('offers the report only inside the expanded route when enabled, without changing progress', () => {
    expect(root.querySelector('.progress-report')).toBeNull();
    fixture.componentRef.setInput('reportAvailable', true);
    fixture.detectChanges();
    const panel = root.querySelector<HTMLElement>('.progress-content')!;
    expect(panel.hidden).toBe(true);
    root.querySelector<HTMLButtonElement>('.progress-toggle')!.click();
    fixture.detectChanges();
    const button = panel.querySelector<HTMLButtonElement>('.progress-report')!;
    const requested = vi.fn();
    fixture.componentInstance.reportRequested.subscribe(requested);
    const before = JSON.stringify(zone);
    expect(button.type).toBe('button');
    expect(panel.hidden).toBe(false);
    button.click();
    expect(requested).toHaveBeenCalledOnce();
    expect(JSON.stringify(zone)).toBe(before);
  });

  it('does not expose a report in the HUB or an empty route even if enabled', () => {
    fixture.componentRef.setInput('reportAvailable', true);
    fixture.componentRef.setInput('zone', null);
    fixture.detectChanges();
    expect(root.querySelector('.progress-report')).toBeNull();
    fixture.componentRef.setInput('zone', { ...zone, lessons: [], totalLessons: 0 });
    fixture.detectChanges();
    expect(root.querySelector('.progress-report')).toBeNull();
  });

  it('omits the route controls for an empty zone', () => {
    fixture.componentRef.setInput('zone', {
      ...zone,
      lessons: [],
      totalLessons: 0,
      completedLessons: 0,
      percentage: 0,
    });
    fixture.detectChanges();
    expect(root.querySelectorAll('button')).toHaveLength(1);
    expect(root.querySelector('.progress-lessons')).toBeNull();
    expect(root.querySelector('.progress-counter-compact')).toBeNull();
    expect(root.querySelector('[role="progressbar"]')).toBeNull();
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance.expanded()).toBe(true);
  });

  it('clearly marks the completed route and still allows reviewing its classes', () => {
    fixture.componentRef.setInput('zone', {
      ...zone,
      completed: true,
      completedLessons: 4,
      percentage: 100,
      lessons: zone.lessons.map((lesson) => ({ ...lesson, status: 'completed' })),
    });
    fixture.componentRef.setInput(
      'objective',
      'Has completado todas las actividades de esta zona.',
    );
    fixture.componentRef.setInput('shortObjective', 'Recorrido completado');
    fixture.detectChanges();
    expect(root.querySelector('.objective-label')?.textContent).toContain('Recorrido completado');
    expect(root.querySelector('.objective-label')?.textContent).not.toContain('Siguiente');
    expect(root.querySelector('.progress-counter-compact [aria-hidden]')?.textContent?.trim()).toBe(
      '4/4',
    );
    expect(root.querySelector('.progress-next-objective')?.textContent).toBe(
      'Recorrido completado',
    );
    expect(root.querySelector('.progress-overview h2')?.textContent).toBe(
      'Has completado todas las actividades de esta zona.',
    );
    expect(fixture.componentInstance.nextLessonNumber()).toBeNull();
    root.querySelector<HTMLButtonElement>('.progress-toggle')!.click();
    fixture.detectChanges();
    expect(root.querySelectorAll('.progress-item--completed')).toHaveLength(4);
  });

  it('keeps the route open when progress changes within the same zone', () => {
    fixture.componentInstance.toggle();
    fixture.detectChanges();
    fixture.componentRef.setInput('zone', { ...zone, percentage: 75, completedLessons: 3 });
    fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(true);
  });

  it('collapses the route when moving to another zone', () => {
    fixture.componentInstance.toggle();
    fixture.detectChanges();
    fixture.componentRef.setInput('zone', { ...zone, id: 'zone02' });
    fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(false);
    expect(root.querySelector<HTMLElement>('.progress-content')?.hidden).toBe(true);
  });

  it('keeps the delivery objective distinct from a fully completed route', () => {
    fixture.componentRef.setInput('zone', {
      ...zone,
      completed: true,
      completedLessons: 4,
      percentage: 100,
      lessons: zone.lessons.map((lesson) => ({ ...lesson, status: 'completed' })),
    });
    fixture.componentRef.setInput('finalTaskPending', true);
    fixture.componentRef.setInput('shortObjective', 'Entrega el informe');
    fixture.componentRef.setInput(
      'objective',
      'Vuelve al centro de control y entrega el informe al supervisor.',
    );
    fixture.detectChanges();
    expect(root.querySelector('.progress-step')).toBeNull();
    expect(root.querySelector('.progress-next-objective')?.textContent).toBe('Entrega el informe');
    expect(root.querySelector('.objective-label')?.textContent).toContain('Entrega del informe');
    expect(fixture.componentInstance.completed()).toBe(false);
  });

  it('closes on Escape and restores focus to the toggle without affecting the game', () => {
    const button = root.querySelector<HTMLButtonElement>('.progress-toggle')!;
    button.click();
    fixture.detectChanges();
    const panel = root.querySelector<HTMLElement>('.progress-content')!;
    panel.focus();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    panel.dispatchEvent(escape);
    fixture.detectChanges();
    expect(escape.defaultPrevented).toBe(true);
    expect(panel.hidden).toBe(true);
    expect(document.activeElement).toBe(button);
    const closedEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    button.dispatchEvent(closedEscape);
    expect(closedEscape.defaultPrevented).toBe(false);
  });

  it('collapses when moving between selection screens that have no lessons', () => {
    fixture.componentRef.setInput('zone', null);
    fixture.componentRef.setInput('name', 'HUB');
    fixture.detectChanges();
    fixture.componentInstance.toggle();
    fixture.detectChanges();
    fixture.componentRef.setInput('name', 'Minería de Superficie');
    fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(false);
  });

  it('uses the full objective as a safe fallback when no short instruction is provided', () => {
    fixture.componentRef.setInput('shortObjective', null);
    fixture.detectChanges();
    expect(root.querySelector('.progress-next-objective')?.textContent).toBe(
      zone.lessons[2].objective,
    );
  });

  it('does not mutate the lesson progression when reviewing the route', () => {
    const before = JSON.stringify(zone);
    fixture.componentInstance.toggle();
    fixture.detectChanges();
    fixture.componentInstance.toggle();
    fixture.detectChanges();
    expect(JSON.stringify(zone)).toBe(before);
  });

  it('uses a different disclosure target for every component instance', () => {
    const another = TestBed.createComponent(ZoneProgress);
    expect(another.componentInstance.lessonsId).not.toBe(fixture.componentInstance.lessonsId);
    another.destroy();
  });
});

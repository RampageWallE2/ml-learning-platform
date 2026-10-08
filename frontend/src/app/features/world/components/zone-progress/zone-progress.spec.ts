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
      id: 'zone01', name: 'Open Pit', topic: 'Dispersión',
      completedLessons: 2, totalLessons: 4, percentage: 50, completed: false,
      lessons: [
        { lessonId: 'c1', name: 'Carguío', objective: 'Ve al tajo.', status: 'completed' },
        { lessonId: 'c2', name: 'Turnos', objective: 'Ve a la rampa.', status: 'completed' },
        { lessonId: 'c3', name: 'Descarga', objective: 'Ve al botadero y habla con su encargado.', status: 'current' },
        { lessonId: 'c4', name: 'Mantenimiento', objective: 'Ve al taller.', status: 'pending' },
      ],
    };
    fixture = TestBed.createComponent(ZoneProgress);
    fixture.componentRef.setInput('name', zone.name);
    fixture.componentRef.setInput('topic', zone.topic);
    fixture.componentRef.setInput('objective', zone.lessons[2].objective);
    fixture.componentRef.setInput('zone', zone);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  it('makes the full instruction the heading and identifies the next class', () => {
    expect(root.querySelector('.progress-overview h2')?.textContent).toBe(zone.lessons[2].objective);
    expect(root.querySelector('.objective-label')?.textContent).toContain('C3');
    expect(root.querySelector('.objective-label')?.textContent).toContain('Siguiente paso');
    expect(root.querySelector('.progress-zone')?.textContent).toContain('Open Pit');
    expect(root.querySelector('.progress-topic')?.textContent).toContain('Dispersión');
  });

  it('reports completed classes, not a learning score', () => {
    const meter = root.querySelector('[role="progressbar"]');
    expect(root.querySelector('.progress-counter-full')?.textContent?.trim()).toBe('2 de 4 clases completadas');
    expect(root.querySelector('.progress-counter-compact')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('C3 · 2/4 clases');
    expect(meter?.getAttribute('aria-valuenow')).toBe('2');
    expect(meter?.getAttribute('aria-valuemax')).toBe('4');
    expect(meter?.getAttribute('aria-valuetext')).toBe('2 de 4 clases completadas');
    expect((root.querySelector('.progress-bar-value') as HTMLElement).style.width).toBe('50%');
  });

  it('updates the compact counter and full instruction as the next class advances', () => {
    fixture.componentRef.setInput('zone', {
      ...zone, completedLessons: 3, percentage: 75,
      lessons: zone.lessons.map((lesson, index) => ({
        ...lesson, status: index < 3 ? 'completed' : 'current',
      })),
    });
    fixture.componentRef.setInput('objective', zone.lessons[3].objective);
    fixture.detectChanges();

    expect(root.querySelector('.progress-counter-compact')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('C4 · 3/4 clases');
    expect(root.querySelector('.progress-overview h2')?.textContent).toBe(zone.lessons[3].objective);
  });

  it('provides an accessible disclosure with a stable target and explicit statuses', () => {
    const button = root.querySelector<HTMLButtonElement>('.progress-toggle')!;
    const panel = root.querySelector<HTMLElement>('.progress-content')!;
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-controls')).toBe(panel.id);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.querySelector('.progress-toggle-label')?.textContent?.trim()).toBe('Ver recorrido');
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.getAttribute('aria-label')).toBe('Clases del recorrido');
    expect(panel.hidden).toBe(true);
    button.click(); fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.textContent).toContain('Ocultar recorrido');
    expect(panel.hidden).toBe(false);
    expect(panel.tabIndex).toBe(0);
    const labels = [...root.querySelectorAll('.progress-item small')].map(el => el.textContent?.trim());
    expect(labels).toEqual(['Completada', 'Completada', 'Siguiente', 'Pendiente']);
    button.click(); fixture.detectChanges();
    expect(panel.hidden).toBe(true);
    expect(button.textContent).toContain('Ver recorrido');
  });

  it('does not create a dead button or progress meter in the HUB', () => {
    fixture.componentRef.setInput('zone', null);
    fixture.componentRef.setInput('name', 'HUB');
    fixture.componentRef.setInput('objective', 'Elige un ámbito para comenzar tu recorrido.');
    fixture.detectChanges();
    expect(root.querySelector('button')).toBeNull();
    expect(root.querySelector('[role="progressbar"]')).toBeNull();
    expect(root.querySelector('.objective-label')?.textContent).not.toContain('C3');
    expect(root.querySelector('h2')?.textContent).toBe('Elige un ámbito para comenzar tu recorrido.');
  });

  it('offers the report only inside the expanded route when enabled, without changing progress', () => {
    expect(root.querySelector('.progress-report')).toBeNull();
    fixture.componentRef.setInput('reportAvailable', true); fixture.detectChanges();
    const panel = root.querySelector<HTMLElement>('.progress-content')!;
    expect(panel.hidden).toBe(true);
    root.querySelector<HTMLButtonElement>('.progress-toggle')!.click(); fixture.detectChanges();
    const button = panel.querySelector<HTMLButtonElement>('.progress-report')!;
    const requested = vi.fn(); fixture.componentInstance.reportRequested.subscribe(requested);
    const before = JSON.stringify(zone);
    expect(button.type).toBe('button'); expect(panel.hidden).toBe(false);
    button.click(); expect(requested).toHaveBeenCalledOnce();
    expect(JSON.stringify(zone)).toBe(before);
  });

  it('does not expose a report in the HUB or an empty route even if enabled', () => {
    fixture.componentRef.setInput('reportAvailable', true);
    fixture.componentRef.setInput('zone', null); fixture.detectChanges();
    expect(root.querySelector('.progress-report')).toBeNull();
    fixture.componentRef.setInput('zone', { ...zone, lessons: [], totalLessons: 0 }); fixture.detectChanges();
    expect(root.querySelector('.progress-report')).toBeNull();
  });

  it('omits the route controls for an empty zone', () => {
    fixture.componentRef.setInput('zone', { ...zone, lessons: [], totalLessons: 0, completedLessons: 0, percentage: 0 });
    fixture.detectChanges();
    expect(root.querySelector('button')).toBeNull();
    expect(root.querySelector('[role="progressbar"]')).toBeNull();
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance.expanded()).toBe(false);
  });

  it('clearly marks the completed route and still allows reviewing its classes', () => {
    fixture.componentRef.setInput('zone', {
      ...zone, completed: true, completedLessons: 4, percentage: 100,
      lessons: zone.lessons.map(lesson => ({ ...lesson, status: 'completed' })),
    });
    fixture.componentRef.setInput('objective', 'Has completado todas las actividades de esta zona.');
    fixture.detectChanges();
    expect(root.querySelector('.objective-label')?.textContent).toContain('Recorrido completado');
    expect(root.querySelector('.objective-label')?.textContent).not.toContain('Siguiente');
    expect(root.querySelector('.progress-counter-compact')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('4/4 clases');
    expect(root.querySelector('.progress-overview h2')?.textContent).toBe('Has completado todas las actividades de esta zona.');
    expect(fixture.componentInstance.nextLessonNumber()).toBeNull();
    root.querySelector<HTMLButtonElement>('.progress-toggle')!.click(); fixture.detectChanges();
    expect(root.querySelectorAll('.progress-item--completed')).toHaveLength(4);
  });

  it('keeps the route open when progress changes within the same zone', () => {
    fixture.componentInstance.toggle(); fixture.detectChanges();
    fixture.componentRef.setInput('zone', { ...zone, percentage: 75, completedLessons: 3 });
    fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(true);
  });

  it('collapses the route when moving to another zone', () => {
    fixture.componentInstance.toggle(); fixture.detectChanges();
    fixture.componentRef.setInput('zone', { ...zone, id: 'zone02' });
    fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(false);
    expect(root.querySelector<HTMLElement>('.progress-content')?.hidden).toBe(true);
  });

  it('does not mutate the lesson progression when reviewing the route', () => {
    const before = JSON.stringify(zone);
    fixture.componentInstance.toggle(); fixture.detectChanges();
    fixture.componentInstance.toggle(); fixture.detectChanges();
    expect(JSON.stringify(zone)).toBe(before);
  });

  it('uses a different disclosure target for every component instance', () => {
    const another = TestBed.createComponent(ZoneProgress);
    expect(another.componentInstance.lessonsId).not.toBe(fixture.componentInstance.lessonsId);
    another.destroy();
  });
});

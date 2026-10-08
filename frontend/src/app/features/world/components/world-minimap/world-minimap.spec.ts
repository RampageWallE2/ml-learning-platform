import { TestBed } from '@angular/core/testing';
import { WorldMinimap } from './world-minimap';
import type { MinimapMapData } from '../../../../core/minimap/minimap.types';
import type { ZoneProgress } from '../../progress/progress.types';

describe('world minimap', () => {
  const map: MinimapMapData = {
    sceneKey: 'OpenPitScene', worldWidth: 3840, worldHeight: 3840, width: 1000, height: 1000,
    terrain: [], lessons: [
      { lessonId: 'lesson-01', number: 1, name: 'Dispersión de los datos', x: 250, y: 350 },
      { lessonId: 'lesson-02', number: 2, name: 'Promedio y dispersión', x: 550, y: 400 },
    ],
  };
  const zone: ZoneProgress = { id: 'zone-01', name: 'Open Pit', topic: 'Dispersión',
    completedLessons: 0, totalLessons: 2, percentage: 0, completed: false,
    lessons: map.lessons.map(lesson => ({ ...lesson, objective: 'Busca al encargado.', status: 'pending' })),
  };
  function create() {
    const fixture = TestBed.createComponent(WorldMinimap);
    fixture.componentRef.setInput('map', map);
    fixture.componentRef.setInput('zone', zone);
    fixture.detectChanges();
    return fixture;
  }
  afterEach(() => vi.unstubAllGlobals());

  it('numbers classes, highlights the next one and updates confirmed completion without changing coordinates', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.minimap-marker')).toHaveLength(2);
    expect(root.querySelector('.minimap-marker--current')?.getAttribute('data-lesson-id')).toBe('lesson-01');
    fixture.componentRef.setInput('zone', { ...zone, lessons: [
      { ...zone.lessons[0], status: 'completed' }, zone.lessons[1],
    ] }); fixture.detectChanges();
    expect(root.querySelector('.minimap-marker--completed')?.getAttribute('transform')).toBe('translate(250 350)');
    expect(root.querySelector('.minimap-marker--completed .minimap-marker__check')).not.toBeNull();
    expect(root.querySelector('.minimap-marker--current')?.getAttribute('data-lesson-id')).toBe('lesson-02');
    expect(root.querySelector('.minimap-next')?.textContent).toContain('C2 · Promedio y dispersión');
    fixture.componentRef.setInput('loadingProgress', true); fixture.detectChanges();
    expect(root.querySelector('.minimap-marker--current')).toBeNull();
    expect(root.querySelector('.minimap-next')?.textContent).toContain('Consultando progreso');
  });

  it('shows the supervisor at the map coordinate only while the final return is pending', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    fixture.componentRef.setInput('map', { ...map, supervisor: { x: 410, y: 875 } });
    fixture.componentRef.setInput('returnToSupervisor', true); fixture.detectChanges();
    expect(root.querySelector('.minimap-supervisor')?.getAttribute('transform')).toBe('translate(410 875)');
    expect(root.querySelector('.minimap-next')?.textContent).toContain('Centro de control · Supervisor');
    fixture.componentRef.setInput('loadingProgress', true); fixture.detectChanges();
    expect(root.querySelector('.minimap-supervisor')).toBeNull();
    fixture.componentRef.setInput('loadingProgress', false);
    fixture.componentRef.setInput('returnToSupervisor', false); fixture.detectChanges();
    expect(root.querySelector('.minimap-supervisor')).toBeNull();
  });

  it('prioritizes the supervisor while the intro is pending, then reveals the next class', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    fixture.componentRef.setInput('map', { ...map, supervisor: { x: 410, y: 875 } });
    fixture.componentRef.setInput('introPending', true); fixture.detectChanges();
    expect(root.querySelector('.minimap-supervisor')?.getAttribute('transform')).toBe('translate(410 875)');
    expect(root.querySelector('.minimap-supervisor title')?.textContent).toContain('para empezar');
    expect(root.querySelector('.minimap-next')?.textContent).toContain('Supervisor');
    expect(root.querySelector('[data-lesson-id].minimap-marker--current')).toBeNull();
    fixture.componentRef.setInput('introPending', false); fixture.detectChanges();
    expect(root.querySelector('.minimap-supervisor')).toBeNull();
    expect(root.querySelector('.minimap-next')?.textContent).toContain('C1');
  });

  it('moves only the player marker, keeps the terrain and class data stable and ignores another scene', () => {
    const fixture = create(); const component = fixture.componentInstance;
    const markers = component.markers();
    fixture.componentRef.setInput('player', { sceneKey: 'OpenPitScene', x: 1920, y: 384, heading: 90 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.minimap-player')?.getAttribute('transform')).toBe('translate(500 100) rotate(90)');
    expect(component.markers()).toBe(markers);
    fixture.componentRef.setInput('player', { sceneKey: 'HubScene', x: 1, y: 2, heading: 0 });
    fixture.detectChanges(); expect(component.playerPoint()).toBeNull();
    fixture.componentRef.setInput('player', { sceneKey: 'OpenPitScene', x: -10, y: 5000, heading: 0 });
    fixture.detectChanges(); expect(component.playerPoint()).toEqual({ x: 0, y: 1000, heading: 0 });
  });

  it('starts folded on mobile, uses a native toggle and returns focus to the game on Escape', () => {
    const media = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal('matchMedia', vi.fn(() => media));
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    const game = document.createElement('div'); game.tabIndex = -1; document.body.append(game);
    fixture.componentRef.setInput('returnFocusTarget', game);
    try {
      const toggle = root.querySelector<HTMLButtonElement>('.minimap-toggle')!;
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(root.querySelector('svg.minimap-chart')).toBeNull();
      toggle.click(); fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
      toggle.dispatchEvent(escape); fixture.detectChanges();
      expect(escape.defaultPrevented).toBe(true);
      expect(root.querySelector('svg.minimap-chart')).toBeNull();
      expect(document.activeElement).toBe(game);
      fixture.destroy(); expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    } finally { game.remove(); }
  });
});

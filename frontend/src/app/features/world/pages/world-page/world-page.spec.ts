import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import Phaser from 'phaser';
import { AuthService } from '../../../../core/auth/auth.service';
import { clearWorldSession, saveWorldSession } from '../../../../core/world-session/world-session.storage';
import { gameEvents, GameEvents, type SceneLoadingSnapshot } from '../../game/events/game-events';
import { ProgressService } from '../../progress/progress.service';
import { WorldPage } from './world-page';

// Phaser's browser feature detection needs canvas; this suite tests the Angular
// screen and its event bridge, not WebGL. External-module mocks are supported.
vi.mock('phaser', async () => {
  const { default: EventEmitter } = await import('eventemitter3');
  return { default: {
    Events: { EventEmitter }, Scene: class {}, Game: vi.fn(),
    Math: { Vector2: class {} }, AUTO: 0, Scale: { RESIZE: 5 },
  } };
});

describe('WorldPage — circular scene loading screen', () => {
  let destroyGame: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearWorldSession();
    destroyGame = vi.fn();
    vi.spyOn(Phaser, 'Game').mockImplementation(function () {
      return { destroy: destroyGame, scene: { getScenes: () => [] } } as unknown as Phaser.Game;
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: signal(null) } },
        { provide: ProgressService, useValue: {
          zoneProgress: signal([]), currentLesson: signal(null),
          loadProgress: vi.fn(() => of(undefined)),
        } },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    clearWorldSession();
    vi.restoreAllMocks();
  });

  function create() {
    const fixture = TestBed.createComponent(WorldPage);
    fixture.detectChanges();
    return fixture;
  }

  function report(sceneKey: string, phase: SceneLoadingSnapshot['phase'], progress: number) {
    gameEvents.emit(GameEvents.SCENE_LOADING, { sceneKey, phase, progress } satisfies SceneLoadingSnapshot);
  }

  it('shows a circular 0% indicator before Phaser has loaded any resources', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    const chrome = root.querySelector('.world-loading__chrome');
    expect(chrome?.getAttribute('aria-hidden')).toBe('true');
    expect(chrome?.textContent).toContain('EXPLORALAB');
    expect(root.querySelector('.world-loading__footer')?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelectorAll('[role=progressbar]')).toHaveLength(1);
    expect(root.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('0');
    expect(root.querySelector('.world-loading__fill')?.getAttribute('stroke-dashoffset')).toBe('100');
    expect(root.textContent).toContain('Cargando HUB');
    expect(root.querySelector('.world-hud')?.hasAttribute('inert')).toBe(true);
  });

  it('displays real resource progress and stays visible at 100% while preparing the scene', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    report('OpenPitScene', 'loading', .42); fixture.detectChanges();
    expect(root.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('42');
    expect(root.querySelector('.world-loading__fill')?.getAttribute('stroke-dashoffset')).toBe('58');
    expect(root.textContent).toContain('Cargando Open Pit');
    report('OpenPitScene', 'preparing', 1); fixture.detectChanges();
    expect(root.querySelector('.world-loading')).not.toBeNull();
    expect(root.textContent).toContain('Preparando escenario');
    expect(root.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('100');
    expect(root.querySelector('.world-loading__fill')?.getAttribute('stroke-dashoffset')).toBe('0');
    expect(root.querySelector('.world-hud')?.hasAttribute('inert')).toBe(true);
    expect(root.querySelector('.world-page')?.getAttribute('aria-busy')).toBe('true');
    report('OpenPitScene', 'ready', 1); fixture.detectChanges();
    expect(root.querySelector('.world-loading')).toBeNull();
    expect(root.querySelector('.world-hud')?.hasAttribute('inert')).toBe(false);
    expect(root.querySelector('.world-page')?.getAttribute('aria-busy')).toBe('false');
    report('SurfaceSelectionScene', 'loading', 0); fixture.detectChanges();
    expect(root.textContent).toContain('Cargando Minería de Superficie');
  });

  it('uses the restored map name from the first render', () => {
    saveWorldSession({ version: 1, sceneKey: 'OpenPitScene', playerX: 100, playerY: 200, savedAt: Date.now() });
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Cargando Open Pit');
    expect(fixture.componentInstance.sceneLoadingPercentage()).toBe(0);
  });

  it('offers a retry when a resource fails instead of reporting a ready map', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    report('OpenPitScene', 'error', .6); fixture.detectChanges();
    expect(root.querySelector('[role=alert]')?.textContent).toContain('Falló la carga');
    expect(root.querySelector('.world-loading button')?.textContent).toContain('Recargar');
    expect(root.querySelector('.world-loading__card--error')).not.toBeNull();
    expect(root.querySelector('[role=progressbar]')).toBeNull();
    expect(root.querySelector('.world-hud')?.hasAttribute('inert')).toBe(true);
    expect(root.querySelector('.world-page')?.getAttribute('aria-busy')).toBe('false');
  });

  it('bounds invalid percentages and removes its loading listener when the page closes', () => {
    const baseline = gameEvents.listenerCount(GameEvents.SCENE_LOADING);
    const fixture = create(); const page = fixture.componentInstance;
    expect(gameEvents.listenerCount(GameEvents.SCENE_LOADING)).toBe(baseline + 1);
    for (const [input, expected] of [[-1, 0], [2, 100], [Number.NaN, 0]]) {
      report('HubScene', 'loading', input);
      expect(page.sceneLoadingPercentage()).toBe(expected);
    }
    fixture.destroy();
    expect(gameEvents.listenerCount(GameEvents.SCENE_LOADING)).toBe(baseline);
    expect(destroyGame).toHaveBeenCalledWith(true);
  });
});

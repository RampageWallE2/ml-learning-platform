import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import Phaser from 'phaser';
import { AuthService } from '../../../../core/auth/auth.service';
import { clearWorldSession, saveWorldSession } from '../../../../core/world-session/world-session.storage';
import { gameEvents, GameEvents, type SceneLoadingSnapshot } from '../../game/events/game-events';
import { ProgressService } from '../../progress/progress.service';
import { LessonDraftService } from '../../progress/lesson-draft.service';
import { ZoneProgress as ZoneProgressData } from '../../progress/progress.types';
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
  let zones: ReturnType<typeof signal<ZoneProgressData[]>>;
  let pending: ReturnType<typeof signal<string[]>>;
  let storageAvailable: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    clearWorldSession();
    zones = signal<ZoneProgressData[]>([]);
    pending = signal<string[]>([]);
    storageAvailable = signal(true);
    destroyGame = vi.fn();
    vi.spyOn(Phaser, 'Game').mockImplementation(function () {
      return { destroy: destroyGame, scene: { getScenes: () => [] } } as unknown as Phaser.Game;
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: signal(null) } },
        { provide: ProgressService, useValue: {
          zoneProgress: zones, currentLesson: signal(null),
          pendingLessonIds: pending, pendingStorageAvailable: storageAvailable,
          syncingPending: signal(false), completeLesson: vi.fn(() => of(undefined)),
          isLessonCompleted: vi.fn(() => false), isLessonAvailable: vi.fn(() => true),
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

  it('retains the C6 draft through closing and a failed save, clearing only after server confirmation', () => {
    const fixture = create(); const page = fixture.componentInstance;
    const drafts = TestBed.inject(LessonDraftService);
    const owner = { id: 'draft-world', displayName: 'Test', email: 'test@example.test', avatarUrl: null };
    vi.spyOn(drafts, 'currentUser').mockReturnValue(owner);
    const clear = vi.spyOn(drafts, 'clearConfirmed').mockImplementation(() => {});
    const response = new Subject<void>();
    vi.spyOn(page.progress, 'completeLesson').mockReturnValue(response);
    page.lessonActive.set({ lessonId: 'lesson-06' });
    page.completeLesson('lesson-06'); expect(clear).not.toHaveBeenCalled();
    response.error(new Error('Offline')); page.closeLesson();
    expect(clear).not.toHaveBeenCalled();
    vi.spyOn(page.progress, 'completeLesson').mockReturnValue(of(undefined));
    page.completeLesson('lesson-06');
    expect(clear).toHaveBeenCalledExactlyOnceWith('lesson-06', owner);
  });

  it('clears C6 after confirmed reconciliation but does not replay a pending completion', () => {
    const fixture = create(); const page = fixture.componentInstance;
    const drafts = TestBed.inject(LessonDraftService);
    const clear = vi.spyOn(drafts, 'clearConfirmed');
    pending.set(['lesson-06']);
    vi.spyOn(page.progress, 'isLessonCompleted').mockImplementation(id => id === 'lesson-06');
    vi.spyOn(page.progress, 'loadProgress').mockImplementation(() => { pending.set([]); return of(undefined); });
    gameEvents.emit(GameEvents.OPEN_LESSON, { lessonId: 'lesson-06' });
    expect(page.lessonActive()).toBeNull();
    expect(clear).toHaveBeenCalledExactlyOnceWith('lesson-06', null);
  });

  it('does not discard an unfinished replay because C6 was completed on an earlier attempt', () => {
    const fixture = create(); const page = fixture.componentInstance;
    const clear = vi.spyOn(TestBed.inject(LessonDraftService), 'clearConfirmed');
    vi.spyOn(page.progress, 'isLessonCompleted').mockImplementation(id => id === 'lesson-06');
    page.retryProgressSync();
    gameEvents.emit(GameEvents.OPEN_LESSON, { lessonId: 'lesson-06' });
    expect(clear).not.toHaveBeenCalled();
    expect(page.lessonActive()?.lessonId).toBe('lesson-06');
  });

  it('passes the original session owner to cleanup even if an HTTP result arrives after a switch', () => {
    const fixture = create(); const page = fixture.componentInstance;
    const drafts = TestBed.inject(LessonDraftService);
    const a = { id: 'a', displayName: 'A', email: 'a@example.test', avatarUrl: null };
    const b = { ...a, id: 'b' };
    const current = vi.spyOn(drafts, 'currentUser').mockReturnValue(a);
    const clear = vi.spyOn(drafts, 'clearConfirmed').mockImplementation(() => {});
    const response = new Subject<void>(); vi.spyOn(page.progress, 'completeLesson').mockReturnValue(response);
    page.completeLesson('lesson-06'); current.mockReturnValue(b); response.next(); response.complete();
    expect(clear).toHaveBeenCalledExactlyOnceWith('lesson-06', a);
  });

  it.each(['lesson-01', 'lesson-02', 'lesson-03', 'lesson-04', 'lesson-05', 'lesson-07', 'lesson-08', 'lesson-09'])('retains %s through a failed save and closing, clearing only its confirmed result', lessonId => {
    const fixture = create(); const page = fixture.componentInstance;
    const clear = vi.spyOn(TestBed.inject(LessonDraftService), 'clearConfirmed');
    const response = new Subject<void>(); vi.spyOn(page.progress, 'completeLesson').mockReturnValue(response);
    page.lessonActive.set({ lessonId }); page.completeLesson(lessonId);
    expect(clear).not.toHaveBeenCalled(); response.error(new Error('Offline')); page.closeLesson();
    expect(clear).not.toHaveBeenCalled();
    vi.spyOn(page.progress, 'completeLesson').mockReturnValue(of(undefined)); page.completeLesson(lessonId);
    expect(clear).toHaveBeenCalledExactlyOnceWith(lessonId, null);
  });

  it.each(['lesson-01', 'lesson-02', 'lesson-03', 'lesson-04', 'lesson-05', 'lesson-07', 'lesson-08', 'lesson-09'])('prioritizes the %s pending completion over replay and clears its reconciled draft', lessonId => {
    const fixture = create(); const page = fixture.componentInstance;
    const clear = vi.spyOn(TestBed.inject(LessonDraftService), 'clearConfirmed');
    pending.set([lessonId]);
    vi.spyOn(page.progress, 'isLessonCompleted').mockImplementation(id => id === lessonId);
    vi.spyOn(page.progress, 'loadProgress').mockImplementation(() => { pending.set([]); return of(undefined); });
    gameEvents.emit(GameEvents.OPEN_LESSON, { lessonId });
    expect(page.lessonActive()).toBeNull(); expect(clear).toHaveBeenCalledExactlyOnceWith(lessonId, null);
  });

  it.each(['lesson-01', 'lesson-02', 'lesson-03', 'lesson-04', 'lesson-05', 'lesson-07', 'lesson-08', 'lesson-09'])('does not clear an unfinished %s replay when an earlier attempt was already completed', lessonId => {
    const fixture = create(); const page = fixture.componentInstance;
    const clear = vi.spyOn(TestBed.inject(LessonDraftService), 'clearConfirmed');
    vi.spyOn(page.progress, 'isLessonCompleted').mockImplementation(id => id === lessonId);
    page.retryProgressSync(); gameEvents.emit(GameEvents.OPEN_LESSON, { lessonId });
    expect(clear).not.toHaveBeenCalled(); expect(page.lessonActive()?.lessonId).toBe(lessonId);
  });

  it('keeps the pending completion and its notice when closing after a failed save', () => {
    const fixture = create(); const page = fixture.componentInstance;
    report('OpenPitScene', 'ready', 1);
    page.lessonActive.set({ lessonId: 'lesson-01' });
    vi.spyOn(page.progress, 'completeLesson').mockImplementation(() => {
      pending.set(['lesson-01']);
      return throwError(() => new Error('Offline'));
    });
    page.completeLesson('lesson-01');
    expect(page.lessonSaved()).toBe(false);
    page.closeLesson(); fixture.detectChanges();
    expect(page.lessonActive()).toBeNull();
    expect(pending()).toEqual(['lesson-01']);
    expect(page.progressSyncError()).not.toBeNull();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('Pendiente de guardar');
    expect(root.textContent).toContain('no necesitas repetirla');
    expect(root.querySelector('.progress-sync-toast button')).not.toBeNull();
  });

  it.each(['save', 'retry'])('explains a 413 during %s without clearing the pending completion or draft', action => {
    const fixture = create(); const page = fixture.componentInstance;
    report('OpenPitScene', 'ready', 1);
    page.lessonActive.set({ lessonId: 'lesson-01' });
    pending.set(['lesson-01']);
    const clear = vi.spyOn(TestBed.inject(LessonDraftService), 'clearConfirmed');
    const refused = throwError(() => new HttpErrorResponse({ status: 413, error: { code: 'request_too_large' } }));
    if (action === 'save') {
      vi.spyOn(page.progress, 'completeLesson').mockReturnValue(refused);
      page.completeLesson('lesson-01');
    } else {
      vi.spyOn(page.progress, 'loadProgress').mockReturnValue(refused);
      page.retryProgressSync();
    }
    fixture.detectChanges();
    expect(page.progressSyncError()).toBe('El envío es demasiado grande. No se pudo guardar; tu avance sigue pendiente.');
    expect(fixture.nativeElement.textContent).toContain('tu avance sigue pendiente');
    expect(pending()).toEqual(['lesson-01']);
    expect(page.lessonActive()?.lessonId).toBe('lesson-01');
    expect(page.lessonSaved()).toBe(false);
    expect(page.savingLesson()).toBe(false);
    expect(page.loadingProgress()).toBe(false);
    expect(clear).not.toHaveBeenCalled();
  });

  it('does not keep the 413 priority on a later ordinary connection error', () => {
    const fixture = create(); const page = fixture.componentInstance;
    pending.set(['lesson-01']);
    const save = vi.spyOn(page.progress, 'completeLesson');
    save.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 413 })));
    page.completeLesson('lesson-01');
    expect(page.progressSyncMessage()).toContain('El envío es demasiado grande');
    save.mockReturnValue(throwError(() => new Error('Offline')));
    page.completeLesson('lesson-01');
    expect(page.progressSyncMessage()).toContain('no necesitas repetirla');
    expect(page.progressSyncMessage()).not.toContain('demasiado grande');
    expect(pending()).toEqual(['lesson-01']);
  });

  it('keeps the browser storage failure warning above a 413 message', () => {
    const fixture = create(); const page = fixture.componentInstance;
    pending.set(['lesson-01']); storageAvailable.set(false);
    vi.spyOn(page.progress, 'completeLesson').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 413 })));
    page.completeLesson('lesson-01');
    expect(page.progressSyncMessage()).toContain('No recargues ni cierres esta página');
    expect(pending()).toEqual(['lesson-01']);
  });

  it('does not claim a pending completion when a read request gets 413 without any', () => {
    const fixture = create(); const page = fixture.componentInstance;
    vi.spyOn(page.progress, 'loadProgress').mockReturnValue(throwError(() => new HttpErrorResponse({ status: 413 })));
    page.retryProgressSync();
    expect(page.progressSyncMessage()).toBe('El envío es demasiado grande. No se pudo completar la solicitud.');
    expect(page.progressSyncMessage()).not.toContain('avance sigue pendiente');
    expect(pending()).toEqual([]);
  });

  it('reads the server on retry and closes the finished lesson after reconciliation', () => {
    const fixture = create(); const page = fixture.componentInstance;
    pending.set(['lesson-01']); page.lessonActive.set({ lessonId: 'lesson-01' });
    vi.spyOn(page.progress, 'isLessonCompleted').mockReturnValue(true);
    const read = vi.spyOn(page.progress, 'loadProgress').mockImplementation(() => {
      pending.set([]); return of(undefined);
    });
    read.mockClear();
    const save = vi.spyOn(page.progress, 'completeLesson');
    page.retryProgressSync(); fixture.detectChanges();
    expect(read).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
    expect(page.lessonActive()).toBeNull();
    expect(page.lessonSaved()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Progreso guardado en tu cuenta');
  });

  it('retries a locally finished lesson on interaction without replaying its exercise', () => {
    const fixture = create(); const page = fixture.componentInstance;
    pending.set(['lesson-01']);
    const read = vi.spyOn(page.progress, 'loadProgress');
    read.mockClear();
    gameEvents.emit(GameEvents.OPEN_LESSON, { lessonId: 'lesson-01' });
    expect(read).toHaveBeenCalledOnce();
    expect(page.lessonActive()).toBeNull();
  });

  it('shows confirmed saving only after the completion request succeeds', () => {
    const fixture = create(); const page = fixture.componentInstance;
    const response = new Subject<void>();
    vi.spyOn(page.progress, 'completeLesson').mockReturnValue(response);
    page.lessonActive.set({ lessonId: 'lesson-01' });
    page.completeLesson('lesson-01');
    expect(page.lessonSaved()).toBe(false);
    expect(page.savingLesson()).toBe(true);
    response.next(); response.complete(); fixture.detectChanges();
    expect(page.lessonSaved()).toBe(true);
    expect(page.savingLesson()).toBe(false);
    expect(page.lessonActive()).toBeNull();
  });

  it('warns when browser storage cannot protect the result after reload', () => {
    const fixture = create();
    pending.set(['lesson-01']); storageAvailable.set(false); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.textContent).toContain('No recargues ni cierres esta página');
    expect(root.textContent).not.toContain('Puedes cerrar la clase');
    expect(root.querySelector('.progress-sync-toast')?.getAttribute('role')).toBe('alert');
  });

  it.each(['lesson', 'dialogue'] as const)('moves the single retry notice inside an open %s and back on closing', async kind => {
    const fixture = create(); const page = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    report('OpenPitScene', 'ready', 1);
    pending.set(['lesson-01']);
    page.progressSyncError.set('No se pudo guardar tu progreso.');
    if (kind === 'lesson') page.lessonActive.set({ lessonId: 'lesson-01' });
    else page.activeDialogue.set({ id: 'test', messages: [] });
    fixture.detectChanges(); await fixture.whenStable();
    const panel = root.querySelector('[role="dialog"]')!;
    const retry = root.querySelector<HTMLButtonElement>('.progress-sync-toast button')!;
    expect(panel.contains(retry)).toBe(true);
    expect(root.querySelectorAll('.progress-sync-toast')).toHaveLength(1);
    expect(root.querySelector('.world-notices .progress-sync-toast')).toBeNull();
    expect(root.querySelector('.progress-sync-toast')?.classList.contains('progress-sync-toast--inline')).toBe(true);
    expect(root.querySelector('.progress-sync-toast')?.getAttribute('role')).toBe('alert');
    const close = root.querySelector<HTMLButtonElement>('.close-button')!;
    close.focus(); close.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', shiftKey: true, bubbles: true, cancelable: true,
    }));
    expect(document.activeElement).toBe(retry);
    if (kind === 'lesson') page.closeLesson(); else page.closeDialogue();
    fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelectorAll('.progress-sync-toast')).toHaveLength(1);
    expect(root.querySelector('.world-notices .progress-sync-toast')).not.toBeNull();
    expect(document.activeElement).toBe(root.querySelector('#phaser-container'));
  });

  it('keeps a failed retry inside the lesson, locks the map during saving and restores map focus on confirmation', async () => {
    const fixture = create(); const page = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    report('OpenPitScene', 'ready', 1);
    gameEvents.emit(GameEvents.OPEN_LESSON, { lessonId: 'lesson-01' });
    pending.set(['lesson-01']); page.progressSyncError.set('No se pudo guardar.');
    fixture.detectChanges(); await fixture.whenStable();
    const read = new Subject<void>();
    const load = vi.spyOn(page.progress, 'loadProgress').mockReturnValue(read); load.mockClear();
    const unlock = vi.fn(); gameEvents.on(GameEvents.UNLOCK_PLAYER, unlock);
    try {
      const retry = root.querySelector<HTMLButtonElement>('.progress-sync-toast button')!;
      retry.focus(); retry.click(); fixture.detectChanges(); await fixture.whenStable();
      expect(load).toHaveBeenCalledOnce();
      expect(retry.disabled).toBe(true);
      expect(document.activeElement).toBe(root.querySelector('.interaction-status'));
      expect(root.querySelector('#phaser-container')!.hasAttribute('inert')).toBe(true);
      expect(unlock).not.toHaveBeenCalled();
      page.retryProgressSync(); expect(load).toHaveBeenCalledOnce();
      read.error(new Error('Offline')); fixture.detectChanges(); await fixture.whenStable();
      expect(page.lessonActive()?.lessonId).toBe('lesson-01');
      expect(pending()).toEqual(['lesson-01']);
      expect(retry.disabled).toBe(false);
      expect(root.querySelectorAll('.progress-sync-toast')).toHaveLength(1);
      const status = root.querySelector<HTMLElement>('.interaction-status')!;
      status.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
      expect(document.activeElement).toBe(retry);
      const confirmed = new Subject<void>(); load.mockReturnValue(confirmed);
      vi.spyOn(page.progress, 'isLessonCompleted').mockReturnValue(true);
      retry.click(); fixture.detectChanges(); await fixture.whenStable();
      expect(unlock).not.toHaveBeenCalled();
      pending.set([]); confirmed.next(); confirmed.complete();
      fixture.detectChanges(); await fixture.whenStable();
      expect(page.lessonActive()).toBeNull();
      expect(unlock).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(root.querySelector('#phaser-container'));
      expect(root.textContent).toContain('Progreso guardado en tu cuenta');
    } finally { gameEvents.off(GameEvents.UNLOCK_PLAYER, unlock); }
  });

  it('keeps native Enter and Space on an inline retry away from Phaser', async () => {
    const fixture = create(); const page = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    report('OpenPitScene', 'ready', 1);
    page.lessonActive.set({ lessonId: 'lesson-01' }); pending.set(['lesson-01']);
    fixture.detectChanges(); await fixture.whenStable();
    const retry = root.querySelector<HTMLButtonElement>('.progress-sync-toast button')!;
    const keyDown = vi.fn(); const keyUp = vi.fn();
    document.addEventListener('keydown', keyDown); document.addEventListener('keyup', keyUp);
    try {
      for (const key of ['Enter', ' ', 'ArrowDown', 'e']) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        retry.dispatchEvent(event); expect(event.defaultPrevented).toBe(false);
      }
      retry.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(keyDown).not.toHaveBeenCalled(); expect(keyUp).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', keyDown); document.removeEventListener('keyup', keyUp);
    }
  });

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

  it('places the objective before the account and keeps the HUB instruction static', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    report('HubScene', 'ready', 1); fixture.detectChanges();
    const hud = root.querySelector('.world-hud')!;
    expect(hud.firstElementChild?.classList.contains('world-hud__progress')).toBe(true);
    expect(hud.lastElementChild?.classList.contains('world-hud__account')).toBe(true);
    expect(hud.querySelector('h2')?.textContent).toContain('Elige un ámbito');
    expect(hud.querySelector('.progress-toggle')).toBeNull();
  });

  it('uses the existing progression to show the next class after a scene change', () => {
    zones.set([{
      id: 'zone-01', name: 'Open Pit', topic: 'Dispersión',
      completedLessons: 2, totalLessons: 3, percentage: 2 / 3 * 100, completed: false,
      lessons: [
        { lessonId: 'c1', name: 'Carguío', objective: 'Ve al tajo.', status: 'completed' },
        { lessonId: 'c2', name: 'Turnos', objective: 'Ve a la rampa.', status: 'completed' },
        { lessonId: 'c3', name: 'Botadero', objective: 'Ve al botadero y habla con su encargado.', status: 'current' },
      ],
    }]);
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    gameEvents.emit(GameEvents.SCENE_CHANGED, 'OpenPitScene');
    report('OpenPitScene', 'ready', 1); fixture.detectChanges();
    expect(root.querySelector('.objective-label')?.textContent).toContain('C3');
    expect(root.querySelector('.current-objective h2')?.textContent).toBe('Ve al botadero y habla con su encargado.');
    expect(root.querySelector('.progress-counter')?.textContent).toContain('2 de 3 clases completadas');
    expect(root.querySelector('.world-hud')?.hasAttribute('inert')).toBe(false);
  });

  it('hides and disables the background HUD during lessons and dialogues', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    report('HubScene', 'ready', 1); fixture.detectChanges();
    const hud = root.querySelector('.world-hud')!;
    fixture.componentInstance.lessonActive.set({ lessonId: 'lesson-01' }); fixture.detectChanges();
    expect(hud.hasAttribute('inert')).toBe(true);
    expect(hud.getAttribute('aria-hidden')).toBe('true');
    fixture.componentInstance.lessonActive.set(null);
    fixture.componentInstance.activeDialogue.set({ id: 'test', messages: [] }); fixture.detectChanges();
    expect(hud.hasAttribute('inert')).toBe(true);
    fixture.componentInstance.activeDialogue.set(null); fixture.detectChanges();
    expect(hud.hasAttribute('inert')).toBe(false);
    expect(hud.hasAttribute('aria-hidden')).toBe(false);
  });

  it.each(['lesson', 'dialogue'] as const)('returns keyboard focus to the map when a %s closes', async kind => {
    const fixture = create();
    const page = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    report('HubScene', 'ready', 1);
    fixture.detectChanges();
    const map = root.querySelector<HTMLElement>('#phaser-container')!;
    expect(map.tabIndex).toBe(-1);
    expect(map.getAttribute('aria-label')).toBe('Mapa del juego');
    expect(map.hasAttribute('inert')).toBe(false);

    if (kind === 'lesson') page.lessonActive.set({ lessonId: 'lesson-01' });
    else page.activeDialogue.set({ id: 'test', messages: [] });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(map.hasAttribute('inert')).toBe(true);
    expect(map.getAttribute('aria-hidden')).toBe('true');
    const dialog = root.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);
    const unlock = vi.fn();
    gameEvents.on(GameEvents.UNLOCK_PLAYER, unlock);
    try {
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape', bubbles: true, cancelable: true,
      }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(root.querySelector('[role="dialog"]')).toBeNull();
      expect(map.hasAttribute('inert')).toBe(false);
      expect(map.hasAttribute('aria-hidden')).toBe(false);
      expect(document.activeElement).toBe(map);
      expect(unlock).toHaveBeenCalledOnce();
    } finally {
      gameEvents.off(GameEvents.UNLOCK_PLAYER, unlock);
    }
  });

  it('keeps the existing saving and retry notices', () => {
    const fixture = create(); const page = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    page.savingLesson.set(true); fixture.detectChanges();
    expect(root.querySelector('.progress-sync-toast')?.textContent).toContain('Guardando progreso');
    page.savingLesson.set(false);
    page.progressSyncError.set('No se pudo guardar tu progreso.'); fixture.detectChanges();
    const retry = vi.spyOn(page, 'retryProgressSync').mockImplementation(() => undefined);
    root.querySelector<HTMLButtonElement>('.progress-sync-toast button')!.click();
    expect(retry).toHaveBeenCalledOnce();
    expect(root.querySelector('.progress-sync-toast')?.getAttribute('role')).toBe('alert');
  });

  it('keeps the notices together outside the objective panel', () => {
    const fixture = create(); const page = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    page.blockedLessonMessage.set('Completa primero la clase siguiente.');
    page.progressSyncError.set('No se pudo sincronizar.'); fixture.detectChanges();
    const notices = root.querySelector('.world-notices')!;
    expect(notices.querySelector('.lesson-locked-toast')).not.toBeNull();
    expect(notices.querySelector('.progress-sync-toast')).not.toBeNull();
    expect(root.querySelector('.world-hud')?.contains(notices)).toBe(false);
    expect(notices.querySelector('.lesson-locked-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses the shared retry control and prevents another click during an ongoing request', () => {
    const fixture = create(); const page = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    page.progressSyncError.set('No se pudo recuperar el progreso.'); fixture.detectChanges();
    const button = root.querySelector<HTMLButtonElement>('.progress-sync-toast button')!;
    const retry = vi.spyOn(page, 'retryProgressSync').mockImplementation(() => undefined);
    expect(button.classList.contains('btn')).toBe(true);
    expect(button.classList.contains('btn--primary')).toBe(true);
    expect(button.type).toBe('button');
    expect(button.disabled).toBe(false);
    button.click(); expect(retry).toHaveBeenCalledOnce();
    for (const busy of ['loading', 'saving'] as const) {
      page.loadingProgress.set(busy === 'loading');
      page.savingLesson.set(busy === 'saving'); fixture.detectChanges();
      expect(button.disabled).toBe(true);
      button.click(); expect(retry).toHaveBeenCalledOnce();
    }
    page.loadingProgress.set(false); page.savingLesson.set(false); fixture.detectChanges();
    expect(button.disabled).toBe(false);
  });

  it('keeps native retry keyboard input away from Phaser without trapping Escape or movement releases', () => {
    const fixture = create(); const page = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    page.progressSyncError.set('No se pudo recuperar el progreso.'); fixture.detectChanges();
    const button = root.querySelector<HTMLButtonElement>('.progress-sync-toast button')!;
    const keyDown = vi.fn(); const keyUp = vi.fn();
    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);
    try {
      for (const key of ['Enter', ' ', 'ArrowDown', 'e']) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        button.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
      }
      expect(keyDown).not.toHaveBeenCalled();
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(keyDown).toHaveBeenCalledOnce();
      button.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(keyUp).not.toHaveBeenCalled();
      button.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', bubbles: true }));
      expect(keyUp).toHaveBeenCalledOnce();
    } finally {
      document.removeEventListener('keydown', keyDown);
      document.removeEventListener('keyup', keyUp);
    }
  });

  it('allows native HUD keyboard actions without sending them to Phaser', () => {
    const fixture = create(); const root: HTMLElement = fixture.nativeElement;
    report('HubScene', 'ready', 1); fixture.detectChanges();
    const hud = root.querySelector('.world-hud')!;
    const observer = vi.fn();
    document.addEventListener('keydown', observer);
    try {
      for (const key of ['ArrowDown', ' ', 'e']) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        hud.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
      }
      expect(observer).not.toHaveBeenCalled();
      hud.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(observer).toHaveBeenCalledOnce();
    } finally {
      document.removeEventListener('keydown', observer);
    }
    const releases = vi.fn();
    document.addEventListener('keyup', releases);
    try {
      hud.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', bubbles: true }));
      expect(releases).toHaveBeenCalledOnce();
      hud.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(releases).toHaveBeenCalledOnce();
    } finally {
      document.removeEventListener('keyup', releases);
    }
  });
});

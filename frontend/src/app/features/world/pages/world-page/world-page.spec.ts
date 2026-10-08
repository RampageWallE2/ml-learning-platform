import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, Subject, throwError, TimeoutError } from 'rxjs';
import Phaser from 'phaser';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthenticatedUser } from '../../../../core/auth/auth.types';
import { hasSeenWorldWelcome, rememberWorldWelcome } from '../../components/world-help/world-welcome.storage';
import { clearWorldSession, saveWorldSession } from '../../../../core/world-session/world-session.storage';
import { gameEvents, GameEvents, type SceneLoadingSnapshot, type MinimapMapData } from '../../game/events/game-events';
import { ProgressService } from '../../progress/progress.service';
import { LessonDraftService } from '../../progress/lesson-draft.service';
import { ZoneProgress as ZoneProgressData } from '../../progress/progress.types';
import { WorldPage } from './world-page';
import { Dialogue } from '../../components/dialogue/dialogue';
import { hasDeliveredOpenPitReport } from '../../progress/open-pit-closure.storage';

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
  let introCompleted: ReturnType<typeof signal<boolean | null>>;
  let userState: ReturnType<typeof signal<AuthenticatedUser | null>>;

  beforeEach(() => {
    clearWorldSession();
    for (const id of ['help-a', 'help-b']) localStorage.removeItem('exploralab.world-welcome.v1.' + id);
    for (const id of ['help-a', 'help-b']) localStorage.removeItem('exploralab.open-pit-intro.v1.' + id);
    userState = signal<AuthenticatedUser | null>(null);
    for (const id of ['help-a', 'help-b']) localStorage.removeItem('exploralab.open-pit-closure.v1.' + id);
    zones = signal<ZoneProgressData[]>([]);
    pending = signal<string[]>([]);
    storageAvailable = signal(true);
    introCompleted = signal<boolean | null>(false);
    destroyGame = vi.fn();
    vi.spyOn(Phaser, 'Game').mockImplementation(function () {
      return { destroy: destroyGame, scene: { getScenes: () => [] } } as unknown as Phaser.Game;
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { user: userState.asReadonly() } },
        { provide: ProgressService, useValue: {
          zoneProgress: zones, currentLesson: signal(null),
          pendingLessonIds: pending, pendingStorageAvailable: storageAvailable,
          syncingPending: signal(false), completeLesson: vi.fn(() => of(undefined)),
          isLessonCompleted: vi.fn(() => false), isLessonAvailable: vi.fn(() => true),
          loadProgress: vi.fn(() => of(undefined)),
          openPitIntroCompleted: introCompleted.asReadonly(),
          completeOpenPitIntro: vi.fn(() => { introCompleted.set(true); return of(undefined); }),
        } },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    clearWorldSession();
    for (const id of ['help-a', 'help-b']) localStorage.removeItem('exploralab.world-welcome.v1.' + id);
    for (const id of ['help-a', 'help-b']) localStorage.removeItem('exploralab.open-pit-intro.v1.' + id);
    vi.restoreAllMocks();
    for (const id of ['help-a', 'help-b']) localStorage.removeItem('exploralab.open-pit-closure.v1.' + id);
    vi.unstubAllGlobals();
  });

  function create() {
    const fixture = TestBed.createComponent(WorldPage);
    fixture.detectChanges();
    return fixture;
  }

  it.each(['load', 'save'] as const)('releases the progress UI after a %s timeout and allows a manual retry', operation => {
    const fixture = create();
    const page = fixture.componentInstance;
    const progress = TestBed.inject(ProgressService);
    const response = new Subject<void>();
    pending.set(['lesson-01']);
    if (operation === 'load') {
      vi.mocked(progress.loadProgress).mockReturnValue(response);
      page.retryProgressSync();
    } else {
      vi.mocked(progress.completeLesson).mockReturnValue(response);
      page.completeLesson('lesson-01');
    }
    expect(page.progressSyncBusy()).toBe(true);
    response.error(new TimeoutError());
    expect(page.progressSyncBusy()).toBe(false);
    expect(page.loadingProgress()).toBe(false);
    expect(page.savingLesson()).toBe(false);
    expect(page.lessonSaved()).toBe(false);
    expect(page.progressSyncError()).not.toBeNull();
    expect(pending()).toEqual(['lesson-01']);
    expect(progress.completeLesson).toHaveBeenCalledTimes(operation === 'save' ? 1 : 0);

    const previousReads = vi.mocked(progress.loadProgress).mock.calls.length;
    vi.mocked(progress.loadProgress).mockReturnValue(of(undefined));
    page.retryProgressSync();
    expect(progress.loadProgress).toHaveBeenCalledTimes(previousReads + 1);
    expect(page.progressSyncBusy()).toBe(false);
  });

  function report(sceneKey: string, phase: SceneLoadingSnapshot['phase'], progress: number) {
    gameEvents.emit(GameEvents.SCENE_LOADING, { sceneKey, phase, progress } satisfies SceneLoadingSnapshot);
  }

  function signIn(id = 'help-a') {
    userState.set({ id, displayName: 'Ana', email: 'help@example.test', avatarUrl: null });
  }

  function reportZone(confirmed: string[] = []): ZoneProgressData {
    return {
      id: 'zone-01', name: 'Open Pit', topic: 'Dispersión', completedLessons: confirmed.length,
      totalLessons: 9, percentage: confirmed.length / 9 * 100, completed: confirmed.length === 9,
      lessons: ['lesson-01', 'lesson-02', 'lesson-03', 'lesson-04', 'lesson-05', 'lesson-06', 'lesson-07', 'lesson-08', 'lesson-09'].map(lessonId => ({
        lessonId, name: lessonId, objective: 'Consulta al encargado.',
        status: confirmed.includes(lessonId) ? 'completed' : 'pending',
      })),
    };
  }

  function readyReportRoute(confirmed: string[] = []) {
    signIn(); rememberWorldWelcome('help-a'); zones.set([reportZone(confirmed)]);
    const fixture = create();
    gameEvents.emit(GameEvents.SCENE_CHANGED, 'OpenPitScene'); report('OpenPitScene', 'ready', 1);
    fixture.detectChanges();
    return fixture;
  }

  it('returns to the supervisor only after all nine server-confirmed classes, not a pending C9', () => {
    const all = reportZone().lessons.map(lesson => lesson.lessonId);
    const fixture = readyReportRoute(all.slice(0, -1)); const page = fixture.componentInstance;
    pending.set(['lesson-09']);
    expect(page.returnToSupervisor()).toBe(false);
    gameEvents.emit(GameEvents.OPEN_DIALOGUE, { dialogueId: 'open-pit-intro', npcId: 'open-pit-guide' });
    expect(page.activeDialogue()).toBeNull();
    expect(page.blockedLessonMessage()).toContain('Falta guardar');
    gameEvents.emit(GameEvents.OPEN_DIALOGUE, { dialogueId: 'open-pit-closing', npcId: 'open-pit-guide' });
    expect(page.activeDialogue()).toBeNull();
    zones.set([reportZone(all)]); pending.set([]); fixture.detectChanges();
    expect(page.returnToSupervisor()).toBe(true);
    expect(fixture.nativeElement.querySelector('.objective-label')?.textContent).toContain('Entrega del informe');
    expect(page.progressPanel().objective).toContain('Vuelve al centro de control');
    gameEvents.emit(GameEvents.INTRO_GUIDANCE_CHANGED, { sceneKey: 'OpenPitScene', active: true });
    expect(page.progressPanel().zone?.completedLessons).toBe(9);
  });

  it('does not deliver on X, delivers only on dialogue completion, and never emits the intro teleport ID', () => {
    const fixture = readyReportRoute(reportZone().lessons.map(lesson => lesson.lessonId));
    const page = fixture.componentInstance; const finished = vi.fn();
    gameEvents.on(GameEvents.DIALOGUE_COMPLETED, finished);
    try {
      gameEvents.emit(GameEvents.OPEN_DIALOGUE, { dialogueId: 'open-pit-intro', npcId: 'open-pit-guide' });
      expect(page.activeDialogue()?.id).toBe('open-pit-closing');
      page.closeDialogue();
      expect(hasDeliveredOpenPitReport('help-a')).toBe(false);
      expect(page.returnToSupervisor()).toBe(true);
      expect(finished).not.toHaveBeenCalled();
      gameEvents.emit(GameEvents.OPEN_DIALOGUE, { dialogueId: 'open-pit-closing', npcId: 'open-pit-guide' });
      fixture.detectChanges();
      const dialogue: Dialogue = fixture.debugElement.query(By.directive(Dialogue)).componentInstance;
      for (let index = 0; index < dialogue.dialogue().messages.length; index++) {
        if (dialogue.isTyping()) dialogue.next();
        expect(hasDeliveredOpenPitReport('help-a')).toBe(false);
        expect(finished).not.toHaveBeenCalled();
        dialogue.next();
      }
      expect(hasDeliveredOpenPitReport('help-a')).toBe(true);
      expect(page.returnToSupervisor()).toBe(false);
      expect(finished).toHaveBeenCalledExactlyOnceWith({ dialogueId: 'open-pit-closing', sceneKey: 'OpenPitScene' });
      expect(page.progress.completeLesson).not.toHaveBeenCalled();
      fixture.destroy();
      const reload = create();
      expect(reload.componentInstance.openPitReportDelivered()).toBe(true);
    } finally { gameEvents.off(GameEvents.DIALOGUE_COMPLETED, finished); }
  });

  it('closes an unfinished delivery on account change without recording it for either account', () => {
    const fixture = readyReportRoute(reportZone().lessons.map(lesson => lesson.lessonId)); const page = fixture.componentInstance;
    gameEvents.emit(GameEvents.OPEN_DIALOGUE, { dialogueId: 'open-pit-closing', npcId: 'open-pit-guide' });
    signIn('help-b'); rememberWorldWelcome('help-b'); fixture.detectChanges();
    page.completeDialogue();
    expect(page.activeDialogue()).toBeNull();
    expect(hasDeliveredOpenPitReport('help-a')).toBe(false);
    expect(hasDeliveredOpenPitReport('help-b')).toBe(false);
  });

  it('keeps delivery dismissed in this visit if browser storage cannot persist it', () => {
    const fixture = readyReportRoute(reportZone().lessons.map(lesson => lesson.lessonId)); const page = fixture.componentInstance;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    gameEvents.emit(GameEvents.OPEN_DIALOGUE, { dialogueId: 'open-pit-closing', npcId: 'open-pit-guide' });
    page.completeDialogue();
    expect(page.returnToSupervisor()).toBe(false);
    expect(hasDeliveredOpenPitReport('help-a')).toBe(false);
    signIn('help-b'); fixture.detectChanges();
    expect(page.openPitReportDelivered()).toBe(false);
  });

  function selectReportNote(root: HTMLElement, lessonId: string) {
    const control = root.querySelector<HTMLSelectElement>('.report-select')!;
    control.value = lessonId;
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const minimapData: MinimapMapData = {
    sceneKey: 'OpenPitScene', worldWidth: 3840, worldHeight: 3840, width: 1000, height: 1000,
    terrain: [], lessons: [{ lessonId: 'lesson-01', number: 1, name: 'Dispersión de los datos', x: 250, y: 350 }],
  };

  it('shows the intro instruction on entry instead of C1 and restores saved progress after the intro', () => {
    const fixture = readyReportRoute(['lesson-01']);
    const page = fixture.componentInstance; const root: HTMLElement = fixture.nativeElement;
    gameEvents.emit(GameEvents.INTRO_GUIDANCE_CHANGED, { sceneKey: 'OpenPitScene', active: true });
    fixture.detectChanges();
    expect(root.querySelector('.current-objective h2')?.textContent).toBe('Habla con el supervisor para empezar.');
    expect(root.querySelector('.objective-label')?.textContent).not.toContain('C2');
    expect(page.helpNextStep()).toContain('supervisor');
    gameEvents.emit(GameEvents.INTRO_GUIDANCE_CHANGED, { sceneKey: 'OpenPitScene', active: false });
    fixture.detectChanges();
    expect(page.progressPanel().zone?.completedLessons).toBe(1);
    expect(root.querySelector('.objective-label')?.textContent).toContain('C2');
    gameEvents.emit(GameEvents.INTRO_GUIDANCE_CHANGED, { sceneKey: 'OpenPitScene', active: true });
    gameEvents.emit(GameEvents.SCENE_CHANGED, 'HubScene');
    expect(page.progressPanel().name).toBe('HUB');
  });

  it('remembers the finished Open Pit intro and dismisses location help on return and after remounting', () => {
    const fixture = readyReportRoute(); const page = fixture.componentInstance;
    gameEvents.emit(GameEvents.INTRO_GUIDANCE_CHANGED, { sceneKey: 'OpenPitScene', active: true });
    gameEvents.emit(GameEvents.OPEN_DIALOGUE, { npcId: 'open-pit-guide', dialogueId: 'open-pit-intro' });
    fixture.detectChanges();
    fixture.debugElement.query(By.directive(Dialogue)).componentInstance.completed.emit();
    expect(page.progress.openPitIntroCompleted()).toBe(true);
    const dismiss = vi.fn(); gameEvents.on(GameEvents.INTRO_GUIDANCE_DISMISSED, dismiss);
    try {
      gameEvents.emit(GameEvents.SCENE_CHANGED, 'HubScene');
      gameEvents.emit(GameEvents.SCENE_CHANGED, 'OpenPitScene');
      gameEvents.emit(GameEvents.INTRO_GUIDANCE_CHANGED, { sceneKey: 'OpenPitScene', active: true });
      expect(dismiss).toHaveBeenLastCalledWith('OpenPitScene');
      expect(page.progressPanel().objective).not.toContain('supervisor');
      fixture.destroy();
      const reload = create();
      gameEvents.emit(GameEvents.SCENE_CHANGED, 'OpenPitScene');
      gameEvents.emit(GameEvents.INTRO_GUIDANCE_CHANGED, { sceneKey: 'OpenPitScene', active: true });
      expect(dismiss).toHaveBeenCalledTimes(2);
      expect(reload.componentInstance.progressPanel().objective).not.toContain('supervisor');
      expect(page.progress.completeLesson).not.toHaveBeenCalled();
    } finally { gameEvents.off(GameEvents.INTRO_GUIDANCE_DISMISSED, dismiss); }
  });

  it('does not hide the Open Pit intro location help for another account', () => {
    localStorage.setItem('exploralab.open-pit-intro.v1.help-a', 'completed');
    signIn('help-b'); rememberWorldWelcome('help-b'); zones.set([reportZone()]);
    const fixture = create();
    gameEvents.emit(GameEvents.SCENE_CHANGED, 'OpenPitScene');
    gameEvents.emit(GameEvents.INTRO_GUIDANCE_CHANGED, { sceneKey: 'OpenPitScene', active: true });
    expect(fixture.componentInstance.progressPanel().objective).toBe('Habla con el supervisor para empezar.');
  });

  it('emits the completed Open Pit intro only from the dialogue completion output and does not complete C1', () => {
    signIn(); rememberWorldWelcome('help-a');
    const fixture = create(); const page = fixture.componentInstance;
    gameEvents.emit(GameEvents.SCENE_CHANGED, 'OpenPitScene'); report('OpenPitScene', 'ready', 1);
    const finished = vi.fn(); const lock = vi.fn();
    gameEvents.on(GameEvents.DIALOGUE_COMPLETED, finished);
    gameEvents.on(GameEvents.LOCK_PLAYER, lock);
    try {
      gameEvents.emit(GameEvents.OPEN_DIALOGUE, { npcId: 'open-pit-guide', dialogueId: 'open-pit-intro' });
      fixture.detectChanges();
      expect(page.activeDialogue()?.messages).toHaveLength(4);
      expect(lock).toHaveBeenCalledOnce();
      expect(finished).not.toHaveBeenCalled();
      fixture.debugElement.query(By.directive(Dialogue)).componentInstance.completed.emit();
      expect(page.activeDialogue()).toBeNull();
      expect(finished).toHaveBeenCalledExactlyOnceWith({ dialogueId: 'open-pit-intro', sceneKey: 'OpenPitScene' });
      page.completeDialogue(); expect(finished).toHaveBeenCalledOnce();
      expect(page.progress.completeLesson).not.toHaveBeenCalled();
      expect(page.lessonActive()).toBeNull();
    } finally {
      gameEvents.off(GameEvents.DIALOGUE_COMPLETED, finished);
      gameEvents.off(GameEvents.LOCK_PLAYER, lock);
    }
  });

  it.each(['close', 'Escape'])('cancels the Open Pit intro with %s without requesting a teleport', action => {
    signIn(); rememberWorldWelcome('help-a');
    const fixture = create(); const page = fixture.componentInstance; const root: HTMLElement = fixture.nativeElement;
    gameEvents.emit(GameEvents.SCENE_CHANGED, 'OpenPitScene'); report('OpenPitScene', 'ready', 1);
    const finished = vi.fn(); gameEvents.on(GameEvents.DIALOGUE_COMPLETED, finished);
    try {
      gameEvents.emit(GameEvents.OPEN_DIALOGUE, { npcId: 'open-pit-guide', dialogueId: 'open-pit-intro' });
      fixture.detectChanges();
      if (action === 'close') root.querySelector<HTMLButtonElement>('.close-button')!.click();
      else root.querySelector('.interaction-panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      expect(page.activeDialogue()).toBeNull();
      expect(finished).not.toHaveBeenCalled();
      expect(page.progress.completeLesson).not.toHaveBeenCalled();
      expect(page.progress.openPitIntroCompleted()).toBe(false);
    } finally { gameEvents.off(GameEvents.DIALOGUE_COMPLETED, finished); }
  });

  it('ignores an obsolete browser intro mark when the server still reports pending', () => {
    localStorage.setItem('exploralab.open-pit-intro.v1.help-a', 'completed');
    const fixture = readyReportRoute();
    gameEvents.emit(GameEvents.INTRO_GUIDANCE_CHANGED, { sceneKey: 'OpenPitScene', active: true });
    expect(fixture.componentInstance.progressPanel().objective).toContain('supervisor');
    expect(fixture.componentInstance.progress.openPitIntroCompleted()).toBe(false);
  });

  it('passes pending intro guidance to the minimap and removes it after confirmation', () => {
    const fixture = readyReportRoute();
    gameEvents.emit(GameEvents.MINIMAP_MAP_CHANGED, { ...minimapData, supervisor: { x: 410, y: 875 } });
    gameEvents.emit(GameEvents.INTRO_GUIDANCE_CHANGED, { sceneKey: 'OpenPitScene', active: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.minimap-supervisor title')?.textContent).toContain('para empezar');
    introCompleted.set(true);
    gameEvents.emit(GameEvents.INTRO_GUIDANCE_CHANGED, { sceneKey: 'OpenPitScene', active: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.minimap-supervisor')).toBeNull();
  });

  it.each([false, true])('keeps the last intro message on failure and reconciles before retrying (saved: %s)', saved => {
    const fixture = readyReportRoute(); const page = fixture.componentInstance;
    const progress = page.progress;
    const write = new Subject<void>();
    vi.mocked(progress.completeOpenPitIntro).mockReturnValue(write);
    const finished = vi.fn(); gameEvents.on(GameEvents.DIALOGUE_COMPLETED, finished);
    try {
      gameEvents.emit(GameEvents.OPEN_DIALOGUE, { npcId: 'open-pit-guide', dialogueId: 'open-pit-intro' });
      fixture.detectChanges();
      const dialogue: Dialogue = fixture.debugElement.query(By.directive(Dialogue)).componentInstance;
      const lastIndex = dialogue.dialogue().messages.length - 1;
      for (let index = 0; index < lastIndex; index++) {
        if (dialogue.isTyping()) dialogue.next();
        dialogue.next();
        expect(progress.completeOpenPitIntro).not.toHaveBeenCalled();
        expect(finished).not.toHaveBeenCalled();
      }
      if (dialogue.isTyping()) dialogue.next();
      expect(progress.completeOpenPitIntro).not.toHaveBeenCalled();
      dialogue.next(); page.completeDialogue(); page.closeDialogue();
      fixture.detectChanges();
      expect(progress.completeOpenPitIntro).toHaveBeenCalledTimes(1);
      expect(page.savingIntro()).toBe(true);
      expect(fixture.nativeElement.querySelector('.continue-button').disabled).toBe(true);
      expect(page.activeDialogue()?.id).toBe('open-pit-intro');
      expect(finished).not.toHaveBeenCalled();
      write.error(new TimeoutError()); fixture.detectChanges();
      expect(page.savingIntro()).toBe(false);
      expect(page.progressSyncMessage()).toContain('no necesitas repetir');
      expect(dialogue.currentIndex()).toBe(lastIndex);

      const read = new Subject<void>(); const retry = new Subject<void>();
      vi.mocked(progress.loadProgress).mockReturnValue(read);
      vi.mocked(progress.completeOpenPitIntro).mockImplementation(() => saved ? of(undefined) : retry);
      page.retryProgressSync();
      expect(progress.completeOpenPitIntro).toHaveBeenCalledTimes(1);
      introCompleted.set(saved); read.next(); read.complete();
      if (!saved) {
        expect(finished).not.toHaveBeenCalled();
        introCompleted.set(true); retry.next(); retry.complete();
      }
      expect(page.activeDialogue()).toBeNull();
      expect(finished).toHaveBeenCalledExactlyOnceWith({ dialogueId: 'open-pit-intro', sceneKey: 'OpenPitScene' });
      expect(progress.completeLesson).not.toHaveBeenCalled();
    } finally { gameEvents.off(GameEvents.DIALOGUE_COMPLETED, finished); }
  });

  it('does not transport a different account when a previous intro save arrives late', () => {
    const fixture = readyReportRoute(); const page = fixture.componentInstance;
    const write = new Subject<void>(); vi.mocked(page.progress.completeOpenPitIntro).mockReturnValue(write);
    const finished = vi.fn(); gameEvents.on(GameEvents.DIALOGUE_COMPLETED, finished);
    try {
      gameEvents.emit(GameEvents.OPEN_DIALOGUE, { npcId: 'open-pit-guide', dialogueId: 'open-pit-intro' });
      page.completeDialogue();
      signIn('help-b'); rememberWorldWelcome('help-b'); fixture.detectChanges();
      expect(page.activeDialogue()).toBeNull(); expect(page.savingIntro()).toBe(false);
      write.next(); write.complete();
      expect(finished).not.toHaveBeenCalled();
    } finally { gameEvents.off(GameEvents.DIALOGUE_COMPLETED, finished); }
  });

  it('accepts minimap data before scene-ready, updates the player and hides the HUD during activities or transitions', () => {
    signIn(); rememberWorldWelcome('help-a'); zones.set([reportZone()]);
    const fixture = create(); const page = fixture.componentInstance; const root: HTMLElement = fixture.nativeElement;
    report('OpenPitScene', 'preparing', 1);
    gameEvents.emit(GameEvents.MINIMAP_MAP_CHANGED, minimapData);
    gameEvents.emit(GameEvents.MINIMAP_PLAYER_CHANGED, { sceneKey: 'OpenPitScene', x: 1920, y: 384, heading: 90 });
    gameEvents.emit(GameEvents.SCENE_CHANGED, 'OpenPitScene'); report('OpenPitScene', 'ready', 1);
    fixture.detectChanges();
    expect(root.querySelector('app-world-minimap')).not.toBeNull();
    expect(root.querySelector('.minimap-player')?.getAttribute('transform')).toBe('translate(500 100) rotate(90)');
    page.activeDialogue.set({ id: 'test', messages: [] }); fixture.detectChanges();
    expect(root.querySelector('.world-hud')?.hasAttribute('inert')).toBe(true);
    expect(root.querySelector('.world-hud')?.getAttribute('aria-hidden')).toBe('true');
    page.activeDialogue.set(null); fixture.detectChanges();
    expect(root.querySelector('.world-hud')?.hasAttribute('inert')).toBe(false);
    report('HubScene', 'loading', 0); gameEvents.emit(GameEvents.SCENE_CHANGED, 'HubScene'); fixture.detectChanges();
    expect(root.querySelector('app-world-minimap')).toBeNull();
    expect(page.minimap()).toBeNull(); expect(page.minimapPlayer()).toBeNull();
  });

  it('unsubscribes the minimap bridge and does not preserve coordinates after leaving the world page', () => {
    const events = [GameEvents.MINIMAP_MAP_CHANGED, GameEvents.MINIMAP_PLAYER_CHANGED, GameEvents.INTRO_GUIDANCE_CHANGED];
    const counts = events.map(event => gameEvents.listenerCount(event));
    const fixture = create();
    events.forEach((event, index) => expect(gameEvents.listenerCount(event)).toBe(counts[index] + 1));
    fixture.destroy();
    events.forEach((event, index) => expect(gameEvents.listenerCount(event)).toBe(counts[index]));
  });

  it('opens the report from the Open Pit route, locks the map and restores the opener on Escape', async () => {
    signIn(); rememberWorldWelcome('help-a'); zones.set([reportZone(['lesson-01'])]);
    const fixture = create(); const page = fixture.componentInstance; const root: HTMLElement = fixture.nativeElement;
    report('HubScene', 'ready', 1); fixture.detectChanges();
    expect(root.querySelector('.progress-report')).toBeNull(); page.openReport(); expect(page.reportOpen()).toBe(false);
    gameEvents.emit(GameEvents.SCENE_CHANGED, 'OpenPitScene'); report('OpenPitScene', 'ready', 1); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('.progress-toggle')!.click(); fixture.detectChanges();
    const opener = root.querySelector<HTMLButtonElement>('.progress-report')!;
    const lock = vi.fn(); const unlock = vi.fn(); const writes = vi.spyOn(Storage.prototype, 'setItem');
    gameEvents.on(GameEvents.LOCK_PLAYER, lock); gameEvents.on(GameEvents.UNLOCK_PLAYER, unlock);
    try {
      opener.focus(); opener.click(); fixture.detectChanges(); await fixture.whenStable();
      expect(page.reportOpen()).toBe(true); expect(lock).toHaveBeenCalledOnce();
      expect(root.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Informe del turno');
      expect(root.querySelector('#phaser-container')?.hasAttribute('inert')).toBe(true);
      expect(root.querySelector('.world-hud')?.getAttribute('aria-hidden')).toBe('true');
      expect(root.querySelectorAll('app-open-pit-report svg circle')).toHaveLength(10);
      expect(document.activeElement).toBe(root.querySelector('app-open-pit-report h1'));
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      fixture.detectChanges(); await fixture.whenStable();
      expect(page.reportOpen()).toBe(false); expect(unlock).toHaveBeenCalledOnce();
      expect(root.querySelector('#phaser-container')?.hasAttribute('inert')).toBe(false);
      expect(document.activeElement).toBe(opener);
      expect(page.progress.completeLesson).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    } finally { gameEvents.off(GameEvents.LOCK_PLAYER, lock); gameEvents.off(GameEvents.UNLOCK_PLAYER, unlock); }
  });

  it('does not open a report over loading, help, a lesson or dialogue, or allow interactions behind it', () => {
    const fixture = readyReportRoute(); const page = fixture.componentInstance;
    report('OpenPitScene', 'loading', 0.5); page.openReport(); expect(page.reportOpen()).toBe(false);
    report('OpenPitScene', 'ready', 1); page.openWorldHelp(); page.openReport(); expect(page.reportOpen()).toBe(false);
    page.closeWorldHelp(); page.lessonActive.set({ lessonId: 'lesson-01' }); page.openReport(); expect(page.reportOpen()).toBe(false);
    page.lessonActive.set(null); page.activeDialogue.set({ id: 'test', messages: [] }); page.openReport(); expect(page.reportOpen()).toBe(false);
    page.activeDialogue.set(null); page.openReport(); fixture.detectChanges();
    page.openWorldHelp(); gameEvents.emit(GameEvents.OPEN_LESSON, { lessonId: 'lesson-01' });
    gameEvents.emit(GameEvents.OPEN_DIALOGUE, { dialogueId: 'intro-01' });
    expect(page.helpOpen()).toBe(false); expect(page.lessonActive()).toBeNull(); expect(page.activeDialogue()).toBeNull();
    expect(page.reportOpen()).toBe(true); expect(page.progress.completeLesson).not.toHaveBeenCalled();
  });

  it('uses one inline retry for pending notes and reveals a finding only after confirmed reconciliation', async () => {
    const fixture = readyReportRoute(['lesson-01']); const page = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement; pending.set(['lesson-02']); page.openReport(); fixture.detectChanges();
    selectReportNote(root, 'lesson-02'); fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelector('.report-empty')?.textContent).toContain('no necesitas repetirla');
    expect(root.querySelector('app-open-pit-report svg')).toBeNull();
    expect(root.querySelectorAll('.progress-sync-toast')).toHaveLength(1);
    expect(root.querySelector('.world-notices .progress-sync-toast')).toBeNull();
    const retry = root.querySelector<HTMLButtonElement>('.progress-sync-toast button')!;
    expect(root.querySelector('[role="dialog"]')?.contains(retry)).toBe(true);
    const response = new Subject<void>(); vi.spyOn(page.progress, 'loadProgress').mockReturnValue(response);
    const unlock = vi.fn(); gameEvents.on(GameEvents.UNLOCK_PLAYER, unlock);
    try {
      retry.focus(); retry.click(); fixture.detectChanges(); await fixture.whenStable();
      expect(retry.disabled).toBe(true); expect(root.querySelector('.report-empty')?.textContent).toContain('Consultando tu progreso');
      zones.set([reportZone(['lesson-01', 'lesson-02'])]); pending.set([]);
      response.next(); response.complete(); fixture.detectChanges(); await fixture.whenStable();
      expect(root.querySelector('.report-finding')?.textContent).toContain('100 toneladas por camión');
      expect(root.querySelectorAll('app-open-pit-report svg circle')).toHaveLength(10);
      expect(page.reportOpen()).toBe(true); expect(unlock).not.toHaveBeenCalled();
      expect(page.progress.completeLesson).not.toHaveBeenCalled();
      expect(root.querySelector('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
    } finally { gameEvents.off(GameEvents.UNLOCK_PLAYER, unlock); }
  });

  it('immediately removes report permissions on an account change and closes the previous account report', async () => {
    const fixture = readyReportRoute(['lesson-01', 'lesson-02']); const page = fixture.componentInstance;
    page.openReport(); fixture.detectChanges(); await fixture.whenStable();
    expect(page.reportConfirmedLessonIds()).toEqual(['lesson-01', 'lesson-02']);
    rememberWorldWelcome('help-b'); signIn('help-b');
    expect(page.reportConfirmedLessonIds()).toEqual([]); expect(page.reportPendingLessonIds()).toEqual([]);
    zones.set([reportZone()]); fixture.detectChanges(); await fixture.whenStable();
    expect(page.reportOpen()).toBe(false); expect(fixture.nativeElement.querySelector('app-open-pit-report')).toBeNull();
    page.openReport(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-open-pit-report svg')).toBeNull();
  });

  it('rebuilds available notes from confirmed progress on reopening without another record or save', () => {
    const fixture = readyReportRoute(['lesson-01', 'lesson-02', 'lesson-03']); const page = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    page.openReport(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.report-finding')?.textContent).toContain('7 minutos de diferencia');
    selectReportNote(root, 'lesson-01'); fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('.report-footer button')!.click(); fixture.detectChanges();
    page.openReport(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.report-finding')?.textContent).toContain('7 minutos de diferencia');
    expect(page.progress.completeLesson).not.toHaveBeenCalled();
    expect(page.progress.loadProgress).toHaveBeenCalledTimes(1);
  });

  it('returns from the report to the map if reconciliation removes its original route button', async () => {
    const fixture = readyReportRoute(['lesson-01']); const page = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('.progress-toggle')!.click(); fixture.detectChanges();
    const opener = root.querySelector<HTMLButtonElement>('.progress-report')!;
    opener.focus(); opener.click(); fixture.detectChanges(); await fixture.whenStable();
    zones.set([]); fixture.detectChanges(); expect(opener.isConnected).toBe(false);
    page.closeReport(); fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('#phaser-container'));
  });

  it('makes confirmed C4–C6 report notes available from the existing zone progress without another save', () => {
    const fixture = readyReportRoute(['lesson-04', 'lesson-05', 'lesson-06']); const page = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    page.openReport(); fixture.detectChanges();
    expect(page.reportConfirmedLessonIds()).toEqual(['lesson-04', 'lesson-05', 'lesson-06']);
    expect(root.querySelector('.report-calculation')?.textContent).toContain('8 ÷ 4 registros = 2 (t/h)²');
    for (const index of [3, 4, 5]) {
      selectReportNote(root, 'lesson-0' + (index + 1)); fixture.detectChanges();
      expect(root.querySelector('.report-finding')).not.toBeNull();
      expect(root.querySelectorAll('app-open-pit-report svg')).toHaveLength(1);
    }
    selectReportNote(root, 'lesson-01'); fixture.detectChanges();
    expect(root.querySelector('app-open-pit-report svg')).toBeNull();
    expect(page.progress.completeLesson).not.toHaveBeenCalled();
    expect(page.progress.loadProgress).toHaveBeenCalledTimes(1);
  });

  it('makes confirmed C7–C9 report notes available and preserves native selector keys without another save', async () => {
    const fixture = readyReportRoute(['lesson-07', 'lesson-08', 'lesson-09']); const page = fixture.componentInstance;
    const root: HTMLElement = fixture.nativeElement;
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    page.openReport(); fixture.detectChanges(); await fixture.whenStable();
    expect(page.reportConfirmedLessonIds()).toEqual(['lesson-07', 'lesson-08', 'lesson-09']);
    const control = root.querySelector<HTMLSelectElement>('.report-select')!;
    expect(control.value).toBe('lesson-09'); expect(root.querySelectorAll('option')).toHaveLength(9);
    const escaped = vi.fn(); root.addEventListener('keydown', escaped);
    control.focus();
    const arrow = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    control.dispatchEvent(arrow);
    expect(arrow.defaultPrevented).toBe(false); expect(escaped).not.toHaveBeenCalled();
    for (const id of ['lesson-07', 'lesson-08', 'lesson-09']) {
      selectReportNote(root, id); fixture.detectChanges();
      expect(root.querySelector('.report-finding')).not.toBeNull();
      expect(root.querySelectorAll('app-open-pit-report svg')).toHaveLength(1);
      expect(document.activeElement).toBe(control);
    }
    selectReportNote(root, 'lesson-06'); fixture.detectChanges();
    expect(root.querySelector('app-open-pit-report svg')).toBeNull();
    expect(page.progress.completeLesson).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    expect(page.progress.loadProgress).toHaveBeenCalledTimes(1);
    expect(page.reportOpen()).toBe(true); expect(root.querySelector('#phaser-container')?.hasAttribute('inert')).toBe(true);
  });

  it('waits for a ready map, welcomes once on dismissal and preserves focus and movement locking', async () => {
    signIn();
    const lock = vi.fn(); const unlock = vi.fn();
    gameEvents.on(GameEvents.LOCK_PLAYER, lock); gameEvents.on(GameEvents.UNLOCK_PLAYER, unlock);
    try {
      const fixture = create(); const page = fixture.componentInstance;
      const root: HTMLElement = fixture.nativeElement;
      expect(page.helpOpen()).toBe(false);
      expect(root.querySelector('app-world-help')).toBeNull();
      report('HubScene', 'preparing', 1); fixture.detectChanges();
      expect(page.helpOpen()).toBe(false);
      report('HubScene', 'ready', 1); fixture.detectChanges(); await fixture.whenStable();
      expect(page.helpOpen()).toBe(true);
      expect(page.firstWelcome()).toBe(true);
      expect(root.querySelector('app-world-help h1')?.textContent).toBe('Antes de comenzar');
      expect(root.querySelector('app-world-help')?.textContent).toContain('siguiente turno');
      expect(root.querySelector('app-world-help')?.textContent).toContain('Minería de Superficie');
      expect(root.querySelector('app-world-help')?.textContent).toContain('flechas del teclado');
      expect(root.querySelector('app-world-help details')?.hasAttribute('open')).toBe(false);
      expect(root.querySelector('.world-hud')?.hasAttribute('inert')).toBe(true);
      const map = root.querySelector<HTMLElement>('#phaser-container')!;
      expect(map.hasAttribute('inert')).toBe(true);
      expect(root.querySelector('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
      expect(lock).toHaveBeenCalledOnce();
      expect(hasSeenWorldWelcome('help-a')).toBe(false);
      root.querySelector<HTMLButtonElement>('app-world-help button')!.click();
      fixture.detectChanges(); await fixture.whenStable();
      expect(page.helpOpen()).toBe(false);
      expect(hasSeenWorldWelcome('help-a')).toBe(true);
      expect(map.hasAttribute('inert')).toBe(false);
      expect(document.activeElement).toBe(map);
      expect(unlock).toHaveBeenCalledOnce();
      report('SurfaceSelectionScene', 'ready', 1); fixture.detectChanges();
      expect(page.helpOpen()).toBe(false);
      fixture.destroy();
      const returning = create(); report('HubScene', 'ready', 1); returning.detectChanges();
      expect(returning.componentInstance.helpOpen()).toBe(false);
    } finally {
      gameEvents.off(GameEvents.LOCK_PLAYER, lock); gameEvents.off(GameEvents.UNLOCK_PLAYER, unlock);
    }
  });

  it('reopens help from Cuenta without a HUD button and returns to the account trigger on Escape', async () => {
    signIn(); rememberWorldWelcome('help-a');
    const fixture = create(); const page = fixture.componentInstance;
    report('SurfaceSelectionScene', 'ready', 1); fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('app-world-help')).toBeNull();
    expect(root.querySelector('.world-hud .account-menu__help')).toBeNull();
    const trigger = root.querySelector<HTMLButtonElement>('.account-menu__trigger')!;
    trigger.click(); fixture.detectChanges();
    const help = root.querySelector<HTMLButtonElement>('.account-menu__help')!;
    help.focus(); help.click(); fixture.detectChanges(); await fixture.whenStable();
    expect(page.firstWelcome()).toBe(false);
    expect(root.querySelector('.account-menu__panel')).toBeNull();
    expect(root.querySelector('app-world-help h1')?.textContent).toBe('Cómo jugar');
    expect(root.querySelector('.help-next-step')?.textContent).toContain('Tajo Abierto / Open Pit');
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges(); await fixture.whenStable();
    expect(page.helpOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(page.progress.completeLesson).not.toHaveBeenCalled();
  });

  it('shows actual touch controls instead of keyboard instructions on coarse touch devices', async () => {
    signIn();
    vi.mocked(Phaser.Game).mockImplementation(function () {
      return { destroy: destroyGame, device: { input: { touch: true } }, scene: { getScenes: () => [] } } as unknown as Phaser.Game;
    });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const fixture = create(); report('OpenPitScene', 'ready', 1);
    fixture.detectChanges(); await fixture.whenStable();
    const help = fixture.nativeElement.querySelector('app-world-help') as HTMLElement;
    expect(help.textContent).toContain('Arrastra el círculo');
    expect(help.textContent).toContain('toca el botón');
    expect(help.textContent).not.toContain('flechas del teclado');
    expect(help.textContent).toContain('encargado del carguío');
    expect(help.textContent).toContain('señal C1');
    expect(help.querySelector('kbd')?.textContent).toBe('E');
  });

  it('welcomes another account without marking an undismissed welcome for the previous owner', async () => {
    signIn();
    const fixture = create(); report('HubScene', 'ready', 1);
    fixture.detectChanges(); await fixture.whenStable();
    signIn('help-b'); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.componentInstance.helpOpen()).toBe(true);
    fixture.componentInstance.closeWorldHelp(); fixture.detectChanges(); await fixture.whenStable();
    expect(hasSeenWorldWelcome('help-b')).toBe(true);
    expect(hasSeenWorldWelcome('help-a')).toBe(false);
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#phaser-container'));
    signIn(); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.componentInstance.helpOpen()).toBe(true);
    fixture.componentInstance.closeWorldHelp(); fixture.detectChanges();
    signIn('help-b'); fixture.detectChanges();
    expect(fixture.componentInstance.helpOpen()).toBe(false);
  });

  it('can dismiss help when local storage fails and does not reopen it on each scene change', async () => {
    signIn();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    const fixture = create(); report('HubScene', 'ready', 1);
    fixture.detectChanges(); await fixture.whenStable();
    fixture.componentInstance.closeWorldHelp(); fixture.detectChanges();
    report('SurfaceSelectionScene', 'ready', 1); fixture.detectChanges();
    expect(fixture.componentInstance.helpOpen()).toBe(false);
    fixture.componentInstance.openWorldHelp(); fixture.detectChanges();
    expect(fixture.componentInstance.helpOpen()).toBe(true);
    expect(fixture.componentInstance.firstWelcome()).toBe(false);
  });

  it('keeps a single accessible pending-save notice inside help and does not unlock on retry', async () => {
    signIn(); pending.set(['lesson-01']);
    const fixture = create(); const page = fixture.componentInstance;
    report('HubScene', 'ready', 1); fixture.detectChanges(); await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.progress-sync-toast')).toHaveLength(1);
    expect(root.querySelector('.world-notices .progress-sync-toast')).toBeNull();
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('Pendiente de guardar');
    const retry = root.querySelector<HTMLButtonElement>('.progress-sync-toast button')!;
    const response = new Subject<void>();
    vi.spyOn(page.progress, 'loadProgress').mockReturnValue(response);
    const unlock = vi.fn(); gameEvents.on(GameEvents.UNLOCK_PLAYER, unlock);
    try {
      retry.focus(); retry.click(); fixture.detectChanges(); await fixture.whenStable();
      expect(retry.disabled).toBe(true);
      expect(page.helpOpen()).toBe(true);
      pending.set([]); response.next(); response.complete(); fixture.detectChanges(); await fixture.whenStable();
      expect(root.querySelectorAll('.progress-sync-toast')).toHaveLength(1);
      expect(root.querySelector('.progress-sync-toast')?.textContent).toContain('Progreso guardado en tu cuenta');
      expect(page.helpOpen()).toBe(true);
      expect(unlock).not.toHaveBeenCalled();
      expect(root.querySelector('[role="dialog"]')?.contains(document.activeElement)).toBe(true);
    } finally { gameEvents.off(GameEvents.UNLOCK_PLAYER, unlock); }
  });

  it('does not replace a lesson or dialogue with help, or open another interaction behind help', async () => {
    signIn(); rememberWorldWelcome('help-a');
    const fixture = create(); const page = fixture.componentInstance;
    page.openWorldHelp(); expect(page.helpOpen()).toBe(false);
    report('HubScene', 'ready', 1); fixture.detectChanges();
    page.lessonActive.set({ lessonId: 'lesson-01' }); page.openWorldHelp();
    expect(page.helpOpen()).toBe(false);
    page.lessonActive.set(null); page.activeDialogue.set({ id: 'test', messages: [] }); page.openWorldHelp();
    expect(page.helpOpen()).toBe(false);
    page.activeDialogue.set(null); page.openWorldHelp(); fixture.detectChanges(); await fixture.whenStable();
    gameEvents.emit(GameEvents.OPEN_LESSON, { lessonId: 'lesson-01' });
    gameEvents.emit(GameEvents.OPEN_DIALOGUE, { dialogueId: 'intro-01' });
    expect(page.lessonActive()).toBeNull(); expect(page.activeDialogue()).toBeNull();
    expect(page.helpOpen()).toBe(true);
    expect(page.progress.completeLesson).not.toHaveBeenCalled();
  });

  it('uses the actual next Open Pit objective when a returning learner consults help', async () => {
    signIn(); rememberWorldWelcome('help-a');
    zones.set([{
      id: 'zone-01', name: 'Open Pit', topic: 'Dispersión', completedLessons: 1, totalLessons: 2,
      percentage: 50, completed: false, lessons: [
        { lessonId: 'lesson-01', name: 'Dispersión de los datos', objective: 'Ve al fondo del tajo.', status: 'completed' },
        { lessonId: 'lesson-02', name: 'Promedio y dispersión', objective: 'Ve a la rampa y habla con el encargado del control.', status: 'current' },
      ],
    }]);
    const fixture = create();
    gameEvents.emit(GameEvents.SCENE_CHANGED, 'OpenPitScene'); report('OpenPitScene', 'ready', 1);
    fixture.detectChanges(); fixture.componentInstance.openWorldHelp(); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.help-next-step')?.textContent).toBe('Ve a la rampa y habla con el encargado del control.');
  });

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
    expect(root.querySelector('[role=alert]')?.textContent).toContain('No pudimos preparar el mapa');
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
    const account = fixture.debugElement.query(By.css('app-account-menu'));
    expect(account.componentInstance.placement()).toBe('bottom-left');
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

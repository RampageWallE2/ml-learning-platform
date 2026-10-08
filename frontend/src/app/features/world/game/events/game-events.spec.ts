import { gameEvents, GameEvents, type SceneLoadingSnapshot } from './game-events';

vi.mock('phaser', async () => {
  const { default: EventEmitter } = await import('eventemitter3');
  return { default: { Events: { EventEmitter } } };
});

// These calls are checked by TypeScript, never executed by the test runner.
function checkEventContracts(): void {
  // @ts-expect-error Unknown event names must not be accepted.
  gameEvents.emit('open-leson', { lessonId: 'lesson-01' });
  // @ts-expect-error Opening a lesson requires its identifier.
  gameEvents.emit(GameEvents.OPEN_LESSON, { dialogueId: 'intro' });
  // @ts-expect-error Scene loading requires a complete snapshot, not a number.
  gameEvents.emit(GameEvents.SCENE_LOADING, 1);
  // @ts-expect-error A lesson request cannot be omitted.
  gameEvents.emit(GameEvents.OPEN_LESSON);
  // @ts-expect-error Player locking has no payload.
  gameEvents.emit(GameEvents.LOCK_PLAYER, 'extra');
  // @ts-expect-error Listener arguments must match the event snapshot.
  gameEvents.on(GameEvents.SCENE_LOADING, (progress: number) => {
    void progress;
  });
  // @ts-expect-error Removing a listener also respects the event contract.
  gameEvents.off(GameEvents.OPEN_LESSON, (request: number) => {
    void request;
  });
}
void checkEventContracts;

describe('gameEvents contract over the Phaser emitter', () => {
  afterEach(() => gameEvents.removeAllListeners());

  it('delivers the same snapshot and removes only the registered listener', () => {
    const snapshot: SceneLoadingSnapshot = {
      sceneKey: 'OpenPitScene',
      phase: 'ready',
      progress: 1,
    };
    const listener = vi.fn();
    expect(gameEvents.on(GameEvents.SCENE_LOADING, listener)).toBe(gameEvents);
    expect(gameEvents.listenerCount(GameEvents.SCENE_LOADING)).toBe(1);
    expect(gameEvents.emit(GameEvents.SCENE_LOADING, snapshot)).toBe(true);
    expect(listener).toHaveBeenCalledExactlyOnceWith(snapshot);
    expect(listener.mock.calls[0][0]).toBe(snapshot);
    expect(gameEvents.off(GameEvents.SCENE_LOADING, listener)).toBe(gameEvents);
    expect(gameEvents.emit(GameEvents.SCENE_LOADING, snapshot)).toBe(false);
  });

  it('keeps player lock and unlock events without arguments', () => {
    const locked = vi.fn();
    const unlocked = vi.fn();
    gameEvents.on(GameEvents.LOCK_PLAYER, locked).on(GameEvents.UNLOCK_PLAYER, unlocked);
    gameEvents.emit(GameEvents.LOCK_PLAYER);
    gameEvents.emit(GameEvents.UNLOCK_PLAYER);
    expect(locked).toHaveBeenCalledExactlyOnceWith();
    expect(unlocked).toHaveBeenCalledExactlyOnceWith();
  });

  it('preserves once listeners and their supplied context', () => {
    const context = { calls: 0 };
    function listener(this: typeof context): void {
      this.calls++;
    }
    gameEvents.once(GameEvents.LOCK_PLAYER, listener, context);
    gameEvents.emit(GameEvents.LOCK_PLAYER);
    gameEvents.emit(GameEvents.LOCK_PLAYER);
    expect(context.calls).toBe(1);
    expect(gameEvents.listenerCount(GameEvents.LOCK_PLAYER)).toBe(0);
  });

  it('removes only the matching listener context', () => {
    const first = { calls: 0 };
    const second = { calls: 0 };
    function listener(this: typeof first): void {
      this.calls++;
    }
    gameEvents.on(GameEvents.UNLOCK_PLAYER, listener, first);
    gameEvents.on(GameEvents.UNLOCK_PLAYER, listener, second);
    gameEvents.off(GameEvents.UNLOCK_PLAYER, listener, first);
    gameEvents.emit(GameEvents.UNLOCK_PLAYER);
    expect(first.calls).toBe(0);
    expect(second.calls).toBe(1);
  });

  it('clears one event without removing listeners of another event', () => {
    const dialogue = vi.fn();
    gameEvents.on(GameEvents.LOCK_PLAYER, vi.fn());
    gameEvents.on(GameEvents.OPEN_DIALOGUE, dialogue);
    gameEvents.removeAllListeners(GameEvents.LOCK_PLAYER);
    gameEvents.emit(GameEvents.OPEN_DIALOGUE, { dialogueId: 'intro' });
    expect(dialogue).toHaveBeenCalledExactlyOnceWith({ dialogueId: 'intro' });
    expect(gameEvents.listenerCount(GameEvents.LOCK_PLAYER)).toBe(0);
  });
});

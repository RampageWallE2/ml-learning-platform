import { loadWorldSession } from './world-session.storage';
import { WorldSessionLifecycle } from './world-session.lifecycle';

describe('WorldSessionLifecycle', () => {
  const savedAt = 1_000_000;
  const snapshot = {
    version: 1,
    sceneKey: 'OpenPitScene',
    playerX: 640,
    playerY: 384,
    savedAt,
  } as const;

  beforeEach(() => {
    sessionStorage.clear();
  });

  function createVisibilitySource(initialState: DocumentVisibilityState) {
    const source = new EventTarget() as EventTarget & {
      visibilityState: DocumentVisibilityState;
    };
    source.visibilityState = initialState;
    return source;
  }

  it('saves the current state when the page becomes hidden', () => {
    const visibilitySource = createVisibilitySource('visible');
    const pageSource = new EventTarget();
    const lifecycle = new WorldSessionLifecycle(
      () => snapshot,
      visibilitySource,
      pageSource,
    );

    lifecycle.start();
    visibilitySource.visibilityState = 'hidden';
    visibilitySource.dispatchEvent(new Event('visibilitychange'));

    expect(loadWorldSession(sessionStorage, savedAt)).toEqual(snapshot);
  });

  it('saves the current state on pagehide and removes listeners on stop', () => {
    const visibilitySource = createVisibilitySource('visible');
    const pageSource = new EventTarget();
    const lifecycle = new WorldSessionLifecycle(
      () => snapshot,
      visibilitySource,
      pageSource,
    );

    lifecycle.start();
    pageSource.dispatchEvent(new Event('pagehide'));
    expect(loadWorldSession(sessionStorage, savedAt)).toEqual(snapshot);

    lifecycle.stop();
    sessionStorage.clear();
    pageSource.dispatchEvent(new Event('pagehide'));
    expect(loadWorldSession(sessionStorage, savedAt)).toBeNull();
  });
});

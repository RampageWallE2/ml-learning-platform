import {
  clearWorldSession,
  loadWorldSession,
  saveWorldSession,
  WORLD_SESSION_MAX_AGE_MS,
} from './world-session.storage';

describe('world session storage', () => {
  const now = 1_000_000_000;

  beforeEach(() => {
    clearWorldSession(sessionStorage);
  });

  it('saves and loads a valid world session', () => {
    const snapshot = {
      version: 1,
      sceneKey: 'OpenPitScene',
      playerX: 640,
      playerY: 384,
      savedAt: now,
    } as const;

    saveWorldSession(snapshot, sessionStorage);

    expect(loadWorldSession(sessionStorage, now)).toEqual(snapshot);
  });

  it('discards an expired world session', () => {
    saveWorldSession({
      version: 1,
      sceneKey: 'OpenPitScene',
      playerX: 640,
      playerY: 384,
      savedAt: now - WORLD_SESSION_MAX_AGE_MS - 1,
    }, sessionStorage);

    expect(loadWorldSession(sessionStorage, now)).toBeNull();
  });

  it('discards a world session saved in the future', () => {
    saveWorldSession({
      version: 1,
      sceneKey: 'OpenPitScene',
      playerX: 640,
      playerY: 384,
      savedAt: now + 1,
    }, sessionStorage);

    expect(loadWorldSession(sessionStorage, now)).toBeNull();
  });

  it('discards malformed session data', () => {
    sessionStorage.setItem(
      'exploralab.world-session.v1',
      JSON.stringify({
        version: 1,
        sceneKey: 'UnknownScene',
        playerX: 'invalid',
      }),
    );

    expect(loadWorldSession(sessionStorage, now)).toBeNull();
    expect(sessionStorage.getItem('exploralab.world-session.v1')).toBeNull();
  });

  it('discards content that is not valid JSON', () => {
    sessionStorage.setItem('exploralab.world-session.v1', '{invalid');

    expect(loadWorldSession(sessionStorage, now)).toBeNull();
    expect(sessionStorage.getItem('exploralab.world-session.v1')).toBeNull();
  });
});

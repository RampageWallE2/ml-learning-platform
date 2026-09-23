import { WORLD_SESSION_REGISTRY_KEY } from './world-session.types';
import { takeWorldSessionRecovery } from './world-session.registry';

describe('takeWorldSessionRecovery', () => {
  const snapshot = {
    version: 1,
    sceneKey: 'OpenPitScene',
    playerX: 640,
    playerY: 384,
    savedAt: 1_000_000,
  } as const;

  it('returns and consumes a recovery for the active scene', () => {
    const registry = {
      get: vi.fn(() => snapshot),
      remove: vi.fn(),
    };

    expect(takeWorldSessionRecovery(registry, 'OpenPitScene')).toEqual(snapshot);
    expect(registry.remove).toHaveBeenCalledWith(WORLD_SESSION_REGISTRY_KEY);
  });

  it('leaves a recovery untouched when the scene does not match', () => {
    const registry = {
      get: vi.fn(() => snapshot),
      remove: vi.fn(),
    };

    expect(takeWorldSessionRecovery(registry, 'HubScene')).toBeNull();
    expect(registry.remove).not.toHaveBeenCalled();
  });
});

import { saveWorldSession } from './world-session.storage';
import type { WorldSessionSnapshot } from './world-session.types';

type LifecycleEventTarget = Pick<
  EventTarget,
  'addEventListener' | 'removeEventListener'
>;

type VisibilitySource = LifecycleEventTarget & Readonly<{
  visibilityState: DocumentVisibilityState;
}>;

export class WorldSessionLifecycle {
  private listening = false;

  constructor(
    private readonly capture: () => WorldSessionSnapshot | null,
    private readonly visibilitySource: VisibilitySource = document,
    private readonly pageSource: LifecycleEventTarget = window,
  ) {}

  start(): void {
    if (this.listening) {
      return;
    }

    this.visibilitySource.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    this.pageSource.addEventListener('pagehide', this.persist);
    this.listening = true;
  }

  stop(): void {
    if (!this.listening) {
      return;
    }

    this.visibilitySource.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    this.pageSource.removeEventListener('pagehide', this.persist);
    this.listening = false;
  }

  private readonly handleVisibilityChange = (): void => {
    if (this.visibilitySource.visibilityState === 'hidden') {
      this.persist();
    }
  };

  private readonly persist = (): void => {
    const snapshot = this.capture();

    if (snapshot) {
      saveWorldSession(snapshot);
    }
  };
}

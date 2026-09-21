import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter
} from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  let restoreResult: Observable<boolean>;
  let router: Router;

  const auth = {
    restoreSession: vi.fn(() => restoreResult)
  };

  beforeEach(() => {
    restoreResult = of(false);
    auth.restoreSession.mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth }
      ]
    });

    router = TestBed.inject(Router);
  });

  async function runGuard(
    url: string = '/world'
  ): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() =>
      authGuard(
        {} as ActivatedRouteSnapshot,
        { url } as RouterStateSnapshot
      )
    ) as Observable<boolean | UrlTree>;

    return firstValueFrom(result);
  }

  it('allows navigation when a valid session exists', async () => {
    restoreResult = of(true);

    await expect(runGuard()).resolves.toBe(true);
  });

  it('redirects an anonymous user to login', async () => {
    const result = await runGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe(
      '/login?returnUrl=%2Fworld'
    );
  });

  it('preserves progress as the return destination for an anonymous user', async () => {
    const result = await runGuard('/progress');

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe(
      '/login?returnUrl=%2Fprogress'
    );
  });
});

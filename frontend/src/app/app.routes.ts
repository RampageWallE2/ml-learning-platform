import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/landing/pages/landing-page/landing-page').then(
        (module) => module.LandingPage,
      ),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login').then((module) => module.Login),
  },
  {
    path: 'register',
    data: { mode: 'register' },
    loadComponent: () => import('./features/auth/pages/login/login').then((module) => module.Login),
  },
  {
    path: 'world',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/world/pages/world-page/world-page').then((module) => module.WorldPage),
  },
  {
    path: 'progress',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/world/progress/pages/progress-page/progress-page').then(
        (module) => module.ProgressPage,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

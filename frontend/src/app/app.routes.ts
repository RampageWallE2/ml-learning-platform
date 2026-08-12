import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'world',
        loadComponent: () => 
            import('./features/world/pages/world-page/world-page')
                .then(m => m.WorldPage)
    },
    {
        path: '',
        redirectTo: 'world',
        pathMatch: 'full'
    }

];

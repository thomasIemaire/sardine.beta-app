import { Routes } from '@angular/router';

export const TACHES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./taches.page').then((m) => m.TachesPage),
  },
];

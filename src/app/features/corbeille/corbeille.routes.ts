import { Routes } from '@angular/router';

export const CORBEILLE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./corbeille.page').then((m) => m.CorbeillePage),
  },
];

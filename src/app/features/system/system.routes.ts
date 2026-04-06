import { Routes } from '@angular/router';

export const SYSTEM_ROUTES: Routes = [
  {
    path: 'servers',
    loadComponent: () => import('./servers/servers.page').then((m) => m.ServersPage),
  },
  {
    path: 'fine-tuning',
    loadComponent: () => import('./fine-tuning/fine-tuning.page').then((m) => m.FineTuningPage),
  },
  { path: '', redirectTo: 'servers', pathMatch: 'full' },
];

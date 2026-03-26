import { Routes } from '@angular/router';
import { AppLayoutComponent } from './core/layout/app-layout/app-layout.component';
import { AuthLayoutComponent } from './core/layout/auth-layout/auth-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
      },
      {
        path: 'flows',
        loadChildren: () => import('./features/flows/flows.routes').then((m) => m.FLOWS_ROUTES),
      },
      {
        path: 'agents',
        loadChildren: () => import('./features/agents/agents.routes').then((m) => m.AGENTS_ROUTES),
      },
      {
        path: 'tasks',
        loadChildren: () => import('./features/taches/taches.routes').then((m) => m.TACHES_ROUTES),
      },
      {
        path: 'documents',
        loadChildren: () => import('./features/documents/documents.routes').then((m) => m.DOCUMENTS_ROUTES),
      },
      {
        path: 'trash',
        loadChildren: () => import('./features/corbeille/corbeille.routes').then((m) => m.CORBEILLE_ROUTES),
      },
      {
        path: 'administration',
        loadChildren: () => import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      {
        path: 'user',
        loadChildren: () => import('./features/user/user.routes').then((m) => m.USER_ROUTES),
      },
    ],
  },
  {
    path: 'flows/:id',
    loadComponent: () => import('./features/flows/flow-editor.page').then((m) => m.FlowEditorPage),
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

import { Routes } from '@angular/router';

export const DOCUMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./documents.page').then((m) => m.DocumentsPage),
  },
  {
    path: 'files/:fileId',
    loadComponent: () => import('./file-viewer.page').then((m) => m.FileViewerPage),
  },
];

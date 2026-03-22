import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent } from '../../shared/components/header-page/header-page.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { ToolbarComponent } from '../../shared/components/toolbar/toolbar.component';

@Component({
  selector: 'app-documents',
  imports: [ButtonModule, PageComponent, HeaderPageComponent, BreadcrumbComponent, ToolbarComponent],
  template: `
    <app-page>
      <app-header-page
        title="Documents"
        subtitle="Gérez vos documents"
      >
      </app-header-page>
      <div class="documents-breadcrumb">
        <app-breadcrumb [items]="breadcrumb" />
      </div>
      <div class="documents-toolbar">
        <app-toolbar searchPlaceholder="Rechercher dans les documents...">
        <p-button label="Nouveau dossier" icon="fa-regular fa-folder-plus" severity="secondary" rounded size="small" />
        <p-button label="Importer un fichier" icon="fa-regular fa-cloud-arrow-up" rounded size="small" />
      </app-toolbar>
      </div>
    </app-page>
  `,
  styles: `
    .documents-breadcrumb {
      padding: 0.625rem 2rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .documents-toolbar {
      padding: 1rem;
    }
  `,
})
export class DocumentsPage {
  breadcrumb: BreadcrumbItem[] = [
    { label: 'Documents', link: '/documents' },
    { label: 'Projets', link: '/documents' },
    { label: 'Marketing' },
  ];
}

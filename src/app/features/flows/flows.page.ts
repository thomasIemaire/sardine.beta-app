import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { ToolbarComponent } from '../../shared/components/toolbar/toolbar.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-flows',
  imports: [ButtonModule, PageComponent, HeaderPageComponent, ToolbarComponent, EmptyStateComponent],
  template: `
    <app-page>
      <app-header-page
        title="Flows"
        subtitle="Gérez vos flux documentaires"
        [facets]="facets"
        defaultFacetId="my-flows"
        (facetChange)="onFacetChange($event)"
      >
        <button pButton icon="fa-solid fa-book-blank" label="Documentation" severity="secondary" size="small" rounded action></button>
      </app-header-page>
      <div class="flows-toolbar">
        <app-toolbar searchPlaceholder="Rechercher un flow...">
          <p-button label="Ajouter un flow" icon="fa-regular fa-plus" rounded size="small" [disabled]="isSharedFacet" />
        </app-toolbar>
      </div>
      <app-empty-state
        icon="fa-light fa-chart-diagram"
        title="Aucun flow disponible"
        subtitle="Créez votre premier flow pour commencer."
      />
    </app-page>
  `,
  styles: `
    .flows-toolbar {
      padding: 1rem;
    }
  `,
})
export class FlowsPage {
  facets: Facet[] = [
    { id: 'my-flows', label: 'Mes flows' },
    { id: 'shared', label: 'Partagés avec moi' },
  ];

  isSharedFacet = false;

  onFacetChange(facet: Facet): void {
    this.isSharedFacet = facet.id === 'shared';
  }
}

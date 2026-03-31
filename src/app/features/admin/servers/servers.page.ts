import { Component } from '@angular/core';
import { PageComponent } from '../../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../../shared/components/header-page/header-page.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-servers',
  imports: [PageComponent, HeaderPageComponent, EmptyStateComponent],
  template: `
    <app-page>
      <app-header-page
        title="Serveurs"
        subtitle="Gérez les serveurs de l'application"
        [facets]="facets"
        defaultFacetId="cpus"
        (facetChange)="onFacetChange($event)"
      />

      @if (currentFacet === 'cpus') {
        <app-empty-state
          icon="fa-regular fa-microchip"
          title="Aucun serveur CPU configuré"
          subtitle="Ajoutez un serveur CPU pour commencer."
        />
      }

      @if (currentFacet === 'gpus') {
        <app-empty-state
          icon="fa-regular fa-display"
          title="Aucun serveur GPU configuré"
          subtitle="Ajoutez un serveur GPU pour commencer."
        />
      }
    </app-page>
  `,
})
export class ServersPage {
  facets: Facet[] = [
    { id: 'cpus', label: 'CPUs' },
    { id: 'gpus', label: 'GPUs' },
  ];

  currentFacet = 'cpus';

  onFacetChange(facet: Facet): void {
    this.currentFacet = facet.id;
  }
}

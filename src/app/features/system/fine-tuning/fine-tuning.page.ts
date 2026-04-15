import { Component } from '@angular/core';
import { PageComponent } from '../../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../../shared/components/header-page/header-page.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TrainingComponent } from './training.component';

@Component({
  selector: 'app-fine-tuning',
  imports: [PageComponent, HeaderPageComponent, EmptyStateComponent, TrainingComponent],
  template: `
    <app-page>
      <app-header-page
        title="Fine-tuning"
        subtitle="Affinez les modèles de l'application"
        [facets]="facets"
        defaultFacetId="classification"
        (facetChange)="onFacetChange($event)"
      />

      @if (currentFacet === 'classification') {
        <app-empty-state
          icon="fa-regular fa-tags"
          title="Aucun modèle de classification"
          subtitle="Lancez votre premier job de fine-tuning pour la classification."
        />
      }

      @if (currentFacet === 'determination') {
        <app-empty-state
          icon="fa-regular fa-bullseye-arrow"
          title="Aucun modèle de détermination"
          subtitle="Lancez votre premier job de fine-tuning pour la détermination."
        />
      }

      @if (currentFacet === 'training') {
        <app-training />
      }
    </app-page>
  `,
})
export class FineTuningPage {
  facets: Facet[] = [
    { id: 'classification', label: 'Classification' },
    { id: 'determination', label: 'Détermination' },
    { id: 'training', label: 'Entraînement' },
  ];

  currentFacet = 'classification';

  onFacetChange(facet: Facet): void {
    this.currentFacet = facet.id;
  }
}

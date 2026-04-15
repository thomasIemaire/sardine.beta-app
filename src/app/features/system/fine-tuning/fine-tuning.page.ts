import { Component, signal, ViewChild } from '@angular/core';
import { PageComponent } from '../../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../../shared/components/header-page/header-page.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { TrainingComponent } from './training.component';
import { DatasetListComponent, DatasetOpenEvent } from './dataset-list.component';

@Component({
  selector: 'app-fine-tuning',
  imports: [PageComponent, HeaderPageComponent, EmptyStateComponent, TrainingComponent, DatasetListComponent],
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
        @if (trainingView() === 'list') {
          <app-dataset-list
            (newDataset)="startNewDataset()"
            (openEditor)="openEditor($event)"
          />
        } @else {
          <app-training
            #trainingRef
            (backToList)="goBackToList()"
          />
        }
      }
    </app-page>
  `,
})
export class FineTuningPage {
  @ViewChild('trainingRef') private trainingRef?: TrainingComponent;

  facets: Facet[] = [
    { id: 'classification', label: 'Classification' },
    { id: 'determination', label: 'Détermination' },
    { id: 'training', label: 'Entraînement' },
  ];

  currentFacet = 'classification';

  /** 'list' = dataset list, 'editor' = annotation editor */
  readonly trainingView = signal<'list' | 'editor'>('list');

  onFacetChange(facet: Facet): void {
    this.currentFacet = facet.id;
    // Always land on the list when switching to training
    if (facet.id === 'training') this.trainingView.set('list');
  }

  startNewDataset(): void {
    this.trainingView.set('editor');
    // trainingRef not yet available — Angular renders it next tick
    // The component starts in 'import' state by default, nothing to call
  }

  openEditor(event: DatasetOpenEvent): void {
    this.trainingView.set('editor');
    setTimeout(() => {
      this.trainingRef?.resumeFromDataset(event.datasetId, event.startPageId);
    });
  }

  goBackToList(): void {
    this.trainingView.set('list');
  }
}

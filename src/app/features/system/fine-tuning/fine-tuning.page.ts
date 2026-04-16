import { Component, inject, signal, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
          <app-dataset-list (openEditor)="openEditor($event)" />
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
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

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
    if (facet.id !== 'training') return;

    const params    = this.route.snapshot.queryParamMap;
    const datasetId = params.get('dataset');
    const pageId    = params.get('page');

    // Both dataset + page in URL → restore the PDF editor directly
    if (datasetId && pageId) {
      this.trainingView.set('editor');
      setTimeout(() => this.trainingRef?.resumeFromDataset(datasetId, pageId));
    } else {
      // List mode — dataset-list will restore the panel from ?dataset=
      this.trainingView.set('list');
    }
  }

  openEditor(event: DatasetOpenEvent): void {
    // Persist in URL so a reload reopens the same page
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { dataset: event.datasetId, page: event.startPageId ?? null },
      queryParamsHandling: 'merge',
      replaceUrl: false,
    });
    this.trainingView.set('editor');
    setTimeout(() => this.trainingRef?.resumeFromDataset(event.datasetId, event.startPageId));
  }

  goBackToList(): void {
    // Clear editor params, keep facet=training and dataset for panel restore
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.trainingView.set('list');
  }
}

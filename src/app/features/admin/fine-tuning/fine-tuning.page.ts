import { Component } from '@angular/core';
import { PageComponent } from '../../../shared/components/page/page.component';
import { HeaderPageComponent } from '../../../shared/components/header-page/header-page.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-fine-tuning',
  imports: [PageComponent, HeaderPageComponent, EmptyStateComponent],
  template: `
    <app-page>
      <app-header-page title="Fine-tuning" subtitle="Affinez les modèles de l'application" />
      <app-empty-state
        icon="fa-regular fa-sliders"
        title="Aucun modèle fine-tuné"
        subtitle="Lancez votre premier job de fine-tuning."
      />
    </app-page>
  `,
})
export class FineTuningPage {}

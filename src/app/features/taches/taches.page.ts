import { Component } from '@angular/core';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent } from '../../shared/components/header-page/header-page.component';

@Component({
  selector: 'app-taches',
  imports: [PageComponent, HeaderPageComponent],
  template: `
    <app-page>
      <app-header-page
        title="Tâches"
        subtitle="Gérez vos tâches en cours"
      >
      </app-header-page>
    </app-page>
  `,
})
export class TachesPage {}

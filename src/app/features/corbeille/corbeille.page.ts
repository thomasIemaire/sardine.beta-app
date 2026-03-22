import { Component } from '@angular/core';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent } from '../../shared/components/header-page/header-page.component';

@Component({
  selector: 'app-corbeille',
  imports: [PageComponent, HeaderPageComponent],
  template: `
    <app-page>
      <app-header-page
        title="Corbeille"
        subtitle="Éléments supprimés"
      >
      </app-header-page>
    </app-page>
  `,
})
export class CorbeillePage {}

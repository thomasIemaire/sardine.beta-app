import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';

@Component({
  selector: 'app-flows',
  imports: [ButtonModule, PageComponent, HeaderPageComponent],
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
    </app-page>
  `,
})
export class FlowsPage {
  facets: Facet[] = [
    { id: 'my-flows', label: 'Mes flows' },
    { id: 'shared', label: 'Partagés avec moi' },
  ];

  onFacetChange(facet: Facet): void {
    console.log('Facet active:', facet.id);
  }
}

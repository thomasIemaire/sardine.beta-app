import { Component } from '@angular/core';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';

@Component({
  selector: 'app-settings',
  imports: [PageComponent, HeaderPageComponent],
  template: `
    <app-page>
      <app-header-page
        title="Paramètres"
        subtitle="Gérez votre organisation"
        [facets]="facets"
        defaultFacetId="members"
        (facetChange)="onFacetChange($event)"
      >
      </app-header-page>
    </app-page>
  `,
})
export class SettingsPage {
  facets: Facet[] = [
    { id: 'members', label: 'Membres' },
    { id: 'teams', label: 'Équipes' },
    { id: 'services', label: 'Services' },
  ];

  onFacetChange(facet: Facet): void {
    console.log('Facet active:', facet.id);
  }
}

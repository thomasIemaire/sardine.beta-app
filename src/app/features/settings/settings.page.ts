import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { ToolbarComponent } from '../../shared/components/toolbar/toolbar.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

interface FacetConfig {
  searchPlaceholder: string;
  actionLabel: string;
  actionIcon: string;
}

@Component({
  selector: 'app-settings',
  imports: [ButtonModule, PageComponent, HeaderPageComponent, ToolbarComponent, EmptyStateComponent],
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
      <div class="settings-toolbar">
        <app-toolbar [searchPlaceholder]="currentConfig.searchPlaceholder">
          <p-button [label]="currentConfig.actionLabel" [icon]="currentConfig.actionIcon" rounded size="small" />
        </app-toolbar>
      </div>
      <app-empty-state
        icon="fa-jelly fa-regular fa-gear"
        title="Aucun élément"
        subtitle="Aucun résultat pour cette section."
      />
    </app-page>
  `,
  styles: `
    .settings-toolbar {
      padding: 1rem;
    }
  `,
})
export class SettingsPage {
  facets: Facet[] = [
    { id: 'members', label: 'Membres' },
    { id: 'teams', label: 'Équipes' },
    { id: 'services', label: 'Services' },
  ];

  facetConfigs: Record<string, FacetConfig> = {
    members: { searchPlaceholder: 'Rechercher un membre...', actionLabel: 'Ajouter un membre', actionIcon: 'fa-regular fa-user-plus' },
    teams: { searchPlaceholder: 'Rechercher une équipe...', actionLabel: 'Ajouter une équipe', actionIcon: 'fa-regular fa-users-medical' },
    services: { searchPlaceholder: 'Rechercher un service...', actionLabel: 'Ajouter un service', actionIcon: 'fa-regular fa-plus' },
  };

  currentConfig: FacetConfig = this.facetConfigs['members'];

  onFacetChange(facet: Facet): void {
    this.currentConfig = this.facetConfigs[facet.id];
  }
}

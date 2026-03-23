import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { ToolbarComponent } from '../../shared/components/toolbar/toolbar.component';
import type { ActiveFilter, FilterDefinition } from '../../shared/components/toolbar/models/filter.models';
import { AgentCardComponent, Agent } from '../../shared/components/agent-card/agent-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-agents',
  imports: [ButtonModule, PageComponent, HeaderPageComponent, ToolbarComponent, AgentCardComponent, EmptyStateComponent],
  template: `
    <app-page>
      <app-header-page
        title="Agents"
        subtitle="Gérez vos agents intelligents"
        [facets]="facets"
        defaultFacetId="my-agents"
        (facetChange)="onFacetChange($event)"
      >
        <button pButton icon="fa-solid fa-book-blank" label="Documentation" severity="secondary" size="small" rounded action></button>
      </app-header-page>
      <div class="agents-toolbar">
        <app-toolbar searchPlaceholder="Rechercher un agent..." [(filters)]="filters" [(search)]="search" [filterDefinitions]="filterDefinitions">
          <p-button label="Ajouter un agent" icon="fa-regular fa-plus" rounded size="small" [disabled]="isSharedFacet" />
        </app-toolbar>
      </div>
      @if (filteredAgents.length > 0) {
        <div class="agents-grid">
          @for (agent of filteredAgents; track agent.name) {
            <app-agent-card [agent]="agent" />
          }
        </div>
      } @else {
        <app-empty-state
          icon="fa-regular fa-microchip-ai"
          title="Aucun agent disponible"
          subtitle="Créez votre premier agent pour commencer."
        />
      }
    </app-page>
  `,
  styles: `
    .agents-toolbar {
      padding: 1rem;
    }

    .agents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
      gap: 1rem;
      padding: 0 1rem 1rem;
    }
  `,
})
export class AgentsPage {
  facets: Facet[] = [
    { id: 'my-agents', label: 'Mes agents' },
    { id: 'shared', label: 'Partagés avec moi' },
  ];

  isSharedFacet = false;
  search = '';
  filters: ActiveFilter[] = [];

  filterDefinitions: FilterDefinition[] = [
    {
      id: 'creator',
      label: 'Créateur',
      type: 'select',
      options: [
        { value: 'thomas', label: 'Thomas Lemaire' },
        { value: 'marie', label: 'Marie Dupont' },
      ],
    },
    {
      id: 'date',
      label: 'Date de création',
      type: 'date',
      dateRange: true,
    },
    {
      id: 'pertinence',
      label: 'Pertinence',
      type: 'select',
      options: [
        { value: 80, label: '> 80%' },
        { value: 50, label: '> 50%' },
        { value: 20, label: '> 20%' },
      ],
    },
  ];

  agents: Agent[] = [
    {
      name: 'Matricule',
      description: 'Matricule ou identifiant d\'un employé',
      percentage: 85,
      createdAt: new Date('2026-03-09'),
      creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' },
    },
    {
      name: 'Extracteur de factures',
      description: 'Extraction automatique des données clés depuis des factures PDF',
      percentage: 42,
      createdAt: new Date('2026-03-15'),
      creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' },
    },
    {
      name: 'Classifieur de documents',
      description: 'Classification automatique des documents entrants par type et catégorie',
      percentage: 100,
      createdAt: new Date('2026-02-28'),
      creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' },
    },
    {
      name: 'Analyseur de conformité réglementaire des documents juridiques internationaux',
      description: 'Vérifie la conformité des documents par rapport aux réglementations en vigueur dans plusieurs juridictions',
      percentage: 12,
      createdAt: new Date('2026-03-20'),
      creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' },
    },
  ];

  get filteredAgents(): Agent[] {
    let result = this.agents;

    // Recherche texte
    if (this.search) {
      const q = this.search.toLowerCase();
      result = result.filter((a) =>
        a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
      );
    }

    // Filtres actifs
    for (const filter of this.filters) {
      switch (filter.definitionId) {
        case 'creator':
          result = result.filter((a) => a.creator.id === filter.value);
          break;
        case 'date': {
          const [start, end] = filter.value as Date[];
          result = result.filter((a) => {
            const d = a.createdAt.getTime();
            return d >= start.getTime() && (!end || d <= end.getTime());
          });
          break;
        }
        case 'pertinence':
          result = result.filter((a) => a.percentage >= filter.value);
          break;
      }
    }

    return result;
  }

  onFacetChange(facet: Facet): void {
    this.isSharedFacet = facet.id === 'shared';
  }
}

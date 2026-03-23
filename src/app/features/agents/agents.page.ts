import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { ToolbarComponent } from '../../shared/components/toolbar/toolbar.component';
import { AgentCardComponent, Agent } from '../../shared/components/agent-card/agent-card.component';

@Component({
  selector: 'app-agents',
  imports: [ButtonModule, PageComponent, HeaderPageComponent, ToolbarComponent, AgentCardComponent],
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
        <app-toolbar searchPlaceholder="Rechercher un agent...">
          <p-button label="Ajouter un agent" icon="fa-regular fa-plus" rounded size="small" [disabled]="isSharedFacet" />
        </app-toolbar>
      </div>
      <div class="agents-grid">
        @for (agent of agents; track agent.name) {
          <app-agent-card [agent]="agent" />
        }
      </div>
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

  agents: Agent[] = [
    {
      name: 'Matricule',
      description: 'Matricule ou identifiant d\'un employé',
      percentage: 85,
      createdAt: new Date('2026-03-09'),
      creator: { name: 'Thomas Lemaire', initials: 'TL' },
    },
    {
      name: 'Extracteur de factures',
      description: 'Extraction automatique des données clés depuis des factures PDF',
      percentage: 42,
      createdAt: new Date('2026-03-15'),
      creator: { name: 'Thomas Lemaire', initials: 'TL' },
    },
    {
      name: 'Classifieur de documents',
      description: 'Classification automatique des documents entrants par type et catégorie',
      percentage: 100,
      createdAt: new Date('2026-02-28'),
      creator: { name: 'Marie Dupont', initials: 'MD' },
    },
    {
      name: 'Analyseur de conformité réglementaire des documents juridiques internationaux',
      description: 'Vérifie la conformité des documents par rapport aux réglementations en vigueur dans plusieurs juridictions',
      percentage: 12,
      createdAt: new Date('2026-03-20'),
      creator: { name: 'Thomas Lemaire', initials: 'TL' },
    },
  ];

  onFacetChange(facet: Facet): void {
    this.isSharedFacet = facet.id === 'shared';
  }
}

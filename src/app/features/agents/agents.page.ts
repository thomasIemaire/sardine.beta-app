import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PaginatorState } from 'primeng/paginator';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { DataListComponent, ListColumn } from '../../shared/components/data-list/data-list.component';
import type { ViewMode } from '../../shared/components/toolbar/toolbar.component';
import type { ActiveFilter, FilterDefinition, ActiveSort, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import { AgentCardComponent, Agent } from '../../shared/components/agent-card/agent-card.component';
import { AgentConfigPanelComponent } from './agent-config-panel.component';
import { AgentVersionPanelComponent } from './agent-version-panel.component';

@Component({
  selector: 'app-agents',
  imports: [ButtonModule, HeaderPageComponent, DataListComponent, AgentCardComponent, AgentConfigPanelComponent, AgentVersionPanelComponent],
  template: `
    <div class="agents-wrapper">
      <app-header-page
        title="Agents"
        subtitle="Gérez vos agents intelligents"
        [facets]="facets"
        defaultFacetId="my-agents"
        (facetChange)="onFacetChange($event)"
      >
        <button pButton icon="fa-solid fa-book-blank" label="Documentation" severity="secondary" size="small" rounded action></button>
      </app-header-page>

      <div class="agents-layout">
        <div class="agents-main">
          <div class="agents-body">
            <app-data-list
              searchPlaceholder="Rechercher un agent..."
              [(filters)]="filters"
              [(search)]="search"
              [filterDefinitions]="filterDefinitions"
              [(sorts)]="sorts"
              [sortDefinitions]="sortDefinitions"
              [(viewMode)]="viewMode"
              [columns]="listColumns"
              [gridTemplate]="gridTpl"
              [listTemplate]="listTpl"
              emptyIcon="fa-regular fa-microchip-ai"
              emptyTitle="Aucun agent disponible"
              emptySubtitle="Créez votre premier agent pour commencer."
              [totalRecords]="filteredAgents.length"
              [paginatorFirst]="first"
              [paginatorRows]="pageSize"
              (pageChange)="onPageChange($event)"
            >
              <p-button label="Ajouter un agent" icon="fa-regular fa-plus" rounded size="small" [disabled]="isSharedFacet" toolbar-actions />
            </app-data-list>

            <ng-template #gridTpl>
              @for (agent of paginatedAgents; track agent.name) {
                <app-agent-card [agent]="agent" layout="grid" [class.selected]="selectedAgent === agent" (click)="selectAgent(agent)" />
              }
            </ng-template>

            <ng-template #listTpl>
              @for (agent of paginatedAgents; track agent.name) {
                <app-agent-card [agent]="agent" layout="list" [class.selected]="selectedAgent === agent" (click)="selectAgent(agent)" />
              }
            </ng-template>
          </div>
        </div>

        @if (selectedAgent) {
          <div class="agents-panel">
            <app-agent-config-panel [agent]="selectedAgent" (close)="selectedAgent = null; showVersionPanel = false" (toggleVersions)="showVersionPanel = !showVersionPanel" />
          </div>
          @if (showVersionPanel) {
            <div class="agents-version-panel">
              <app-agent-version-panel [agent]="selectedAgent" (close)="showVersionPanel = false" />
            </div>
          }
        }
      </div>
    </div>
  `,
  styleUrl: './agents.page.scss',
})
export class AgentsPage {
  facets: Facet[] = [
    { id: 'my-agents', label: 'Mes agents' },
    { id: 'shared', label: 'Partagés avec moi' },
  ];

  listColumns: ListColumn[] = [
    { label: 'Nom', cssClass: 'col-flex' },
    { label: 'Créateur', cssClass: 'col-creator' },
    { label: 'Créé le', cssClass: 'col-date' },
    { label: '', cssClass: 'col-actions' },
  ];

  isSharedFacet = false;
  search = '';
  selectedAgent: Agent | null = null;
  showVersionPanel = false;
  private _viewMode: ViewMode = (localStorage.getItem('viewMode:agents') as ViewMode) ?? 'grid';
  get viewMode(): ViewMode { return this._viewMode; }
  set viewMode(value: ViewMode) { this._viewMode = value; localStorage.setItem('viewMode:agents', value); }
  filters: ActiveFilter[] = [];
  sorts: ActiveSort[] = [];
  page = 0;
  private _pageSize = parseInt(localStorage.getItem('pageSize:agents') ?? '12', 10);
  get pageSize(): number { return this._pageSize; }
  set pageSize(value: number) { this._pageSize = value; localStorage.setItem('pageSize:agents', String(value)); }

  sortDefinitions: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'createdAt', label: 'Date de création' },
    { id: 'percentage', label: 'Pertinence' },
  ];

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

    if (this.search) {
      const q = this.search.toLowerCase();
      result = result.filter((a) =>
        a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
      );
    }

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

    for (const sort of this.sorts) {
      const dir = sort.direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        switch (sort.definitionId) {
          case 'name': return dir * a.name.localeCompare(b.name);
          case 'createdAt': return dir * (a.createdAt.getTime() - b.createdAt.getTime());
          case 'percentage': return dir * (a.percentage - b.percentage);
          default: return 0;
        }
      });
    }

    return result;
  }

  get first(): number {
    const total = this.filteredAgents.length;
    const maxPage = Math.max(0, Math.ceil(total / this.pageSize) - 1);
    return Math.min(this.page, maxPage) * this.pageSize;
  }

  get paginatedAgents(): Agent[] {
    return this.filteredAgents.slice(this.first, this.first + this.pageSize);
  }

  selectAgent(agent: Agent): void {
    if (this.selectedAgent === agent) {
      this.selectedAgent = null;
      this.showVersionPanel = false;
    } else {
      this.selectedAgent = agent;
    }
  }

  onPageChange(event: PaginatorState): void {
    this.page = event.page ?? 0;
    if (event.rows != null) this.pageSize = event.rows;
  }

  onFacetChange(facet: Facet): void {
    this.isSharedFacet = facet.id === 'shared';
    this.page = 0;
  }
}

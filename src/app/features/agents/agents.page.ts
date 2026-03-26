import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { ToolbarComponent, ViewMode } from '../../shared/components/toolbar/toolbar.component';
import type { ActiveFilter, FilterDefinition, ActiveSort, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import { AgentCardComponent, Agent } from '../../shared/components/agent-card/agent-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ElementSizeDirective } from '../../shared/directives/element-size.directive';
import { AgentConfigPanelComponent } from './agent-config-panel.component';
import { AgentVersionPanelComponent } from './agent-version-panel.component';

@Component({
  selector: 'app-agents',
  imports: [ButtonModule, Paginator, HeaderPageComponent, ToolbarComponent, AgentCardComponent, EmptyStateComponent, AgentConfigPanelComponent, AgentVersionPanelComponent, ElementSizeDirective],
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
            <div class="agents-toolbar">
              <app-toolbar searchPlaceholder="Rechercher un agent..." [(filters)]="filters" [(search)]="search" [filterDefinitions]="filterDefinitions" [(sorts)]="sorts" [sortDefinitions]="sortDefinitions" [(viewMode)]="viewMode">
                <p-button label="Ajouter un agent" icon="fa-regular fa-plus" rounded size="small" [disabled]="isSharedFacet" />
              </app-toolbar>
            </div>

            <div class="agents-content" [class.list-mode]="viewMode === 'list'">
              @if (filteredAgents.length > 0) {
                @if (viewMode === 'grid') {
                  <div class="agents-grid">
                    @for (agent of paginatedAgents; track agent.name) {
                      <app-agent-card [agent]="agent" layout="grid" [class.selected]="selectedAgent === agent" (click)="selectAgent(agent)" />
                    }
                  </div>
                } @else {
                  <div class="agents-list-container" [appElementSize]="{ compact: 700 }">
                    <div class="agents-list-header">
                      <span class="alh-col alh-name">Nom</span>
                      <span class="alh-col alh-creator">Créateur</span>
                      <span class="alh-col alh-date">Créé le</span>
                      <span class="alh-col alh-actions"></span>
                    </div>
                    <div class="agents-list">
                      @for (agent of paginatedAgents; track agent.name) {
                        <app-agent-card [agent]="agent" layout="list" [class.selected]="selectedAgent === agent" (click)="selectAgent(agent)" />
                      }
                    </div>
                  </div>
                }
              } @else {
                <app-empty-state
                  icon="fa-regular fa-microchip-ai"
                  title="Aucun agent disponible"
                  subtitle="Créez votre premier agent pour commencer."
                />
              }
            </div>

            @if (filteredAgents.length > 0) {
              <div class="agents-paginator">
                <p-paginator
                  [first]="first"
                  [rows]="pageSize"
                  [totalRecords]="filteredAgents.length"
                  [rowsPerPageOptions]="[6, 12, 24, 48]"
                  (onPageChange)="onPageChange($event)"
                />
              </div>
            }
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
  styles: `
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .agents-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .agents-layout {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .agents-main {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .agents-panel {
      width: 50%;
      flex-shrink: 0;
      border-left: 1px solid var(--surface-border);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.2s ease;
    }

    .agents-version-panel {
      width: 280px;
      flex-shrink: 0;
      border-left: 1px solid var(--surface-border);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.2s ease;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }

    .agents-body {
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .agents-toolbar {
      flex-shrink: 0;
      padding: 1rem;
    }

    .agents-content {
      &.list-mode {
        border-top: 1px solid var(--surface-border);
      }
    }

    .agents-list-container {
      display: flex;
      flex-direction: column;
    }

    .agents-list-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 1rem;
      background: var(--background-color-50);
      border-bottom: 1px solid var(--surface-border);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .alh-col {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--p-text-muted-color);

      &.alh-name    { flex: 1; }
      &.alh-creator { width: 9rem; flex-shrink: 0; }
      &.alh-date    { width: 5.5rem; flex-shrink: 0; }
      &.alh-actions { width: 2rem; flex-shrink: 0; }
    }

    .agents-list-container.compact {
      .alh-creator { width: 2rem; overflow: hidden; font-size: 0; }
      .alh-date    { display: none; }
    }

    .agents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
      gap: 1rem;
      padding: 0 1rem 1rem;
    }

    .agents-list {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--surface-border);
      overflow: hidden;

      app-agent-card + app-agent-card {
        border-top: 1px solid var(--surface-border);
      }
    }

    .agents-grid app-agent-card.selected ::ng-deep .card {
      background: var(--primary-color-50);
    }

    .agents-list app-agent-card.selected ::ng-deep .row {
      background: var(--primary-color-50);
    }

    .agents-paginator {
      position: sticky;
      bottom: 0;
      margin-top: auto;
      background: var(--background-color-0);
      border-top: 1px solid var(--surface-border);
    }

    :host ::ng-deep .p-paginator {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0.875rem 1rem;
      background-color: var(--background-color-50);
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
  selectedAgent: Agent | null = null;
  showVersionPanel = false;
  private _viewMode: ViewMode = (localStorage.getItem('viewMode:agents') as ViewMode) ?? 'grid';
  get viewMode(): ViewMode { return this._viewMode; }
  set viewMode(value: ViewMode) { this._viewMode = value; localStorage.setItem('viewMode:agents', value); }
  filters: ActiveFilter[] = [];
  sorts: ActiveSort[] = [];
  page = 0;
  pageSize = 12;

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
    this.pageSize = event.rows ?? this.pageSize;
  }

  onFacetChange(facet: Facet): void {
    this.isSharedFacet = facet.id === 'shared';
    this.page = 0;
  }
}

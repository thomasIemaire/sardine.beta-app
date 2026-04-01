import { Component, effect, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PaginatorState } from 'primeng/paginator';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { DataListComponent, ListColumn } from '../../shared/components/data-list/data-list.component';
import type { ViewMode } from '../../shared/components/toolbar/toolbar.component';
import type { ActiveSort, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import { AgentCardComponent, Agent } from '../../shared/components/agent-card/agent-card.component';
import { AgentConfigPanelComponent } from './agent-config-panel.component';
import { AgentVersionPanelComponent } from './agent-version-panel.component';
import { AgentService } from '../../core/services/agent.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

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
              [(search)]="search"
              [(sorts)]="sorts"
              [sortDefinitions]="sortDefinitions"
              [(viewMode)]="viewMode"
              [columns]="listColumns"
              [gridTemplate]="gridTpl"
              [listTemplate]="listTpl"
              emptyIcon="fa-regular fa-microchip-ai"
              emptyTitle="Aucun agent disponible"
              emptySubtitle="Créez votre premier agent pour commencer."
              [totalRecords]="total()"
              [paginatorFirst]="first"
              [paginatorRows]="pageSize"
              (pageChange)="onPageChange($event)"
            >
              <p-button label="Ajouter un agent" icon="fa-regular fa-plus" rounded size="small" [disabled]="isSharedFacet" toolbar-actions />
            </app-data-list>

            <ng-template #gridTpl>
              @for (agent of filteredAgents(); track agent.id) {
                <app-agent-card [agent]="agent" layout="grid" [class.selected]="selectedAgent?.id === agent.id" (click)="selectAgent(agent)" />
              }
            </ng-template>

            <ng-template #listTpl>
              @for (agent of sortedAgents(); track agent.id) {
                <app-agent-card [agent]="agent" layout="list" [class.selected]="selectedAgent?.id === agent.id" (click)="selectAgent(agent)" />
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
  private readonly agentService = inject(AgentService);
  private readonly contextSwitcher = inject(ContextSwitcherService);

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
  selectedAgent: Agent | null = null;
  showVersionPanel = false;
  agents = signal<Agent[]>([]);
  total = signal(0);

  private _search = '';
  get search(): string { return this._search; }
  set search(v: string) {
    this._search = v;
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => { this.page = 0; this.load(); }, 400) as unknown as number;
  }
  private _searchTimer = 0;

  sorts: ActiveSort[] = [];

  private _viewMode: ViewMode = (localStorage.getItem('viewMode:agents') as ViewMode) ?? 'grid';
  get viewMode(): ViewMode { return this._viewMode; }
  set viewMode(value: ViewMode) { this._viewMode = value; localStorage.setItem('viewMode:agents', value); }

  page = 0;
  private _pageSize = parseInt(localStorage.getItem('pageSize:agents') ?? '12', 10);
  get pageSize(): number { return this._pageSize; }
  set pageSize(value: number) { this._pageSize = value; localStorage.setItem('pageSize:agents', String(value)); }

  get first(): number { return this.page * this.pageSize; }

  sortDefinitions: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'createdAt', label: 'Date de création' },
    { id: 'percentage', label: 'Pertinence' },
  ];

  constructor() {
    effect(() => {
      if (this.contextSwitcher.selectedId()) {
        this.page = 0;
        this.load();
      }
    });
  }

  filteredAgents(): Agent[] {
    const q = this._search.toLowerCase();
    return q ? this.agents().filter((a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)) : this.agents();
  }

  sortedAgents(): Agent[] {
    let result = [...this.filteredAgents()];
    for (const sort of this.sorts) {
      const dir = sort.direction === 'asc' ? 1 : -1;
      result = result.sort((a, b) => {
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

  private load(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    const call = this.isSharedFacet
      ? this.agentService.getSharedAgents(orgId, this.page + 1, this.pageSize)
      : this.agentService.getAgents(orgId, this.page + 1, this.pageSize);

    call.subscribe((res) => {
      this.agents.set(res.items);
      this.total.set(res.total);
    });
  }

  selectAgent(agent: Agent): void {
    if (this.selectedAgent?.id === agent.id) {
      this.selectedAgent = null;
      this.showVersionPanel = false;
    } else {
      this.selectedAgent = agent;
    }
  }

  onPageChange(event: PaginatorState): void {
    this.page = event.page ?? 0;
    if (event.rows != null) this.pageSize = event.rows;
    this.load();
  }

  onFacetChange(facet: Facet): void {
    this.isSharedFacet = facet.id === 'shared';
    this.page = 0;
    this.load();
  }
}

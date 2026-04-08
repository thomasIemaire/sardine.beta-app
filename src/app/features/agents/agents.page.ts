import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ContextMenu } from 'primeng/contextmenu';
import { PaginatorState } from 'primeng/paginator';
import { MessageService, MenuItem } from 'primeng/api';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { DataListComponent, ListColumn } from '../../shared/components/data-list/data-list.component';
import type { ViewMode } from '../../shared/components/toolbar/toolbar.component';
import type { ActiveFilter, FilterDefinition, ActiveSort, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import { AgentCardComponent, Agent } from '../../shared/components/agent-card/agent-card.component';
import { AgentConfigPanelComponent } from './agent-config-panel.component';
import { AgentVersionPanelComponent } from './agent-version-panel.component';
import { CreateAgentDialogComponent } from './create-agent-dialog.component';
import { ShareDialogComponent } from '../../shared/components/share-dialog/share-dialog.component';
import { AgentService, AgentListParams } from '../../core/services/agent.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

@Component({
  selector: 'app-agents',
  imports: [ButtonModule, ToastModule, ContextMenu, HeaderPageComponent, DataListComponent, AgentCardComponent, AgentConfigPanelComponent, AgentVersionPanelComponent, CreateAgentDialogComponent, ShareDialogComponent],
  providers: [MessageService],
  template: `
    <p-toast position="bottom-right" [life]="3000" />
    <p-contextmenu #agentCm />

    <div class="agents-wrapper">
      <app-header-page
        title="Agents"
        subtitle="Gérez vos agents intelligents"
        [facets]="facets"
        defaultFacetId="my-agents"
        (facetChange)="onFacetChange($event)"
      >
        <button pButton icon="fa-solid fa-book-blank" label="Documentation" severity="secondary" size="small" rounded action (click)="openDocs()"></button>
      </app-header-page>

      <div class="agents-layout">
        <div class="agents-main">
          <div class="agents-body">
            <app-data-list
              searchPlaceholder="Rechercher un agent..."
              [(search)]="search"
              [(sorts)]="sorts"
              [sortDefinitions]="sortDefinitions"
              [(filters)]="filters"
              [filterDefinitions]="filterDefinitions()"
              [(viewMode)]="viewMode"
              [columns]="listColumns"
              [gridTemplate]="gridTpl"
              [listTemplate]="listTpl"
              emptyIcon="fa-regular fa-microchip-ai"
              [emptyTitle]="hasActiveFilters() ? 'Aucun résultat' : 'Aucun agent disponible'"
              [emptySubtitle]="hasActiveFilters() ? 'Aucun agent ne correspond à vos filtres.' : (isSharedFacet ? 'Aucun agent partagé avec votre organisation.' : 'Créez votre premier agent pour commencer.')"
              [totalRecords]="total()"
              [paginatorFirst]="first"
              [paginatorRows]="pageSize"
              (pageChange)="onPageChange($event)"
            >
              @if (!isSharedFacet) {
                <p-button label="Nouvel agent" icon="fa-regular fa-plus" rounded size="small" toolbar-actions (onClick)="showCreateDialog.set(true)" />
              }
            </app-data-list>

            <ng-template #gridTpl>
              @for (agent of sortedAgents(); track agent.id) {
                <app-agent-card
                  [agent]="agent"
                  layout="grid"
                  [class.selected]="selectedAgent?.id === agent.id"
                  (cardClick)="selectAgent(agent)"
                  (menuOpen)="onAgentMenuOpen($event, agent)"
                />
              }
            </ng-template>

            <ng-template #listTpl>
              @for (agent of sortedAgents(); track agent.id) {
                <app-agent-card
                  [agent]="agent"
                  layout="list"
                  [class.selected]="selectedAgent?.id === agent.id"
                  (cardClick)="selectAgent(agent)"
                  (menuOpen)="onAgentMenuOpen($event, agent)"
                />
              }
            </ng-template>
          </div>
        </div>

        @if (selectedAgent) {
          <div class="agents-panel">
            <app-agent-config-panel
              [agent]="selectedAgent"
              [readonly]="!selectedAgent.isOwned"
              (close)="clearSelection()"
              (toggleVersions)="showVersionPanel = !showVersionPanel"
              (agentUpdated)="onAgentUpdated($event)"
              (versionSaved)="onVersionCheckedOut()"
            />
          </div>
          @if (showVersionPanel) {
            <div class="agents-version-panel">
              <app-agent-version-panel [agent]="selectedAgent" (close)="showVersionPanel = false" (checkedOut)="onVersionCheckedOut()" />
            </div>
          }
        }
      </div>
    </div>

    <app-create-agent-dialog [(visible)]="showCreateDialog" (created)="onAgentCreated($event)" />
    <app-share-dialog [(visible)]="showShareDialog" itemType="agents" [itemId]="shareTarget?.id ?? ''" [itemName]="shareTarget?.name ?? ''" />
  `,
  styleUrl: './agents.page.scss',
})
export class AgentsPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly agentService = inject(AgentService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly messageService = inject(MessageService);
  private readonly agentCm = viewChild<ContextMenu>('agentCm');

  readonly showCreateDialog = signal(false);
  readonly showShareDialog = signal(false);
  shareTarget: Agent | null = null;

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

  private _sorts: ActiveSort[] = [];
  get sorts(): ActiveSort[] { return this._sorts; }
  set sorts(v: ActiveSort[]) { this._sorts = v; this.page = 0; this.load(); }

  private _filters: ActiveFilter[] = [];
  get filters(): ActiveFilter[] { return this._filters; }
  set filters(v: ActiveFilter[]) { this._filters = v; this.page = 0; this.load(); }

  filterDefinitions = computed<FilterDefinition[]>(() => [
    {
      id: 'creator',
      label: 'Créateur',
      type: 'multiselect',
      options: this.creatorOptions(),
    },
    {
      id: 'origin',
      label: 'Origine',
      type: 'select',
      options: [
        { value: 'original', label: 'Original' },
        { value: 'forked', label: 'Forké' },
      ],
    },
    {
      id: 'createdAt',
      label: 'Date de création',
      type: 'date',
      dateRange: true,
    },
  ]);

  private creatorOptions = computed(() => {
    const seen = new Map<string, string>();
    for (const a of this.agents()) {
      if (!seen.has(a.creator.id)) seen.set(a.creator.id, a.creator.name);
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  });

  private _viewMode: ViewMode = (localStorage.getItem('viewMode:agents') as ViewMode) ?? 'grid';
  get viewMode(): ViewMode { return this._viewMode; }
  set viewMode(value: ViewMode) { this._viewMode = value; localStorage.setItem('viewMode:agents', value); }

  page = 0;
  private _pageSize = parseInt(localStorage.getItem('pageSize:agents') ?? '12', 10);
  get pageSize(): number { return this._pageSize; }
  set pageSize(value: number) { this._pageSize = value; localStorage.setItem('pageSize:agents', String(value)); }

  get first(): number { return this.page * this.pageSize; }

  hasActiveFilters(): boolean { return this.filters.length > 0 || this._search.length > 0; }

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

  readonly sortedAgents = computed(() => this.agents());

  clearSelection(): void {
    this.selectedAgent = null;
    this.showVersionPanel = false;
    this.router.navigate([], { replaceUrl: true, queryParams: { select: null }, queryParamsHandling: 'merge' });
  }

  selectAgent(agent: Agent): void {
    if (this.selectedAgent?.id === agent.id) {
      this.clearSelection();
      return;
    }

    this.selectedAgent = agent;
    this.showVersionPanel = false;
    this.router.navigate([], { replaceUrl: true, queryParams: { select: agent.id }, queryParamsHandling: 'merge' });

    if (!agent.isOwned) return;

    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    this.agentService.getAgent(orgId, agent.id).subscribe((fresh) => {
      if (this.selectedAgent?.id === fresh.id) {
        this.selectedAgent = fresh;
      }
    });
  }

  onAgentMenuOpen(event: MouseEvent, agent: Agent): void {
    const cm = this.agentCm();
    if (!cm) return;

    if (this.isSharedFacet) {
      cm.model = [
        { label: 'Consulter', icon: 'fa-regular fa-eye', command: () => this.selectAgent(agent) },
        { separator: true },
        { label: 'Forker dans mon organisation', icon: 'fa-regular fa-code-fork', command: () => this.fork(agent) },
      ] as MenuItem[];
    } else {
      cm.model = [
        { label: 'Ouvrir', icon: 'fa-regular fa-arrow-up-right-from-square', command: () => this.selectAgent(agent) },
        { label: 'Télécharger', icon: 'fa-regular fa-download', command: () => this.exportAgent(agent) },
        { label: 'Partager', icon: 'fa-regular fa-share-nodes', command: () => { this.shareTarget = agent; this.showShareDialog.set(true); } },
        { separator: true },
        { label: 'Supprimer', icon: 'fa-regular fa-trash', styleClass: 'p-danger', command: () => this.delete(agent) },
      ] as MenuItem[];
    }
    cm.show(event);
  }

  onAgentCreated(agent: Agent): void {
    this.agents.update((list) => [agent, ...list]);
    this.total.update((t) => t + 1);
    this.messageService.add({ severity: 'success', summary: 'Agent créé', detail: `"${agent.name}" a été créé avec succès.` });
  }

  private fork(agent: Agent): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.agentService.forkAgent(orgId, agent.id).subscribe({
      next: (forked) => {
        this.messageService.add({ severity: 'success', summary: 'Fork réussi', detail: `"${forked.name}" a été ajouté à vos agents.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de forker cet agent.' }),
    });
  }

  onAgentUpdated(changes: { name: string; description: string }): void {
    if (this.selectedAgent) {
      this.selectedAgent = { ...this.selectedAgent, ...changes };
    }
    this.agents.update((list) =>
      list.map((a) => (a.id === this.selectedAgent?.id ? { ...a, ...changes } : a))
    );
  }

  private delete(agent: Agent): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.agentService.deleteAgent(orgId, agent.id).subscribe({
      next: () => {
        if (this.selectedAgent?.id === agent.id) {
          this.clearSelection();
        }
        this.agents.update((list) => list.filter((a) => a.id !== agent.id));
        this.total.update((t) => t - 1);
        this.messageService.add({ severity: 'success', summary: 'Agent supprimé', detail: `"${agent.name}" a été supprimé.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer cet agent.' }),
    });
  }

  onPageChange(event: PaginatorState): void {
    this.page = event.page ?? 0;
    if (event.rows != null) this.pageSize = event.rows;
    this.load();
  }

  onFacetChange(facet: Facet): void {
    this.isSharedFacet = facet.id === 'shared';
    this.clearSelection();
    this.page = 0;
    this.load();
  }

  openDocs(): void {
    this.router.navigate(['/agents', 'docs']);
  }

  onVersionCheckedOut(): void {
    const orgId = this.contextSwitcher.selectedId();
    const agentId = this.selectedAgent?.id;
    if (!orgId || !agentId) return;

    this.agentService.getAgent(orgId, agentId).subscribe((fresh) => {
      this.selectedAgent = fresh;
      this.agents.update((list) => list.map((a) => (a.id === fresh.id ? fresh : a)));
    });
  }

  private exportAgent(agent: Agent): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    this.agentService.exportAgent(orgId, agent.id).subscribe({
      next: (response) => {
        const blob = new Blob([response.body!], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${agent.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.messageService.add({ severity: 'success', summary: 'Téléchargement réussi', detail: `"${agent.name}" a été téléchargé.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de télécharger l\'agent.' }),
    });
  }

  private buildListParams(): AgentListParams {
    const p: AgentListParams = { page: this.page + 1, pageSize: this.pageSize };
    if (this._search) p.search = this._search;
    if (this._sorts.length > 0) {
      p.sortBy = this._sorts[0].definitionId;
      p.sortDir = this._sorts[0].direction;
    }
    for (const f of this._filters) {
      switch (f.definitionId) {
        case 'creator': p.creator = f.value as string[]; break;
        case 'origin': p.origin = f.value as 'original' | 'forked'; break;
        case 'createdAt': {
          const [start, end] = f.value as Date[];
          p.createdFrom = start.toISOString();
          if (end) p.createdTo = end.toISOString();
          break;
        }
      }
    }
    return p;
  }

  private load(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    const p = this.buildListParams();
    const call = this.isSharedFacet
      ? this.agentService.getSharedAgents(orgId, p)
      : this.agentService.getAgents(orgId, p);

    call.subscribe((res) => {
      this.agents.set(res.items);
      this.total.set(res.total);

      const selectId = this.route.snapshot.queryParamMap.get('select');
      if (selectId && !this.selectedAgent) {
        const agent = res.items.find((a) => a.id === selectId);
        if (agent) this.selectAgent(agent);
      }
    });
  }
}

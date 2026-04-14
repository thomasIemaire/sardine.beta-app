import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ContextMenu } from 'primeng/contextmenu';
import { PaginatorState } from 'primeng/paginator';
import { MessageService, MenuItem } from 'primeng/api';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { DataListComponent, ListColumn } from '../../shared/components/data-list/data-list.component';
import type { ViewMode } from '../../shared/components/toolbar/toolbar.component';
import type { ActiveFilter, FilterDefinition, ActiveSort, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import { FlowCardComponent, Flow } from '../../shared/components/flow-card/flow-card.component';
import { FlowService, FlowListParams } from '../../core/services/flow.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';
import { CreateFlowDialogComponent } from './create-flow-dialog.component';
import { ShareDialogComponent } from '../../shared/components/share-dialog/share-dialog.component';

@Component({
  selector: 'app-flows',
  imports: [ButtonModule, ToastModule, ContextMenu, PageComponent, HeaderPageComponent, DataListComponent, FlowCardComponent, CreateFlowDialogComponent, ShareDialogComponent],
  providers: [MessageService],
  template: `
    <p-toast position="bottom-right" [life]="3000" />
    <p-contextmenu #flowCm />

    <app-page>
      <app-header-page
        title="Flows"
        subtitle="Gérez vos flux de traitement automatisés"
        [facets]="facets"
        defaultFacetId="my-flows"
        (facetChange)="onFacetChange($event)"
      />

      <app-data-list
        searchPlaceholder="Rechercher un flow..."
        [(search)]="search"
        [(sorts)]="sorts"
        [sortDefinitions]="sortDefinitions"
        [(filters)]="filters"
        [filterDefinitions]="filterDefinitions()"
        [(viewMode)]="viewMode"
        [columns]="listColumns"
        [gridTemplate]="gridTpl"
        [listTemplate]="listTpl"
        [displayedCount]="displayedFlows().length"
        emptyIcon="fa-light fa-chart-diagram"
        [emptyTitle]="hasActiveFilters() ? 'Aucun résultat' : 'Aucun flow disponible'"
        [emptySubtitle]="hasActiveFilters() ? 'Aucun flow ne correspond à vos filtres.' : (isSharedFacet ? 'Aucun flow partagé avec votre organisation.' : 'Créez votre premier flow pour commencer.')"
        [totalRecords]="total()"
        [paginatorFirst]="first"
        [paginatorRows]="pageSize"
        (pageChange)="onPageChange($event)"
      >
        @if (!isSharedFacet) {
          <p-button label="Nouveau flow" icon="fa-regular fa-plus" rounded size="small" toolbar-actions (onClick)="showCreateDialog.set(true)" />
        }
      </app-data-list>

      <ng-template #gridTpl>
        @for (flow of displayedFlows(); track flow.id) {
          <app-flow-card [flow]="flow" layout="grid" (menuOpen)="onFlowMenuOpen($event, flow)" />
        }
      </ng-template>

      <ng-template #listTpl>
        @for (flow of displayedFlows(); track flow.id) {
          <app-flow-card [flow]="flow" layout="list" (menuOpen)="onFlowMenuOpen($event, flow)" />
        }
      </ng-template>
    </app-page>

    <app-create-flow-dialog [(visible)]="showCreateDialog" (created)="onFlowCreated($event)" />
    <app-share-dialog [(visible)]="showShareDialog" itemType="flows" [itemId]="shareTarget?.id ?? ''" [itemName]="shareTarget?.name ?? ''" />
  `,
})
export class FlowsPage {
  private readonly flowService = inject(FlowService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly messageService = inject(MessageService);
  private readonly flowCm = viewChild<ContextMenu>('flowCm');

  readonly showCreateDialog = signal(false);
  readonly showShareDialog = signal(false);
  shareTarget: Flow | null = null;

  facets: Facet[] = [
    { id: 'my-flows', label: 'Mes flows' },
    { id: 'shared', label: 'Partagés avec moi' },
  ];

  listColumns: ListColumn[] = [
    { label: '', cssClass: 'col-dot' },
    { label: 'Nom', cssClass: 'col-flex' },
    { label: 'Créateur', cssClass: 'col-creator' },
    { label: 'Créé le', cssClass: 'col-date' },
    { label: '', cssClass: 'col-actions' },
  ];

  isSharedFacet = false;
  flows = signal<Flow[]>([]);
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
      id: 'status',
      label: 'Statut',
      type: 'multiselect',
      options: [
        { value: 'success', label: 'Succès' },
        { value: 'warn', label: 'Avertissement' },
        { value: 'danger', label: 'Erreur' },
      ],
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
    for (const f of this.flows()) {
      if (!seen.has(f.creator.id)) seen.set(f.creator.id, f.creator.name);
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  });

  private _viewMode: ViewMode = (localStorage.getItem('viewMode:flows') as ViewMode) ?? 'grid';
  get viewMode(): ViewMode { return this._viewMode; }
  set viewMode(value: ViewMode) { this._viewMode = value; localStorage.setItem('viewMode:flows', value); }

  page = 0;
  private _pageSize = parseInt(localStorage.getItem('pageSize:flows') ?? '12', 10);
  get pageSize(): number { return this._pageSize; }
  set pageSize(value: number) { this._pageSize = value; localStorage.setItem('pageSize:flows', String(value)); }

  get first(): number { return this.page * this.pageSize; }

  hasActiveFilters(): boolean { return this.filters.length > 0 || this._search.length > 0; }

  sortDefinitions: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'createdAt', label: 'Date de création' },
    { id: 'status', label: 'Statut' },
  ];

  constructor() {
    effect(() => {
      if (this.contextSwitcher.selectedId()) {
        this._search = '';
        this._filters = [];
        this._sorts = [];
        this.page = 0;
        this.load();
      }
    });
  }

  displayedFlows(): Flow[] {
    return this.flows();
  }

  onFlowMenuOpen(event: MouseEvent, flow: Flow): void {
    const cm = this.flowCm();
    if (!cm) return;
    if (this.isSharedFacet) {
      cm.model = [
        { label: 'Consulter', icon: 'fa-regular fa-eye', command: () => this.navigate(flow) },
        { separator: true },
        { label: 'Forker dans mon organisation', icon: 'fa-regular fa-code-fork', command: () => this.fork(flow) },
      ] as MenuItem[];
    } else {
      cm.model = [
        { label: 'Ouvrir', icon: 'fa-regular fa-arrow-up-right-from-square', command: () => this.navigate(flow) },
        { label: 'Dupliquer', icon: 'fa-regular fa-copy', command: () => this.duplicate(flow) },
        { label: 'Télécharger', icon: 'fa-regular fa-download', command: () => this.exportFlow(flow) },
        { label: 'Partager', icon: 'fa-regular fa-share-nodes', command: () => { this.shareTarget = flow; this.showShareDialog.set(true); } },
        { separator: true },
        { label: 'Supprimer', icon: 'fa-regular fa-trash', styleClass: 'p-danger', command: () => this.delete(flow) },
      ] as MenuItem[];
    }
    cm.show(event);
  }

  onFlowCreated(result: Flow | Flow[]): void {
    if (Array.isArray(result)) {
      // Import : recharge depuis l'API pour être certain d'avoir tous les flows créés
      this.load();
      const main = result[result.length - 1];
      const detail = result.length === 1
        ? `"${main.name}" importé avec succès.`
        : `"${main.name}" importé avec succès (+ ${result.length - 1} sous-flow(s)).`;
      this.messageService.add({ severity: 'success', summary: 'Import réussi', detail });
    } else {
      this.flows.update((list) => [result, ...list]);
      this.total.update((t) => t + 1);
      this.messageService.add({ severity: 'success', summary: 'Flow créé', detail: `"${result.name}" a été créé avec succès.` });
    }
  }

  private navigate(_flow: Flow): void {
    const orgId = this.contextSwitcher.selectedId();
    if (this.isSharedFacet && orgId) {
      // navigate to shared flow detail
    } else {
      // navigation handled by FlowCardComponent.navigate() on click
    }
  }

  private duplicate(flow: Flow): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.flowService.duplicateFlow(orgId, flow.id).subscribe({
      next: (duplicated) => {
        this.flows.update((list) => [duplicated, ...list]);
        this.total.update((t) => t + 1);
        this.messageService.add({ severity: 'success', summary: 'Flow dupliqué', detail: `"${duplicated.name}" a été créé.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de dupliquer ce flow.' }),
    });
  }

  private fork(flow: Flow): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.flowService.forkFlow(orgId, flow.id).subscribe({
      next: (forked) => {
        this.messageService.add({ severity: 'success', summary: 'Fork réussi', detail: `"${forked.name}" a été ajouté à vos flows.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de forker ce flow.' }),
    });
  }

  private delete(flow: Flow): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.flowService.deleteFlow(orgId, flow.id).subscribe({
      next: () => {
        this.flows.update((list) => list.filter((f) => f.id !== flow.id));
        this.total.update((t) => t - 1);
        this.messageService.add({ severity: 'success', summary: 'Flow déplacé dans la corbeille', detail: `"${flow.name}" a été mis dans la corbeille.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer ce flow.' }),
    });
  }

  private exportFlow(flow: Flow): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.flowService.exportFlow(orgId, flow.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${flow.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.messageService.add({ severity: 'success', summary: 'Téléchargement réussi', detail: `"${flow.name}" a été téléchargé.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de télécharger ce flow.' }),
    });
  }

  private readonly statusToApi: Record<string, string> = { success: 'active', warn: 'pending', danger: 'error' };

  private buildListParams(): FlowListParams {
    const p: FlowListParams = { page: this.page + 1, pageSize: this.pageSize };
    if (this._search) p.search = this._search;
    if (this._sorts.length > 0) {
      p.sortBy = this._sorts[0].definitionId;
      p.sortDir = this._sorts[0].direction;
    }
    for (const f of this._filters) {
      switch (f.definitionId) {
        case 'creator': p.creator = f.value as string[]; break;
        case 'status': p.status = (f.value as string[]).map((s) => this.statusToApi[s] ?? s); break;
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
      ? this.flowService.getSharedFlows(orgId, p)
      : this.flowService.getFlows(orgId, p);

    call.subscribe((res) => {
      this.flows.set(res.items);
      this.total.set(res.total);
    });
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

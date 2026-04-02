import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ContextMenu } from 'primeng/contextmenu';
import { PaginatorState } from 'primeng/paginator';
import { MessageService, MenuItem } from 'primeng/api';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { DataListComponent, ListColumn } from '../../shared/components/data-list/data-list.component';
import type { ViewMode } from '../../shared/components/toolbar/toolbar.component';
import type { ActiveSort, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import { FlowCardComponent, Flow } from '../../shared/components/flow-card/flow-card.component';
import { FlowService } from '../../core/services/flow.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';
import { CreateFlowDialogComponent } from './create-flow-dialog.component';

@Component({
  selector: 'app-flows',
  imports: [ButtonModule, ToastModule, ContextMenu, PageComponent, HeaderPageComponent, DataListComponent, FlowCardComponent, CreateFlowDialogComponent],
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
        [(viewMode)]="viewMode"
        [columns]="listColumns"
        [gridTemplate]="gridTpl"
        [listTemplate]="listTpl"
        emptyIcon="fa-light fa-chart-diagram"
        emptyTitle="Aucun flow disponible"
        [emptySubtitle]="isSharedFacet ? 'Aucun flow partagé avec votre organisation.' : 'Créez votre premier flow pour commencer.'"
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
  `,
})
export class FlowsPage {
  private readonly flowService = inject(FlowService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly messageService = inject(MessageService);
  private readonly flowCm = viewChild<ContextMenu>('flowCm');

  readonly showCreateDialog = signal(false);

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

  sorts: ActiveSort[] = [];

  private _viewMode: ViewMode = (localStorage.getItem('viewMode:flows') as ViewMode) ?? 'grid';
  get viewMode(): ViewMode { return this._viewMode; }
  set viewMode(value: ViewMode) { this._viewMode = value; localStorage.setItem('viewMode:flows', value); }

  page = 0;
  private _pageSize = parseInt(localStorage.getItem('pageSize:flows') ?? '12', 10);
  get pageSize(): number { return this._pageSize; }
  set pageSize(value: number) { this._pageSize = value; localStorage.setItem('pageSize:flows', String(value)); }

  get first(): number { return this.page * this.pageSize; }

  sortDefinitions: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'createdAt', label: 'Date de création' },
    { id: 'status', label: 'Statut' },
  ];

  constructor() {
    effect(() => {
      if (this.contextSwitcher.selectedId()) {
        this.page = 0;
        this.load();
      }
    });
  }

  displayedFlows(): Flow[] {
    const q = this._search.toLowerCase();
    let result = q
      ? this.flows().filter((f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q))
      : this.flows();

    const statusOrder: Record<string, number> = { success: 0, warn: 1, danger: 2 };
    for (const sort of this.sorts) {
      const dir = sort.direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        switch (sort.definitionId) {
          case 'name': return dir * a.name.localeCompare(b.name);
          case 'createdAt': return dir * (a.createdAt.getTime() - b.createdAt.getTime());
          case 'status': return dir * ((statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0));
          default: return 0;
        }
      });
    }
    return result;
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
        { separator: true },
        { label: 'Supprimer', icon: 'fa-regular fa-trash', styleClass: 'p-danger', command: () => this.delete(flow) },
      ] as MenuItem[];
    }
    cm.show(event);
  }

  onFlowCreated(flow: Flow): void {
    this.flows.update((list) => [flow, ...list]);
    this.total.update((t) => t + 1);
    this.messageService.add({ severity: 'success', summary: 'Flow créé', detail: `"${flow.name}" a été créé avec succès.` });
  }

  private navigate(_flow: Flow): void {
    const orgId = this.contextSwitcher.selectedId();
    if (this.isSharedFacet && orgId) {
      // navigate to shared flow detail
    } else {
      // navigation handled by FlowCardComponent.navigate() on click
    }
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
        this.messageService.add({ severity: 'success', summary: 'Flow supprimé', detail: `"${flow.name}" a été supprimé.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer ce flow.' }),
    });
  }

  private load(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    if (this.isSharedFacet) {
      this.flowService.getSharedFlows(orgId).subscribe((res) => {
        this.flows.set(res.items);
        this.total.set(res.total);
      });
    } else {
      this.flowService.getFlows(orgId, this.page + 1, this.pageSize).subscribe((res) => {
        this.flows.set(res.items);
        this.total.set(res.total);
      });
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

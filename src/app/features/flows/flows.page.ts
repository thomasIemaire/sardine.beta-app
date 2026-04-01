import { Component, effect, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PaginatorState } from 'primeng/paginator';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { DataListComponent, ListColumn } from '../../shared/components/data-list/data-list.component';
import type { ViewMode } from '../../shared/components/toolbar/toolbar.component';
import type { ActiveSort, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import { FlowCardComponent, Flow } from '../../shared/components/flow-card/flow-card.component';
import { FlowService } from '../../core/services/flow.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

@Component({
  selector: 'app-flows',
  imports: [ButtonModule, PageComponent, HeaderPageComponent, DataListComponent, FlowCardComponent],
  template: `
    <app-page>
      <app-header-page
        title="Flows"
        subtitle="Gérez vos flux de traitement automatisés"
        [facets]="facets"
        defaultFacetId="my-flows"
        (facetChange)="onFacetChange($event)"
      >
        <button pButton icon="fa-solid fa-book-blank" label="Documentation" severity="secondary" size="small" rounded action></button>
      </app-header-page>

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
        emptySubtitle="Créez votre premier flow pour commencer."
        [totalRecords]="total()"
        [paginatorFirst]="first"
        [paginatorRows]="pageSize"
        (pageChange)="onPageChange($event)"
      >
        <p-button label="Ajouter un flow" icon="fa-regular fa-plus" rounded size="small" [disabled]="isSharedFacet" toolbar-actions />
      </app-data-list>

      <ng-template #gridTpl>
        @for (flow of filteredFlows(); track flow.id) {
          <app-flow-card [flow]="flow" layout="grid" />
        }
      </ng-template>

      <ng-template #listTpl>
        @for (flow of sortedFlows(); track flow.id) {
          <app-flow-card [flow]="flow" layout="list" />
        }
      </ng-template>
    </app-page>
  `,
})
export class FlowsPage {
  private readonly flowService = inject(FlowService);
  private readonly contextSwitcher = inject(ContextSwitcherService);

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

  filteredFlows(): Flow[] {
    const q = this._search.toLowerCase();
    return q ? this.flows().filter((f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)) : this.flows();
  }

  sortedFlows(): Flow[] {
    let result = [...this.filteredFlows()];
    const statusOrder = { success: 0, warn: 1, danger: 2 };
    for (const sort of this.sorts) {
      const dir = sort.direction === 'asc' ? 1 : -1;
      result = result.sort((a, b) => {
        switch (sort.definitionId) {
          case 'name': return dir * a.name.localeCompare(b.name);
          case 'createdAt': return dir * (a.createdAt.getTime() - b.createdAt.getTime());
          case 'status': return dir * (statusOrder[a.status] - statusOrder[b.status]);
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
      ? this.flowService.getSharedFlows(orgId, this.page + 1, this.pageSize)
      : this.flowService.getFlows(orgId, this.page + 1, this.pageSize);

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

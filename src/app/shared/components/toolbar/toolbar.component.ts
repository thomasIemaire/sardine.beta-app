import { Component, effect, inject, input, model, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ElementSizeDirective } from '../../directives/element-size.directive';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DividerModule } from 'primeng/divider';
import { Chip } from 'primeng/chip';
import { Popover } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { FilterDefinition, ActiveFilter, SortDefinition, ActiveSort } from './models/filter.models';
import { ToolbarFilterPopoverComponent } from './components/toolbar-filter-popover/toolbar-filter-popover.component';
import { ToolbarSortPopoverComponent } from './components/toolbar-sort-popover/toolbar-sort-popover.component';

export type ViewMode = 'list' | 'grid';

export type { FilterDefinition, ActiveFilter, SortDefinition, ActiveSort } from './models/filter.models';

@Component({
  selector: 'app-toolbar',
  imports: [FormsModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, DividerModule, Chip, Popover, TooltipModule, ToolbarFilterPopoverComponent, ToolbarSortPopoverComponent, ElementSizeDirective],
  template: `
    <div class="toolbar" [appElementSize]="{ compact: 700 }">
      <p-iconfield class="toolbar-search">
        <p-inputicon class="fa-regular fa-magnifying-glass"/>
        <input pInputText pSize="small" type="text" [placeholder]="searchPlaceholder()" [ngModel]="search()" (ngModelChange)="onSearchChange($event)" />
        @if (search()) {
          <p-inputicon class="fa-regular fa-xmark toolbar-search-clear" (click)="onSearchChange('')" />
        }
      </p-iconfield>

      <div class="toolbar-controls">
        @if (filterDefinitions().length > 0) {
          <p-button
            icon="fa-regular fa-filter"
            label="Filtrer"
            severity="secondary"
            [text]="true"
            size="small"
            rounded
            (onClick)="filterPopover.toggle($event)"
          />
        }

        @if (sortDefinitions().length > 0) {
          <p-button
            icon="fa-regular fa-arrow-down-a-z"
            label="Trier"
            severity="secondary"
            [text]="true"
            size="small"
            rounded
            (onClick)="sortPopover.toggle($event)"
          />
        }

        <p-divider layout="vertical" />

        @if (showViewMode()) {
          <p-button
            [icon]="viewMode() === 'list' ? 'fa-regular fa-grid-2' : 'fa-regular fa-list'"
            [pTooltip]="viewMode() === 'list' ? 'Vue en carte' : 'Vue en liste'"
            tooltipPosition="right"
            severity="secondary"
            [text]="true"
            size="small"
            (onClick)="toggleViewMode()"
            rounded
          />
        }
      </div>

      <div class="toolbar-right">
        <ng-content />
      </div>
    </div>

    <!-- Popovers hors du flex/grid container pour ne pas perturber le layout -->
    <p-popover #filterPopover appendTo="body">
      <app-toolbar-filter-popover
        [definitions]="filterDefinitions()"
        [activeFilters]="filters()"
        (filterConfirmed)="addFilter($event); filterPopover.hide()"
      />
    </p-popover>

    <p-popover #sortPopover appendTo="body">
      <app-toolbar-sort-popover
        [definitions]="sortDefinitions()"
        [activeSorts]="sorts()"
        (sortConfirmed)="addSort($event); sortPopover.hide()"
      />
    </p-popover>

    @if (filters().length > 0 || sorts().length > 0) {
      <div class="toolbar-filters">
        @for (sort of sorts(); track sort.definitionId) {
          <p-chip [label]="sort.label" [removable]="true" (onRemove)="removeSort(sort)" />
        }
        @for (filter of filters(); track filter.definitionId) {
          <p-chip [label]="filter.label" [removable]="true" (onRemove)="removeFilter(filter)" />
        }
        @if (filters().length + sorts().length > 2) {
          <p-button
            label="Tout effacer"
            icon="fa-regular fa-xmark"
            severity="danger"
            [text]="true"
            size="small"
            (onClick)="clearAll()"
          />
        }
      </div>
    }
  `,
  styles: `
    .toolbar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .toolbar-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: auto;
    }

    /* ── Mode compact : grid 2 lignes, alignement pixel-perfect ── */
    .toolbar.compact {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-rows: auto auto;
      gap: 0.5rem;
    }

    .toolbar.compact .toolbar-search {
      grid-column: 1;
      grid-row: 1;
    }

    .toolbar.compact .toolbar-right {
      grid-column: 2;
      grid-row: 1;
      margin-left: 0;
    }

    .toolbar.compact .toolbar-controls {
      grid-column: 1 / -1;
      grid-row: 2;
    }

    .toolbar-filters {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding-top: 0.75rem;
    }

    :host ::ng-deep p-iconfield {
      flex-shrink: 1;
      min-width: 6rem;

      .p-inputicon {
        margin-top: -.35rem;
        font-size: 0.625rem;
      }

      .p-inputtext {
        width: 18rem;
        max-width: 100%;
      }

      .toolbar-search-clear {
        cursor: pointer;
        color: var(--p-text-muted-color);
        transition: color 0.15s;
        &:hover { color: var(--p-text-color); }
      }
    }

    :host ::ng-deep .p-chip {
      font-size: 0.675rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 2rem;
    }
  `,
})
export class ToolbarComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  searchPlaceholder = input('Rechercher...');
  showViewMode = input(true);
  search = model('');
  viewMode = model<ViewMode>('list');
  filters = model<ActiveFilter[]>([]);
  filterDefinitions = input<FilterDefinition[]>([]);
  sorts = model<ActiveSort[]>([]);
  sortDefinitions = input<SortDefinition[]>([]);

  private skipUrlUpdate = false;

  constructor() {
    effect(() => {
      const filters = this.filters();
      const sorts = this.sorts();
      const search = this.search();
      if (!this.skipUrlUpdate) {
        this.syncToUrl(filters, sorts, search);
      }
    });
  }

  ngOnInit(): void {
    this.restoreFromUrl();
  }

  onSearchChange(value: string): void {
    this.search.set(value);
  }

  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'list' ? 'grid' : 'list');
  }

  addFilter(filter: ActiveFilter): void {
    const existing = this.filters().filter((f) => f.definitionId !== filter.definitionId);
    this.filters.set([...existing, filter]);
  }

  removeFilter(filter: ActiveFilter): void {
    this.filters.set(this.filters().filter((f) => f.definitionId !== filter.definitionId));
  }

  addSort(sort: ActiveSort): void {
    const existing = this.sorts().filter((s) => s.definitionId !== sort.definitionId);
    this.sorts.set([...existing, sort]);
  }

  removeSort(sort: ActiveSort): void {
    this.sorts.set(this.sorts().filter((s) => s.definitionId !== sort.definitionId));
  }

  clearAll(): void {
    this.filters.set([]);
    this.sorts.set([]);
  }

  private syncToUrl(filters: ActiveFilter[], sorts: ActiveSort[], search: string): void {
    const queryParams: Record<string, string | null> = {};

    queryParams['q'] = search || null;

    for (const def of this.filterDefinitions()) {
      queryParams[`f_${def.id}`] = null;
    }
    for (const filter of filters) {
      queryParams[`f_${filter.definitionId}`] = this.serializeValue(filter);
    }

    queryParams['sort'] = sorts.length
      ? sorts.map((s) => `${s.definitionId}:${s.direction}`).join(',')
      : null;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private restoreFromUrl(): void {
    const params = this.route.snapshot.queryParams;

    if (params['q']) {
      this.skipUrlUpdate = true;
      this.search.set(params['q']);
    }

    const restored: ActiveFilter[] = [];
    for (const def of this.filterDefinitions()) {
      const raw = params[`f_${def.id}`];
      if (raw != null) {
        const filter = this.deserializeFilter(def, raw);
        if (filter) restored.push(filter);
      }
    }
    if (restored.length > 0) {
      this.skipUrlUpdate = true;
      this.filters.set(restored);
    }

    const sortParam = params['sort'];
    if (sortParam) {
      const restoredSorts: ActiveSort[] = [];
      for (const part of sortParam.split(',')) {
        const [id, dir] = part.split(':');
        const def = this.sortDefinitions().find((d) => d.id === id);
        if (def && (dir === 'asc' || dir === 'desc')) {
          restoredSorts.push({
            definitionId: id,
            label: `${def.label} ${dir === 'asc' ? '↑' : '↓'}`,
            direction: dir,
          });
        }
      }
      if (restoredSorts.length > 0) {
        this.skipUrlUpdate = true;
        this.sorts.set(restoredSorts);
      }
    }

    setTimeout(() => this.skipUrlUpdate = false);
  }

  private serializeValue(filter: ActiveFilter): string {
    const value = filter.value;
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return value.map((v) => v instanceof Date ? v.toISOString() : String(v)).join(',');
    }
    return String(value);
  }

  private deserializeFilter(def: FilterDefinition, raw: string): ActiveFilter | null {
    switch (def.type) {
      case 'select': {
        const opt = def.options?.find((o) => String(o.value) === raw);
        const value = opt ? opt.value : raw;
        return {
          definitionId: def.id,
          label: `${def.label}: ${opt?.label ?? raw}`,
          value,
        };
      }
      case 'multiselect': {
        const values = raw.split(',');
        const labels = values.map((v) => {
          const opt = def.options?.find((o) => String(o.value) === v);
          return opt?.label ?? v;
        });
        const resolvedValues = values.map((v) => {
          const opt = def.options?.find((o) => String(o.value) === v);
          return opt ? opt.value : v;
        });
        return {
          definitionId: def.id,
          label: labels.length <= 2
            ? `${def.label}: ${labels.join(', ')}`
            : `${def.label}: ${labels.length} sélections`,
          value: resolvedValues,
        };
      }
      case 'date': {
        if (def.dateRange) {
          const parts = raw.split(',');
          const dates = parts.map((p) => new Date(p)).filter((d) => !isNaN(d.getTime()));
          if (dates.length < 1) return null;
          const fmt = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
          return {
            definitionId: def.id,
            label: `${def.label}: ${fmt(dates[0])}${dates[1] ? ' - ' + fmt(dates[1]) : ''}`,
            value: dates,
          };
        } else {
          const date = new Date(raw);
          if (isNaN(date.getTime())) return null;
          const fmt = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
          return {
            definitionId: def.id,
            label: `${def.label}: ${fmt(date)}`,
            value: date,
          };
        }
      }
      default:
        return null;
    }
  }
}

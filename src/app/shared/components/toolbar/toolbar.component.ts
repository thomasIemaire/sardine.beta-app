import { Component, effect, inject, input, model, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DividerModule } from 'primeng/divider';
import { Chip } from 'primeng/chip';
import { Popover } from 'primeng/popover';
import { FilterDefinition, ActiveFilter } from './models/filter.models';
import { ToolbarFilterPopoverComponent } from './components/toolbar-filter-popover/toolbar-filter-popover.component';

export type ViewMode = 'list' | 'grid';

export type { FilterDefinition, ActiveFilter } from './models/filter.models';

@Component({
  selector: 'app-toolbar',
  imports: [FormsModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, DividerModule, Chip, Popover, ToolbarFilterPopoverComponent],
  template: `
    <div class="toolbar">
      <div class="toolbar-left">
        <p-iconfield>
          <p-inputicon class="fa-regular fa-magnifying-glass"/>
          <input pInputText pSize="small" type="text" [placeholder]="searchPlaceholder()" [ngModel]="search()" (ngModelChange)="onSearchChange($event)" />
        </p-iconfield>

        @if (filterDefinitions().length > 0) {
          <p-divider layout="vertical" />

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

        <p-divider layout="vertical" />

        <p-button
          [icon]="viewMode() === 'list' ? 'fa-regular fa-grid-2' : 'fa-regular fa-list'"
          [label]="viewMode() === 'list' ? 'Vue en carte' : 'Vue en liste'"
          severity="secondary"
          [text]="true"
          size="small"
          (onClick)="toggleViewMode()"
          rounded
        />
      </div>

      <p-popover #filterPopover appendTo="body">
        <app-toolbar-filter-popover
          [definitions]="filterDefinitions()"
          [activeFilters]="filters()"
          (filterConfirmed)="addFilter($event); filterPopover.hide()"
        />
      </p-popover>

      <div class="toolbar-right">
        <ng-content />
      </div>
    </div>

    @if (filters().length > 0) {
      <div class="toolbar-filters">
        @for (filter of filters(); track filter.definitionId) {
          <p-chip [label]="filter.label" [removable]="true" (onRemove)="removeFilter(filter)" />
        }
        @if (filters().length > 2) {
          <p-button
            label="Supprimer tous les filtres"
            icon="fa-regular fa-xmark"
            severity="danger"
            [text]="true"
            size="small"
            (onClick)="clearFilters()"
          />
        }
      </div>
    }
  `,
  styles: `
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .toolbar-separator {
      width: 1px;
      height: 1.25rem;
      background: var(--surface-border);
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .toolbar-filters {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding-top: 0.75rem;
    }

    :host ::ng-deep p-iconfield {
      .p-inputicon {
        margin-top: -.35rem;
        font-size: 0.625rem;
      }

      .p-inputtext {
        width: 18rem;
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
  search = model('');
  viewMode = model<ViewMode>('list');
  filters = model<ActiveFilter[]>([]);
  filterDefinitions = input<FilterDefinition[]>([]);

  private skipUrlUpdate = false;

  constructor() {
    effect(() => {
      const filters = this.filters();
      const search = this.search();
      if (!this.skipUrlUpdate) {
        this.syncToUrl(filters, search);
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

  clearFilters(): void {
    this.filters.set([]);
  }

  private syncToUrl(filters: ActiveFilter[], search: string): void {
    const queryParams: Record<string, string | null> = {};

    // Search
    queryParams['q'] = search || null;

    // Clear all filter params first
    for (const def of this.filterDefinitions()) {
      queryParams[`f_${def.id}`] = null;
    }

    // Set active filter params
    for (const filter of filters) {
      queryParams[`f_${filter.definitionId}`] = this.serializeValue(filter);
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private restoreFromUrl(): void {
    const params = this.route.snapshot.queryParams;
    const definitions = this.filterDefinitions();

    // Restore search
    if (params['q']) {
      this.skipUrlUpdate = true;
      this.search.set(params['q']);
    }

    // Restore filters
    const restored: ActiveFilter[] = [];
    for (const def of definitions) {
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

    // Re-enable URL sync on next tick
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

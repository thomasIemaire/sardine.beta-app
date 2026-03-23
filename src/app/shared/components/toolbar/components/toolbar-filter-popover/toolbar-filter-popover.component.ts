import { Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { MultiSelect } from 'primeng/multiselect';
import { DatePicker } from 'primeng/datepicker';
import { FilterDefinition, ActiveFilter } from '../../models/filter.models';

@Component({
  selector: 'app-toolbar-filter-popover',
  imports: [FormsModule, ButtonModule, Select, MultiSelect, DatePicker],
  template: `
    @if (!selectedDefinition()) {
      <div class="filter-list">
        <span class="filter-list-title">Filtrer par</span>
        @for (def of availableDefinitions(); track def.id) {
          <button class="filter-list-item" (click)="selectDefinition(def)">
            <i [class]="getIcon(def.type)"></i>
            <span>{{ def.label }}</span>
            <i class="fa-regular fa-chevron-right filter-list-arrow"></i>
          </button>
        }
        @empty {
          <span class="filter-list-empty">Tous les filtres sont actifs</span>
        }
      </div>
    } @else {
      <div class="filter-form">
        <button class="filter-back" (click)="back()">
          <i class="fa-regular fa-arrow-left"></i>
          <span>{{ selectedDefinition()!.label }}</span>
        </button>

        <div class="filter-control">
          @switch (selectedDefinition()!.type) {
            @case ('select') {
              <p-select
                [options]="selectedDefinition()!.options ?? []"
                optionLabel="label"
                optionValue="value"
                [placeholder]="'Choisir ' + selectedDefinition()!.label.toLowerCase()"
                [(ngModel)]="filterValue"
                [style]="{ width: '100%' }"
                appendTo="body"
                size="small"
              />
            }
            @case ('multiselect') {
              <p-multiselect
                [options]="selectedDefinition()!.options ?? []"
                optionLabel="label"
                optionValue="value"
                [placeholder]="'Choisir ' + selectedDefinition()!.label.toLowerCase()"
                [(ngModel)]="filterValue"
                display="chip"
                [style]="{ width: '100%' }"
                appendTo="body"
                size="small"
              />
            }
            @case ('date') {
              <p-datepicker
                size="small"
                [(ngModel)]="filterValue"
                [selectionMode]="selectedDefinition()!.dateRange ? 'range' : 'single'"
                [inline]="true"
                dateFormat="dd/mm/yy"
              />
            }
          }
        </div>

        <p-button
          label="Appliquer"
          size="small"
          rounded
          [style]="{ width: '100%' }"
          [disabled]="!isValueValid()"
          (onClick)="confirm()"
        />
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 16rem;
    }

    .filter-list {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .filter-list-title {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--p-text-muted-color);
      padding: 0.25rem 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.025rem;
    }

    .filter-list-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: .25rem .5rem;
      border: none;
      background: none;
      border-radius: var(--radius-m);
      cursor: pointer;
      font-size: 0.8125rem;
      color: var(--p-text-color);
      transition: background 0.15s ease;

      &:hover {
        background: var(--background-color-100);
      }

      i:first-child {
        width: 1rem;
        text-align: center;
        font-size: 0.75rem;
        color: var(--p-text-muted-color);
      }

      span {
        flex: 1;
      }

      .filter-list-arrow {
        font-size: 0.5rem;
        color: var(--p-text-muted-color);
      }
    }

    .filter-list-empty {
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
      padding: 0.5rem;
    }

    .filter-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .filter-back {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--p-text-color);

      i {
        font-size: 0.625rem;
        color: var(--p-text-muted-color);
      }
    }

    .filter-control {
      display: flex;
      flex-direction: column;
    }
  `,
})
export class ToolbarFilterPopoverComponent {
  definitions = input.required<FilterDefinition[]>();
  activeFilters = input<ActiveFilter[]>([]);
  filterConfirmed = output<ActiveFilter>();

  selectedDefinition = signal<FilterDefinition | null>(null);
  filterValue: any = null;

  availableDefinitions = computed(() => {
    const activeIds = new Set(this.activeFilters().map((f) => f.definitionId));
    return this.definitions().filter((d) => !activeIds.has(d.id));
  });

  getIcon(type: string): string {
    switch (type) {
      case 'select': return 'fa-regular fa-list-dropdown';
      case 'multiselect': return 'fa-regular fa-list-check';
      case 'date': return 'fa-regular fa-calendar';
      default: return 'fa-regular fa-filter';
    }
  }

  selectDefinition(def: FilterDefinition): void {
    this.selectedDefinition.set(def);
    this.filterValue = null;
  }

  back(): void {
    this.selectedDefinition.set(null);
    this.filterValue = null;
  }

  isValueValid(): boolean {
    if (this.filterValue == null) return false;
    if (Array.isArray(this.filterValue) && this.filterValue.length === 0) return false;
    if (Array.isArray(this.filterValue) && this.filterValue.some((v: any) => v == null)) return false;
    return true;
  }

  confirm(): void {
    const def = this.selectedDefinition()!;
    const label = this.formatLabel(def);

    this.filterConfirmed.emit({
      definitionId: def.id,
      label,
      value: this.filterValue,
    });

    this.back();
  }

  private formatDate(date: Date): string {
    if (!date) return '';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  private formatLabel(def: FilterDefinition): string {
    const opts = def.options ?? [];

    switch (def.type) {
      case 'select': {
        const opt = opts.find((o) => o.value === this.filterValue);
        return `${def.label}: ${opt?.label ?? this.filterValue}`;
      }
      case 'multiselect': {
        const labels = (this.filterValue as any[])
          .map((v) => opts.find((o) => o.value === v)?.label ?? v);
        return labels.length <= 2
          ? `${def.label}: ${labels.join(', ')}`
          : `${def.label}: ${labels.length} sélections`;
      }
      case 'date': {
        if (Array.isArray(this.filterValue)) {
          const [start, end] = this.filterValue;
          return `${def.label}: ${this.formatDate(start)} - ${this.formatDate(end)}`;
        }
        return `${def.label}: ${this.formatDate(this.filterValue)}`;
      }
      default:
        return def.label;
    }
  }
}

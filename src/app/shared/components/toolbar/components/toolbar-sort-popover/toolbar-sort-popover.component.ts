import { Component, input, output, signal, computed } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SortDefinition, ActiveSort, SortDirection } from '../../models/filter.models';

@Component({
  selector: 'app-toolbar-sort-popover',
  imports: [ButtonModule],
  template: `
    @if (!selectedDefinition()) {
      <div class="sort-list">
        <span class="sort-list-title">Trier par</span>
        @for (def of availableDefinitions(); track def.id) {
          <button class="sort-list-item" (click)="selectDefinition(def)">
            <i class="fa-regular fa-arrow-down-a-z"></i>
            <span>{{ def.label }}</span>
            <i class="fa-regular fa-chevron-right sort-list-arrow"></i>
          </button>
        }
        @empty {
          <span class="sort-list-empty">Tous les tris sont actifs</span>
        }
      </div>
    } @else {
      <div class="sort-form">
        <button class="sort-back" (click)="back()">
          <i class="fa-regular fa-arrow-left"></i>
          <span>{{ selectedDefinition()!.label }}</span>
        </button>

        <div class="sort-directions">
          <button
            class="sort-direction-item"
            [class.active]="selectedDirection === 'asc'"
            (click)="selectedDirection = 'asc'"
          >
            <i class="fa-regular fa-arrow-up-a-z"></i>
            <span>Croissant</span>
          </button>
          <button
            class="sort-direction-item"
            [class.active]="selectedDirection === 'desc'"
            (click)="selectedDirection = 'desc'"
          >
            <i class="fa-regular fa-arrow-down-z-a"></i>
            <span>Décroissant</span>
          </button>
        </div>

        <p-button
          label="Appliquer"
          size="small"
          rounded
          [style]="{ width: '100%' }"
          [disabled]="!selectedDirection"
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

    .sort-list {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .sort-list-title {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--p-text-muted-color);
      padding: 0.25rem 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.025rem;
    }

    .sort-list-item {
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

      .sort-list-arrow {
        font-size: 0.5rem;
        color: var(--p-text-muted-color);
      }
    }

    .sort-list-empty {
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
      padding: 0.5rem;
    }

    .sort-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .sort-back {
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

    .sort-directions {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .sort-direction-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: .375rem .5rem;
      border: 1px solid transparent;
      border-radius: var(--radius-m);
      background: none;
      cursor: pointer;
      font-size: 0.8125rem;
      color: var(--p-text-color);
      transition: background 0.15s ease, border-color 0.15s ease;

      &:hover {
        background: var(--background-color-100);
      }

      &.active {
        background: var(--primary-color-50);
        border-color: var(--primary-color-200);
        color: var(--primary-color-700);

        i {
          color: var(--primary-color-700);
        }
      }

      i {
        width: 1rem;
        text-align: center;
        font-size: 0.75rem;
        color: var(--p-text-muted-color);
      }
    }
  `,
})
export class ToolbarSortPopoverComponent {
  definitions = input.required<SortDefinition[]>();
  activeSorts = input<ActiveSort[]>([]);
  sortConfirmed = output<ActiveSort>();

  selectedDefinition = signal<SortDefinition | null>(null);
  selectedDirection: SortDirection | null = null;

  availableDefinitions = computed(() => {
    const activeIds = new Set(this.activeSorts().map((s) => s.definitionId));
    return this.definitions().filter((d) => !activeIds.has(d.id));
  });

  selectDefinition(def: SortDefinition): void {
    this.selectedDefinition.set(def);
    this.selectedDirection = null;
  }

  back(): void {
    this.selectedDefinition.set(null);
    this.selectedDirection = null;
  }

  confirm(): void {
    const def = this.selectedDefinition()!;
    const direction = this.selectedDirection!;
    const dirLabel = direction === 'asc' ? '↑' : '↓';

    this.sortConfirmed.emit({
      definitionId: def.id,
      label: `${def.label} ${dirLabel}`,
      direction,
    });

    this.back();
  }
}

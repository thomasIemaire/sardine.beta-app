import { Component, input, model, output, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { PaginatorState } from 'primeng/paginator';
import { ToolbarComponent, ViewMode } from '../toolbar/toolbar.component';
import type { ActiveFilter, FilterDefinition, ActiveSort, SortDefinition } from '../toolbar/models/filter.models';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { PaginatorBarComponent } from '../paginator-bar/paginator-bar.component';
import { ElementSizeDirective } from '../../directives/element-size.directive';

export interface ListColumn {
  label: string;
  cssClass: string;
}

@Component({
  selector: 'app-data-list',
  imports: [NgTemplateOutlet, ToolbarComponent, EmptyStateComponent, PaginatorBarComponent, ElementSizeDirective],
  template: `
    <div class="data-list-toolbar">
      <app-toolbar
        [searchPlaceholder]="searchPlaceholder()"
        [(filters)]="filters"
        [(search)]="search"
        [filterDefinitions]="filterDefinitions()"
        [(sorts)]="sorts"
        [sortDefinitions]="sortDefinitions()"
        [(viewMode)]="viewMode"
        [showViewMode]="showViewMode()"
      >
        <ng-content select="[toolbar-actions]" />
      </app-toolbar>
    </div>

    <div class="data-list-content" [class.list-mode]="viewMode() === 'list'">
      @if (totalRecords() > 0) {
        @if (viewMode() === 'grid') {
          <div class="data-list-grid">
            <ng-container *ngTemplateOutlet="gridTemplate()!" />
          </div>
        } @else {
          <div class="data-list-container" [appElementSize]="{ compact: listCompactBreakpoint() }">
            @if (columns().length > 0) {
              <div class="data-list-header">
                @for (col of columns(); track col.cssClass) {
                  <span class="dlh-col" [class]="col.cssClass">{{ col.label }}</span>
                }
              </div>
            }
            <div class="data-list-items">
              <ng-container *ngTemplateOutlet="listTemplate()!" />
            </div>
          </div>
        }
      } @else {
        <app-empty-state
          [icon]="emptyIcon()"
          [title]="emptyTitle()"
          [subtitle]="emptySubtitle()"
        />
      }
    </div>

    @if (totalRecords() > 0) {
      <app-paginator-bar
        [first]="paginatorFirst()"
        [rows]="paginatorRows()"
        [totalRecords]="totalRecords()"
        [rowsPerPageOptions]="rowsPerPageOptions()"
        (pageChange)="pageChange.emit($event)"
      />
    }
  `,
  styleUrl: './data-list.component.scss',
})
export class DataListComponent {
  // Toolbar
  searchPlaceholder = input('Rechercher...');
  filterDefinitions = input<FilterDefinition[]>([]);
  sortDefinitions = input<SortDefinition[]>([]);
  showViewMode = input(true);
  filters = model<ActiveFilter[]>([]);
  sorts = model<ActiveSort[]>([]);
  search = model('');
  viewMode = model<ViewMode>('grid');

  // List columns
  columns = input<ListColumn[]>([]);
  listCompactBreakpoint = input(700);

  // Templates
  gridTemplate = input<TemplateRef<unknown> | null>(null);
  listTemplate = input<TemplateRef<unknown> | null>(null);

  // Empty state
  emptyIcon = input('fa-regular fa-inbox');
  emptyTitle = input('Aucun résultat');
  emptySubtitle = input('');

  // Paginator
  totalRecords = input(0);
  paginatorFirst = input(0);
  paginatorRows = input(12);
  rowsPerPageOptions = input<number[]>([6, 12, 24, 48]);
  pageChange = output<PaginatorState>();
}

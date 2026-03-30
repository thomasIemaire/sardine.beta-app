import { Component, input, output } from '@angular/core';
import { Paginator, PaginatorState } from 'primeng/paginator';

@Component({
  selector: 'app-paginator-bar',
  imports: [Paginator],
  template: `
    <div class="paginator-bar">
      <span class="paginator-count">{{ totalRecords() }} résultat{{ totalRecords() > 1 ? 's' : '' }}</span>
      <p-paginator
        [first]="first()"
        [rows]="rows()"
        [totalRecords]="totalRecords()"
        [rowsPerPageOptions]="rowsPerPageOptions()"
        (onPageChange)="pageChange.emit($event)"
      />
    </div>
  `,
  styleUrl: './paginator-bar.component.scss',
})
export class PaginatorBarComponent {
  first = input(0);
  rows = input(12);
  totalRecords = input.required<number>();
  rowsPerPageOptions = input<number[]>([6, 12, 24, 48]);

  pageChange = output<PaginatorState>();
}

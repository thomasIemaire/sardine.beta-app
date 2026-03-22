import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string;
}

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  template: `
    @for (item of items(); track item.label; let last = $last) {
      @if (item.link && !last) {
        <a class="breadcrumb-link" [routerLink]="item.link">{{ item.label }}</a>
      } @else {
        <span class="breadcrumb-current">{{ item.label }}</span>
      }
      @if (!last) {
        <span class="breadcrumb-separator">›</span>
      }
    }
  `,
  host: {
    style: 'display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem;',
  },
  styles: `
    .breadcrumb-link {
      color: var(--p-text-muted-color);
      text-decoration: none;
      transition: color 0.15s ease;

      &:hover {
        color: var(--p-text-color);
      }
    }

    .breadcrumb-separator {
      color: var(--p-text-muted-color);
    }

    .breadcrumb-current {
      font-weight: 600;
      color: var(--p-text-color);
    }
  `,
})
export class BreadcrumbComponent {
  items = input.required<BreadcrumbItem[]>();
}

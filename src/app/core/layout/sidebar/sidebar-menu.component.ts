import { Component, input } from '@angular/core';
import { SidebarItemMenuComponent } from './sidebar-item-menu.component';
import { SidebarMenuItem } from './sidebar.models';

@Component({
  selector: 'app-sidebar-menu',
  imports: [SidebarItemMenuComponent],
  template: `
    <nav class="sidebar-menu">
      @if (title()) {
        <span class="sidebar-menu-title">{{ title() }}</span>
      }
      <div class="sidebar-menu-items">
        @for (item of items(); track item.link) {
          <app-sidebar-item-menu [label]="item.label" [icon]="item.icon" [link]="item.link" [badge]="item.badge" [exact]="item.exact ?? false" />
        }
      </div>
    </nav>
  `,
  styles: `
    .sidebar-menu {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .sidebar-menu-title {
      padding: 0.5rem 0.75rem 0.25rem;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--p-text-muted-color);
      border-left: 2px solid transparent;
    }

    .sidebar-menu-items {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      cursor: pointer;
    }
  `,
})
export class SidebarMenuComponent {
  title = input<string>();
  items = input.required<SidebarMenuItem[]>();
}

import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar-item-menu',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <a class="sidebar-item" [routerLink]="link()" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: exact() }">
      @if (icon()) {
        <i class="sidebar-item-icon" [class]="icon()"></i>
      }
      <span class="sidebar-item-label">{{ label() }}</span>
      @if (badge()) {
        <span class="sidebar-item-badge">{{ badge() }}</span>
      }
    </a>
  `,
  styles: `
    .sidebar-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.325rem 0.625rem;
      border: 1px solid transparent;
      border-radius: .625rem;
      color: var(--p-text-muted-color);
      text-decoration: none;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: color 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;

      &:hover {
        color: var(--p-text-color);
        background-color: var(--background-color-50);
        border: 1px solid var(--background-color-50);
      }

      &.active {
        color: var(--p-primary-500);
        background-color: var(--primary-color-50);
        border: 1px solid var(--primary-color-100);
        font-weight: 500;
      }
    }

    .sidebar-item-badge {
      margin-left: auto;
      min-width: 0.875rem;
      height: 0.875rem;
      padding-inline: 0.1875rem;
      border-radius: 1rem;
      background: var(--p-primary-500);
      color: var(--p-primary-contrast-color);
      font-size: 0.5rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sidebar-item-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 0.625rem;
      font-size: 0.625rem;
      margin-bottom: .125rem;
    }
  `,
})
export class SidebarItemMenuComponent {
  label = input.required<string>();
  icon = input<string>();
  link = input.required<string>();
  badge = input<number>();
  exact = input(false);
}

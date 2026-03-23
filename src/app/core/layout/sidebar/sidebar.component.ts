import { Component, inject } from '@angular/core';
import { SidebarMenuComponent } from './sidebar-menu.component';
import { SidebarMenu } from './sidebar.models';
import { SidebarService } from './sidebar.service';

@Component({
  selector: 'app-sidebar',
  imports: [SidebarMenuComponent],
  template: `
    <div class="sidebar-outer" [class.collapsed]="sidebarService.collapsed()">
      <aside class="sidebar">
        <div class="sidebar-inner">
          <div class="sidebar-brand">Sardine Beta</div>

          <div class="sidebar-nav">
            @for (menu of menus; track menu.title) {
              <app-sidebar-menu [title]="menu.title" [items]="menu.items" />
            }
          </div>
        </div>
      </aside>
    </div>
  `,
  styles: `
    .sidebar-outer {
      width: 250px;
      min-width: 250px;
      height: 100vh;
      overflow: hidden;
      transition: width 0.2s ease, min-width 0.2s ease;

      &.collapsed {
        width: 0;
        min-width: 0;

        &::before {
          content: '';
          position: fixed;
          left: 0;
          top: 0;
          width: 2rem;
          height: 100%;
        }

        &:hover {
          width: 1rem;
          min-width: 1rem;
          border-right: 1px solid var(--surface-border);
        }

        &:hover:has(.sidebar:hover) {
          width: 250px;
          min-width: 250px;
        }

        .sidebar-inner {
          visibility: hidden;
        }

        &:hover:has(.sidebar:hover) .sidebar-inner {
          visibility: visible;
        }
      }
    }

    .sidebar {
      width: 250px;
      min-width: 250px;
      height: 100%;
      background: var(--background-color-0);
      border-right: 1px solid var(--surface-border);
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 1;
    }

    .sidebar-inner {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      height: 48px;
      padding-inline: 1rem;
      font-weight: 700;
      font-size: 0.9375rem;
      white-space: nowrap;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 2rem 0.5rem 0.5rem;
      overflow-y: auto;
      flex: 1;
    }
  `,
})
export class SidebarComponent {
  sidebarService = inject(SidebarService);

  readonly menus: SidebarMenu[] = [
    {
      items: [
        { label: 'Accueil', icon: 'fa-jelly fa-regular fa-house', link: '/', exact: true },
        { label: 'Tâches', icon: 'fa-jelly fa-regular fa-clipboard', link: '/taches', badge: 4 },
        { label: 'Documents', icon: 'fa-jelly fa-regular fa-folder', link: '/documents' },
        { label: 'Corbeille', icon: 'fa-jelly fa-regular fa-trash', link: '/corbeille' },
      ],
    },
    {
      title: 'Organisation',
      items: [
        { label: 'Agents', icon: 'fa-regular fa-microchip-ai', link: '/agents' },
        { label: 'Flows', icon: 'fa-light fa-chart-diagram', link: '/flows' },
        { label: 'Paramètres', icon: 'fa-jelly fa-regular fa-gear', link: '/settings' },
      ],
    },
  ];
}

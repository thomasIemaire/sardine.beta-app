import { Component } from '@angular/core';
import { SidebarMenuComponent } from './sidebar-menu.component';
import { SidebarMenu } from './sidebar.models';

@Component({
  selector: 'app-sidebar',
  imports: [SidebarMenuComponent],
  template: `
    <aside class="sidebar">
      <div class="sidebar-brand">Sardine Beta</div>

      <div class="sidebar-nav">
        @for (menu of menus; track menu.title) {
          <app-sidebar-menu [title]="menu.title" [items]="menu.items" />
        }
      </div>
    </aside>
  `,
  styles: `
    .sidebar {
      width: 250px;
      min-width: 250px;
      height: 100vh;
      background: var(--background-color-0);
      border-right: 1px solid var(--surface-border);
      display: flex;
      flex-direction: column;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      height: 48px;
      padding-inline: 1rem;
      font-weight: 700;
      font-size: 0.9375rem;
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

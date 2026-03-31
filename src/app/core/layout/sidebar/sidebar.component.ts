import { Component, inject, signal } from '@angular/core';
import { SidebarMenuComponent } from './sidebar-menu.component';
import { SidebarOrgSelectComponent } from './sidebar-org-select.component';
import { DropZoneComponent } from '../../../shared/components/drop-zone/drop-zone.component';
import { SidebarMenu } from './sidebar.models';
import { SidebarService } from './sidebar.service';
import { BrandComponent } from '../.././../shared/components/brand/brand.component';
import { DividerModule } from 'primeng/divider';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-sidebar',
  imports: [SidebarMenuComponent, SidebarOrgSelectComponent, DropZoneComponent, BrandComponent, DividerModule],
  template: `
    <div class="sidebar-outer" [class.collapsed]="sidebarService.collapsed()">
      <aside class="sidebar">
        <div class="sidebar-inner">
          <div class="sidebar-brand"><app-brand /></div>

          <div class="sidebar-nav">
            @for (menu of menus; track menu.title) {
              <app-sidebar-menu [title]="menu.title" [items]="menu.items" />
            }
            @if (userService.isAdmin()) {
              <div>
                <app-sidebar-menu [title]="adminMenu.title" [items]="adminMenu.items" />
              </div>
            }
          </div>

          @if (!orgSelectOpen()) {
          <div class="sidebar-drop-zone">
            <app-drop-zone (filesDropped)="onFilesDropped($event)" />
          </div>
          }

          <div class="sidebar-organization-select">
            <app-sidebar-org-select (openChange)="orgSelectOpen.set($event)" />
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
          z-index: 2;
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
          transition: visibility 0s 0.2s;
        }

        &:hover:has(.sidebar:hover) .sidebar-inner {
          visibility: visible;
          transition: visibility 0s 0s;
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
      z-index: 3;
    }

    .sidebar-divider {
      padding: 0 .5rem;
    }

    .sidebar-inner {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 48px;
      padding-inline: 1rem;
      font-weight: 700;
      font-size: 0.9375rem;
      white-space: nowrap;
      margin-top: 2rem;
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 2rem 0.5rem 0.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .sidebar-drop-zone {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem;
      animation: fade-in 0.05s ease both;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

.sidebar-organization-select {

    }
  `,
})
export class SidebarComponent {
  sidebarService = inject(SidebarService);
  userService = inject(UserService);
  orgSelectOpen = signal(false);

  onFilesDropped(files: File[]): void {
    console.log('Fichiers déposés :', files);
  }

  readonly adminMenu: SidebarMenu = {
    title: 'Système',
    items: [
      { label: 'Serveurs', icon: 'fa-regular fa-server', link: '/admin/servers' },
      { label: 'Fine-tuning', icon: 'fa-regular fa-sliders', link: '/admin/fine-tuning' },
    ],
  };

  readonly menus: SidebarMenu[] = [
    {
      items: [
        { label: 'Accueil', icon: 'fa-jelly fa-regular fa-house', link: '/', exact: true },
        { label: 'Tâches', icon: 'fa-jelly fa-regular fa-clipboard', link: '/tasks', badge: 4 },
        { label: 'Documents', icon: 'fa-jelly fa-regular fa-folder', link: '/documents' },
        { label: 'Corbeille', icon: 'fa-jelly fa-regular fa-trash', link: '/trash' },
      ],
    },
    {
      title: 'Organisation',
      items: [
        { label: 'Agents', icon: 'fa-regular fa-microchip-ai', link: '/agents' },
        { label: 'Flows', icon: 'fa-light fa-chart-diagram', link: '/flows' },
{ label: 'Administration', icon: 'fa-jelly fa-regular fa-gear', link: '/administration' },
      ],
    },
  ];
}

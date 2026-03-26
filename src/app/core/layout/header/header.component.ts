import { Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { SidebarService } from '../sidebar/sidebar.service';
import { Divider } from "primeng/divider";

@Component({
  selector: 'app-header',
  imports: [ButtonModule, BreadcrumbComponent, Divider],
  template: `
    <header class="header">
      <div class="header-left">
        <p-button
          [icon]="sidebar.collapsed() ? 'fa-jelly-fill fa-regular fa-sidebar' : 'fa-jelly fa-regular fa-sidebar'"
          severity="secondary"
          [text]="true"
          rounded
          size="small"
          aria-label="Toggle sidebar"
          (onClick)="sidebar.toggle()"
        />
        <p-divider layout="vertical" />
        <app-breadcrumb [items]="breadcrumb()" />
      </div>
      <div class="header-user">
        <span class="header-notification-wrapper">
          <p-button icon="fa-jelly-fill fa-regular fa-bell" severity="secondary" [text]="true" rounded size="small" aria-label="Notifications" />
        </span>
        <p-button severity="secondary" [text]="true" rounded size="small" (onClick)="router.navigate(['/user'])">
          <span class="header-avatar">TL</span>
          <span class="header-username">Thomas Lemaire</span>
        </p-button>
        <p-button icon="fa-solid fa-right-from-bracket" severity="secondary" [text]="true" rounded size="small" aria-label="Se déconnecter" />
      </div>
    </header>
  `,
  styles: `
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 48px;
      padding-inline: .5rem 1rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.25rem;

      app-breadcrumb {
        margin-top: .125rem;
      }
    }

    .header-brand {
      font-weight: 600;
    }

    .header-user {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .header-notification-wrapper {
      position: relative;

      :host ::ng-deep .p-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        font-size: 0.625rem;
        min-width: 1rem;
        height: 1rem;
        line-height: 1rem;
      }
    }

    .header-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 100%;
      background: var(--primary-color-100);
      color: var(--primary-color-700);
      font-size: 0.5rem;
      font-weight: 600;
    }

    .header-username {
      font-size: 0.625rem;
      font-weight: 600;
    }

  `,
})
export class HeaderComponent {
  sidebar = inject(SidebarService);
  router = inject(Router);

  private readonly organizationName = 'Mon Organisation';

  private readonly routeLabels: Record<string, string> = {
    '': 'Accueil',
    'documents': 'Documents',
    'tasks': 'Tâches',
    'trash': 'Corbeille',
    'flows': 'Flows',
    'agents': 'Agents',
    'administration': 'Administration',
    'user': 'Mon compte',
  };

  breadcrumb = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const segments = this.router.url.split('/').filter(Boolean);
        const items: BreadcrumbItem[] = [{ label: this.organizationName, link: '/' }];
        let path = '';
        for (const segment of segments) {
          path += '/' + segment;
          const clean = segment.split('?')[0];
          items.push({
            label: this.routeLabels[clean] ?? clean,
            link: path,
          });
        }
        // Last item has no link
        if (items.length > 1) {
          delete items[items.length - 1].link;
        }
        return items;
      }),
    ),
    { initialValue: [{ label: this.organizationName }] as BreadcrumbItem[] },
  );
}

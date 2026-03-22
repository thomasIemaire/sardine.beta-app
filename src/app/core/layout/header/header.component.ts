import { Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-header',
  imports: [ButtonModule, BreadcrumbComponent],
  template: `
    <header class="header">
      <app-breadcrumb [items]="breadcrumb()" />
      <div class="header-user">
        <span class="header-notification-wrapper">
          <p-button icon="fa-jelly-fill fa-regular fa-bell" severity="secondary" [text]="true" rounded size="small" aria-label="Notifications" />
        </span>
        <p-button severity="secondary" [text]="true" rounded size="small">
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
      padding-inline: 1rem;
      border-bottom: 1px solid var(--surface-border);
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
  private router = inject(Router);

  private readonly routeLabels: Record<string, string> = {
    '': 'Accueil',
    'documents': 'Documents',
    'taches': 'Tâches',
    'corbeille': 'Corbeille',
    'flows': 'Flows',
    'agents': 'Agents',
    'settings': 'Paramètres',
  };

  breadcrumb = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const segments = this.router.url.split('/').filter(Boolean);
        const items: BreadcrumbItem[] = [{ label: 'Accueil', link: '/' }];
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
    { initialValue: [{ label: 'Accueil' }] as BreadcrumbItem[] },
  );
}

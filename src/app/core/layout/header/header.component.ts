import { Component, computed, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { UserAvatarComponent } from '../../../shared/components/user-avatar/user-avatar.component';
import { SidebarService } from '../sidebar/sidebar.service';
import { Divider } from "primeng/divider";
import { AuthService } from '../../services/auth.service';
import { ContextSwitcherService } from '../context-switcher/context-switcher.service';
import { GlobalSearchService } from '../global-search/global-search.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-header',
  imports: [ButtonModule, BreadcrumbComponent, Divider, UserAvatarComponent],
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
      <button class="search-trigger" (click)="search.open()">
        <i class="fa-regular fa-magnifying-glass"></i>
        <span>Rechercher…</span>
        <kbd>Ctrl K</kbd>
      </button>
      <div class="header-user">
        <span class="header-notification-wrapper">
          <p-button
            icon="fa-jelly-fill fa-regular fa-bell"
            severity="secondary"
            [text]="true"
            rounded
            size="small"
            aria-label="Notifications"
            [badge]="notif.unreadCount() > 0 ? notif.unreadCount().toString() : ''"
            badgeSeverity="danger"
            (onClick)="notif.toggle()"
          />
        </span>
        <p-button class="user-button" severity="secondary" [text]="true" rounded size="small" (onClick)="router.navigate(['/user'])">
          <span class="header-avatar">
            @if (auth.currentUser(); as u) {
              <app-user-avatar [userId]="u.id" [initials]="userInitials()" [refreshToken]="auth.avatarVersion()" />
            }
          </span>
          <span class="header-username">{{ userName() }}</span>
        </p-button>
        <p-button icon="fa-solid fa-right-from-bracket" severity="secondary" [text]="true" rounded size="small" aria-label="Se déconnecter" (onClick)="auth.logout()" />
      </div>
    </header>
  `,
  styles: `
    .header {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 48px;
      padding-inline: .5rem 1rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .header-left,
    .header-user {
      flex: 1;
    }

    .header-user {
      justify-content: flex-end;
    }

    .search-trigger {
      width: 280px;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.625rem;
      background: var(--background-color-50);
      border: 1px solid var(--surface-border);
      border-radius: 99px;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
      transition: background 0.1s ease, border-color 0.1s ease;
      white-space: nowrap;

      span {
        flex: 1;
        text-align: left;
      }

      &:hover {
        background: var(--background-color-100);
        border-color: var(--p-primary-300);
        color: var(--p-text-color);
      }

      i { font-size: 0.6875rem; }

      kbd {
        margin-left: auto;
        font-family: inherit;
        font-size: 0.5625rem;
        font-weight: 600;
        background: var(--background-color-100);
        border: 1px solid var(--surface-border);
        border-radius: 4px;
        padding: 0.1rem 0.3rem;
        letter-spacing: 0.02em;
        margin-left: 0.25rem;
      }
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex: 1;

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

    ::ng-deep .user-button button {
      border-radius: 100px !important;
      padding: .3125rem .5rem !important;
    }
  `,
})
export class HeaderComponent {
  sidebar = inject(SidebarService);
  router = inject(Router);
  readonly search = inject(GlobalSearchService);
  readonly auth = inject(AuthService);
  readonly notif = inject(NotificationService);
  private readonly contextSwitcher = inject(ContextSwitcherService);

  readonly userInitials = computed(() => {
    const u = this.auth.currentUser();
    return u ? `${u.first_name[0]}${u.last_name[0]}`.toUpperCase() : '?';
  });

  readonly userName = computed(() => {
    const u = this.auth.currentUser();
    return u ? `${u.first_name} ${u.last_name}` : '';
  });

  readonly orgName = computed(() => {
    const orgs = this.contextSwitcher.organizations();
    const id = this.contextSwitcher.selectedId();
    return orgs.find((o) => o.id === id)?.name ?? '';
  });

  private readonly routeLabels: Record<string, string> = {
    '': 'Accueil',
    'documents': 'Documents',
    'tasks': 'Tâches',
    'trash': 'Corbeille',
    'flows': 'Flows',
    'agents': 'Agents',
    'administration': 'Administration',
    'user': 'Mon compte',
    'docs': 'Documentation',
    'system': 'Système',
    'servers': 'Serveurs',
    'fine-tuning': 'Fine Tuning',
  };

  private readonly routeUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly breadcrumb = computed(() => {
    const url = this.routeUrl();
    const orgLabel = this.orgName();
    const segments = url.split('/').filter(Boolean);
    const isSystemPage = segments[0] === 'system';
    const items: BreadcrumbItem[] = isSystemPage
      ? []
      : [{ label: orgLabel || 'Accueil', link: '/' }];
    let path = '';
    for (const segment of segments) {
      path += '/' + segment;
      const clean = segment.split('?')[0];
      items.push({ label: this.routeLabels[clean] ?? clean, link: path });
    }
    if (items.length > 1) delete items[items.length - 1].link;
    return items;
  });
}

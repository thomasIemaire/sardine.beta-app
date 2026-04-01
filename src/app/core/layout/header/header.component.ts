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
      <div class="header-user">
        <span class="header-notification-wrapper">
          <p-button icon="fa-jelly-fill fa-regular fa-bell" severity="secondary" [text]="true" rounded size="small" aria-label="Notifications" />
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

    ::ng-deep .user-button button {
      border-radius: 100px !important;
      padding: .3125rem .5rem !important;
    }
  `,
})
export class HeaderComponent {
  sidebar = inject(SidebarService);
  router = inject(Router);
  readonly auth = inject(AuthService);
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
    const items: BreadcrumbItem[] = [{ label: orgLabel || 'Accueil', link: '/' }];
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

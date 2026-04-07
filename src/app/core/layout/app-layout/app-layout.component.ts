import { Component, HostListener, inject } from '@angular/core';
import { ChildrenOutletContexts, RouterOutlet } from '@angular/router';
import { trigger, transition, style, animate, query } from '@angular/animations';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ContextSwitcherComponent } from '../context-switcher/context-switcher.component';
import { ContextSwitcherService } from '../context-switcher/context-switcher.service';
import { GlobalSearchComponent } from '../global-search/global-search.component';
import { GlobalSearchService } from '../global-search/global-search.service';
import { NotificationDrawerComponent } from '../notifications/notification-drawer.component';

@Component({
  selector: 'app-app-layout',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, ContextSwitcherComponent, GlobalSearchComponent, NotificationDrawerComponent],
  template: `
    <div class="layout">
      <app-sidebar />
      <div class="layout-main">
        <app-header />
        <main class="content" [@routeAnimation]="getRouteUrl()">
          <router-outlet />
        </main>
      </div>
    </div>
    @if (contextSwitcher.visible()) {
      <app-context-switcher />
    }
    @if (search.isOpen()) {
      <app-global-search />
    }
    <app-notification-drawer />
  `,
  animations: [
    trigger('routeAnimation', [
      transition('* <=> *', [
        query(':leave', [
          style({ display: 'none' }),
        ], { optional: true }),
        query(':enter', [
          style({ opacity: 0 }),
          animate('200ms ease-out', style({ opacity: 1 })),
        ], { optional: true }),
      ]),
    ]),
  ],
  styles: `
  ::ng-deep {
    app-header {
      z-index: 10;
    }

    .layout {
      display: flex;
      height: 100vh;
    }

    .layout-main {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .content {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: auto;

      > *:not(router-outlet) {
        flex: 1;
        height: 100%;
      }
    }
  }
  `,
})
export class AppLayoutComponent {
  private contexts = inject(ChildrenOutletContexts);
  readonly contextSwitcher = inject(ContextSwitcherService);
  readonly search = inject(GlobalSearchService);

  constructor() {
    this.contextSwitcher.loadOrganizations();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.search.toggle();
    }
  }

  getRouteUrl() {
    return this.contexts.getContext('primary')?.route?.url;
  }
}

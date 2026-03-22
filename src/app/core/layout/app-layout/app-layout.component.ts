import { Component, inject } from '@angular/core';
import { ChildrenOutletContexts, RouterOutlet } from '@angular/router';
import { trigger, transition, style, animate, query } from '@angular/animations';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-app-layout',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
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

  getRouteUrl() {
    return this.contexts.getContext('primary')?.route?.url;
  }
}

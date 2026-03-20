import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-app-layout',
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <app-header />
    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
  ::ng-deep {
    .content {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 48px);
      overflow: auto;

      > *:not(router-outlet) {
        flex: 1;
        height: 100%;
      }
    }
  }
  `,
})
export class AppLayoutComponent { }

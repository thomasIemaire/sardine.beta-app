import { Component } from '@angular/core';
import { HeaderPageComponent } from '../header-page/header-page.component';

@Component({
  selector: 'app-page',
  imports: [HeaderPageComponent],
  template: `
    <div class="page">
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .page {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
  `,
})
export class PageComponent {}

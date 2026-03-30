import { Component } from '@angular/core';

@Component({
  selector: 'app-page',
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

import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  template: `
    <header class="header">
      <span>Sardine Beta</span>
    </header>
  `,
  styles: `
    .header {
      display: flex;
      align-items: center;
      height: 48px;
      padding-inline: 1rem;
      border-bottom: 1px solid var(--surface-border);
    }
  `,
})
export class HeaderComponent {}

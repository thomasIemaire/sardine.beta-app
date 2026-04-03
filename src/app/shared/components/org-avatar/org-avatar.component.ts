import { Component, input } from '@angular/core';

@Component({
  selector: 'app-org-avatar',
  template: `{{ initials() }}`,
  host: {
    '[style.width]': 'size()',
    '[style.height]': 'size()',
    '[style.min-width]': 'size()',
    '[style.font-size]': 'fontSize()',
    '[style.border-radius]': 'radius()',
  },
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--background-color-100);
      border: 1px solid var(--surface-border);
      color: var(--p-text-color);
      font-weight: 700;
      flex-shrink: 0;
      text-transform: uppercase;
      user-select: none;
      line-height: 1;
    }
  `,
})
export class OrgAvatarComponent {
  initials = input.required<string>();
  size     = input('1.75rem');
  fontSize = input('0.625rem');
  radius   = input('0.375rem');
}

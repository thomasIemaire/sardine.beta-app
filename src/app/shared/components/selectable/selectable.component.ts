import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-selectable',
  template: `<ng-content />`,
  host: {
    '[class.selected]': 'selected()',
    '[style.--selectable-radius]': 'borderRadius()',
    '[style.--selectable-color]': 'selectedColor()',
    '[style.--selectable-selected-bg]': 'selectedBg()',
    '(click)': 'onClick()',
  },
  styles: `
    :host {
      display: block;
      position: relative;
      cursor: pointer;
      border-radius: var(--selectable-radius, 0);
      transition: transform .1s ease-in-out;

      &::before {
        content: '';
        position: absolute;
        inset: -0.25rem;
        border-radius: inherit;
        background: var(--background-color-100);
        z-index: -1;
        transition: background .75s cubic-bezier(0.075, 0.82, 0.165, 1);
      }

      &:hover::before {
        background: var(--selectable-color, var(--background-color-300));
        animation: pulse 1.5s infinite;
      }

      &.selected::before {
        background: var(--selectable-selected-bg, var(--background-color-200));
      }

      &:active { transform: scale(0.97); }
    }

    @keyframes pulse {
      0%   { box-shadow: 0 0 0 0 var(--selectable-color, var(--background-color-300)); }
      70%  { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
    }
  `,
})
export class SelectableComponent {
  selected = input(false);
  disabled = input(false);
  borderRadius = input('0');
  selectedColor = input('var(--background-color-300)');
  selectedBg = input('var(--background-color-200)');

  selectChange = output<void>();

  onClick(): void {
    if (!this.disabled()) this.selectChange.emit();
  }
}

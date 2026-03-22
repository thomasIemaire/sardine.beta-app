import { Component, input, output, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DividerModule } from 'primeng/divider';

export type ViewMode = 'list' | 'grid';

@Component({
  selector: 'app-toolbar',
  imports: [FormsModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, DividerModule],
  template: `
    <div class="toolbar">
      <div class="toolbar-left">
        <p-iconfield>
          <p-inputicon class="fa-regular fa-magnifying-glass"/>
          <input pInputText pSize="small" type="text" [placeholder]="searchPlaceholder()" [ngModel]="search()" (ngModelChange)="search.set($event)" />
        </p-iconfield>

        <p-divider layout="vertical" />

        <p-button
          [icon]="viewMode() === 'list' ? 'fa-regular fa-grid-2' : 'fa-regular fa-list'"
          [label]="viewMode() === 'list' ? 'Vue en carte' : 'Vue en liste'"
          severity="secondary"
          [text]="true"
          size="small"
          (onClick)="toggleViewMode()"
          rounded
        />
      </div>

      <div class="toolbar-right">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .toolbar-separator {
      width: 1px;
      height: 1.25rem;
      background: var(--surface-border);
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    :host ::ng-deep p-iconfield {
      .p-inputicon {
        margin-top: -.4rem;
        font-size: 0.625rem;
      }

      .p-inputtext {
        width: 18rem;
      }
    }
  `,
})
export class ToolbarComponent {
  searchPlaceholder = input('Rechercher...');
  search = model('');
  viewMode = model<ViewMode>('list');

  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'list' ? 'grid' : 'list');
  }
}

import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state">
      <i [class]="icon()" class="empty-state-icon"></i>
      <span class="empty-state-title">{{ title() }}</span>
      <span class="empty-state-subtitle">{{ subtitle() }}</span>
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 4rem 2rem;
    }

    .empty-state-icon {
      font-size: 2rem;
      color: var(--p-text-muted-color);
      margin-bottom: 0.5rem;
    }

    .empty-state-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--p-text-color);
    }

    .empty-state-subtitle {
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
    }
  `,
})
export class EmptyStateComponent {
  icon = input('fa-regular fa-inbox');
  title = input('Aucun résultat');
  subtitle = input('');
}

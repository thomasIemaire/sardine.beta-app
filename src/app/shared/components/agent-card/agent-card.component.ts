import { Component, input, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ElementSizeDirective } from '../../directives/element-size.directive';

export interface Agent {
  name: string;
  description: string;
  percentage: number;
  createdAt: Date;
  creator: {
    id: string;
    name: string;
    initials: string;
  };
}

@Component({
  selector: 'app-agent-card',
  imports: [DatePipe, ButtonModule, TooltipModule, ElementSizeDirective],
  template: `
    @if (layout() === 'grid') {
      <div class="card">
        <div class="card-header">
          <div class="card-name-group">
            <span class="card-name">{{ agent().name }}</span>
            <span class="card-percentage" [attr.data-severity]="percentageSeverity()" pTooltip="Réussite d'extraction" tooltipPosition="right">{{ agent().percentage }}%</span>
          </div>
          <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" (onClick)="$event.stopPropagation()" />
        </div>
        <p class="card-description">{{ agent().description }}</p>
        <div class="card-footer">
          <div class="card-creator">
            <span class="card-avatar">{{ agent().creator.initials }}</span>
            <span class="card-creator-name">{{ agent().creator.name }}</span>
          </div>
          <span class="card-date">Créé le {{ agent().createdAt | date: 'dd/MM/yyyy' }}</span>
        </div>
      </div>
    } @else {
      <div class="row" [appElementSize]="{ compact: 680 }">
        <div class="row-main">
          <div class="row-name-group">
            <span class="card-name">{{ agent().name }}</span>
            <span class="card-percentage" [attr.data-severity]="percentageSeverity()" pTooltip="Réussite d'extraction" tooltipPosition="right">{{ agent().percentage }}%</span>
          </div>
          <span class="row-description">{{ agent().description }}</span>
        </div>
        <div class="row-meta">
          <div class="card-creator">
            <span class="card-avatar">{{ agent().creator.initials }}</span>
            <span class="card-creator-name">{{ agent().creator.name }}</span>
          </div>
          <span class="card-date">{{ agent().createdAt | date: 'dd/MM/yyyy' }}</span>
          <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" (onClick)="$event.stopPropagation()" />
        </div>
      </div>
    }
  `,
  styles: `
    /* ── Card (grid) ── */
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem 1rem .875rem 1rem;
      border-radius: var(--radius-l);
      background: var(--background-color-50);
      cursor: pointer;
      transition: transform .1s ease-in-out;

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: var(--radius-l);
        background: var(--background-color-100);
        z-index: -1;
        transition: background .75s cubic-bezier(0.075, 0.82, 0.165, 1);
      }

      &:hover::before {
        background: var(--background-color-200);
        animation: pulse 1.5s infinite;
      }

      &:active { transform: scale(0.98); }
    }

    @keyframes pulse {
      0%   { box-shadow: 0 0 0 0 var(--background-color-200); }
      70%  { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: .75rem;
    }

    .card-name-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .card-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--p-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-percentage {
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: 2rem;
      white-space: nowrap;
      flex-shrink: 0;

      &[data-severity='success'] {
        background: var(--green-color-200);
        border: 1px solid var(--green-color-300);
        color: var(--green-color-700);
      }

      &[data-severity='warn'] {
        background: var(--yellow-color-200);
        border: 1px solid var(--yellow-color-300);
        color: var(--yellow-color-700);
      }

      &[data-severity='danger'] {
        background: var(--red-color-200);
        border: 1px solid var(--red-color-300);
        color: var(--red-color-700);
      }
    }

    .card-description {
      margin: 0;
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: .375rem;
    }

    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card-creator {
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .card-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 100%;
      background: var(--primary-color-100);
      color: var(--primary-color-700);
      font-size: 0.5rem;
      font-weight: 600;
    }

    .card-creator-name {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--p-text-color);
    }

    .card-date {
      font-size: 0.625rem;
      color: var(--p-text-muted-color);
    }

    /* ── Row (list) ── */
    .row {
      position: relative;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.625rem 1rem;
      cursor: pointer;
      transition: transform .1s ease-in-out;

      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: transparent;
        z-index: -1;
        transition: background .75s cubic-bezier(0.075, 0.82, 0.165, 1);
      }

      &:hover::before {
        background: var(--background-color-100);
        animation: pulse 1.5s infinite;
      }

      &:active { transform: scale(0.98); }
    }

    .row-main {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      flex: 1;
      min-width: 0;
    }

    .row-name-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .row-description {
      font-size: 0.6875rem;
      color: var(--p-text-muted-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .row-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;

      .card-creator { width: 9rem; flex-shrink: 0; }
      .card-date    { width: 5.5rem; flex-shrink: 0; }
    }

    .row.compact .card-creator-name { display: none; }
    .row.compact .row-meta {
      .card-creator { width: 2rem; }
      .card-date    { display: none; }
    }
  `,
})
export class AgentCardComponent {
  agent = input.required<Agent>();
  layout = input<'grid' | 'list'>('grid');

  percentageSeverity = computed(() => {
    const p = this.agent().percentage;
    if (p >= 70) return 'success';
    if (p >= 40) return 'warn';
    return 'danger';
  });
}

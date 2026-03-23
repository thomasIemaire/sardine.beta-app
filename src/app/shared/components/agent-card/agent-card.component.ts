import { Component, input, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

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
  imports: [DatePipe, ButtonModule, TooltipModule],
  template: `
    <div class="card">
      <div class="card-header">
        <div class="card-name-group">
          <span class="card-name">{{ agent().name }}</span>
          <span class="card-percentage" [attr.data-severity]="percentageSeverity()" pTooltip="Réussite d'extraction" tooltipPosition="right">{{ agent().percentage }}%</span>
        </div>
        <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" />
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
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem 1rem .875rem 1rem;
      border-radius: var(--radius-l);
      // border: 1px solid var(--surface-border);
      background: var(--background-color-50);
      transition: border-color 0.15s ease;
      cursor: pointer;

      &:hover {
        border-color: var(--p-primary-color);
      }
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
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--p-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-percentage {
      font-size: 0.625rem;
      font-weight: 600;
      color: white;
      padding: 0.125rem 0.5rem;
      border-radius: 2rem;
      white-space: nowrap;

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
  `,
})
export class AgentCardComponent {
  agent = input.required<Agent>();

  percentageSeverity = computed(() => {
    const p = this.agent().percentage;
    if (p >= 70) return 'success';
    if (p >= 40) return 'warn';
    return 'danger';
  });
}

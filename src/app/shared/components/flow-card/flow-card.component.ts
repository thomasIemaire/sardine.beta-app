import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

export type FlowStatus = 'success' | 'warn' | 'danger';

export interface Flow {
  name: string;
  description: string;
  status: FlowStatus;
  createdAt: Date;
  creator: {
    id: string;
    name: string;
    initials: string;
  };
}

@Component({
  selector: 'app-flow-card',
  imports: [DatePipe, ButtonModule, TooltipModule],
  template: `
    @if (layout() === 'grid') {
      <div class="card">
        <div class="card-header">
          <div class="card-name-group">
            <span class="card-status-dot" [attr.data-severity]="flow().status" [pTooltip]="statusLabel()" tooltipPosition="right"></span>
            <span class="card-name">{{ flow().name }}</span>
          </div>
          <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" (onClick)="$event.stopPropagation()" />
        </div>
        <p class="card-description">{{ flow().description }}</p>
        <div class="card-footer">
          <div class="card-creator">
            <span class="card-avatar">{{ flow().creator.initials }}</span>
            <span class="card-creator-name">{{ flow().creator.name }}</span>
          </div>
          <span class="card-date">Créé le {{ flow().createdAt | date: 'dd/MM/yyyy' }}</span>
        </div>
      </div>
    } @else {
      <div class="row">
        <span class="card-status-dot" [attr.data-severity]="flow().status" [pTooltip]="statusLabel()" tooltipPosition="right"></span>
        <div class="row-main">
          <span class="card-name">{{ flow().name }}</span>
          <span class="row-description">{{ flow().description }}</span>
        </div>
        <div class="row-meta">
          <div class="card-creator">
            <span class="card-avatar">{{ flow().creator.initials }}</span>
            <span class="card-creator-name">{{ flow().creator.name }}</span>
          </div>
          <span class="card-date">{{ flow().createdAt | date: 'dd/MM/yyyy' }}</span>
          <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" (onClick)="$event.stopPropagation()" />
        </div>
      </div>
    }
  `,
  styles: `
    /* ── Card (grid) ── */
    .card {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem 1rem .875rem 1rem;
      border-radius: var(--radius-l);
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

    @keyframes ripple {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(3); opacity: 0; }
    }

    .card-status-dot {
      position: relative;
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 100%;
      flex-shrink: 0;

      &::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background-color: var(--pulsing-color);
        animation: ripple 2s ease-out infinite;
      }

      &[data-severity='success'] { background: var(--green-color-500); --pulsing-color: var(--green-color-500); }
      &[data-severity='warn']    { background: var(--yellow-color-500); --pulsing-color: var(--yellow-color-500); }
      &[data-severity='danger']  { background: var(--red-color-500);   --pulsing-color: var(--red-color-500); }
    }

    .card-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--p-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.625rem 1rem;
      cursor: pointer;
      transition: background 0.15s ease;

      &:hover {
        background: var(--background-color-100);
      }
    }

    .row-main {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      flex: 1;
      min-width: 0;
    }

    .row-description {
      font-size: 0.75rem;
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
    }
  `,
})
export class FlowCardComponent {
  flow = input.required<Flow>();
  layout = input<'grid' | 'list'>('grid');

  statusLabel(): string {
    switch (this.flow().status) {
      case 'success': return 'Opérationnel';
      case 'warn': return 'Dégradé';
      case 'danger': return 'En erreur';
    }
  }
}

import { Component, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
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
      <div class="card" (click)="navigate()">
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
      <div class="row" (click)="navigate()">
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
  private router = inject(Router);

  flow = input.required<Flow>();
  layout = input<'grid' | 'list'>('grid');

  navigate(): void {
    const id = this.flow().name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    this.router.navigate(['/flows', id]);
  }

  statusLabel(): string {
    switch (this.flow().status) {
      case 'success': return 'Opérationnel';
      case 'warn': return 'Dégradé';
      case 'danger': return 'En erreur';
    }
  }
}

import { Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ElementSizeDirective } from '../../directives/element-size.directive';

export interface Organization {
  id: string;
  name: string;
  initials: string;
  type: string;
  membersCount: number;
  active: boolean;
}

@Component({
  selector: 'app-org-row',
  imports: [ButtonModule, ElementSizeDirective],
  template: `
    <div class="row" [appElementSize]="{ compact: 600 }">
      <div class="row-main">
        <div class="row-logo">{{ org().initials }}</div>
        <span class="row-name">{{ org().name }}</span>
      </div>
      <div class="row-meta">
        <span class="row-type">{{ org().type }}</span>
        <span class="row-count"><i class="fa-regular fa-user"></i> {{ org().membersCount }}</span>
        <span class="row-status" [class.is-active]="org().active">
          <span class="row-status__dot"></span>
          <span class="row-status__label">{{ org().active ? 'Active' : 'Inactive' }}</span>
        </span>
        <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" />
      </div>
    </div>
  `,
  styles: `
    .row {
      position: relative;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.625rem 1rem;
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

    @keyframes pulse {
      0%   { box-shadow: 0 0 0 0 var(--background-color-200); }
      70%  { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
    }

    .row-main {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .row-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      min-width: 1.75rem;
      border-radius: 0.375rem;
      background: var(--background-color-100);
      border: 1px solid var(--surface-border);
      font-size: 0.5rem;
      font-weight: 700;
      color: var(--p-text-color);
      text-transform: uppercase;
    }

    .row-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--p-text-color);
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

    .row-type {
      width: 140px;
      flex-shrink: 0;
      font-size: 0.75rem;
      color: var(--p-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .row-count {
      width: 80px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--p-text-color);

      i { font-size: 0.625rem; color: var(--p-text-muted-color); }
    }

    .row-status {
      width: 80px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.6875rem;
      color: var(--p-text-muted-color);

      &__dot {
        width: 0.4rem;
        height: 0.4rem;
        border-radius: 100%;
        background: var(--p-text-muted-color);
        flex-shrink: 0;
      }

      &.is-active {
        color: var(--green-color-600);
        .row-status__dot { background: var(--green-color-500); }
      }
    }

    .row.compact {
      .row-type  { display: none; }
      .row-count { display: none; }
      .row-status { width: auto; &__label { display: none; } }
    }
  `,
})
export class OrgRowComponent {
  org = input.required<Organization>();
}

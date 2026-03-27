import { Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ElementSizeDirective } from '../../directives/element-size.directive';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Administrateur' | 'Éditeur' | 'Lecteur';
  active: boolean;
}

@Component({
  selector: 'app-member-row',
  imports: [ButtonModule, ElementSizeDirective],
  template: `
    <div class="row" [appElementSize]="{ compact: 600 }">
      <div class="row-main">
        <div class="row-avatar">{{ member().firstName[0] }}{{ member().lastName[0] }}</div>
        <div class="row-info">
          <span class="row-name">{{ member().firstName }} {{ member().lastName }}</span>
          <span class="row-email">{{ member().email }}</span>
        </div>
      </div>
      <div class="row-meta">
        <div class="row-role-col">
            <span class="row-role" [attr.data-role]="member().role">{{ member().role }}</span>
          </div>
        <span class="row-status" [class.is-active]="member().active">
          <span class="row-status__dot"></span>
          <span class="row-status__label">{{ member().active ? 'Actif' : 'Inactif' }}</span>
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

    .row-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      min-width: 1.75rem;
      border-radius: 100%;
      background: var(--primary-color-100);
      color: var(--primary-color-700);
      font-size: 0.5rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .row-info {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;
    }

    .row-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--p-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .row-email {
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
    }

    .row-role-col {
      width: 120px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .row-role {
      display: inline-flex;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.2rem 0.625rem;
      border-radius: 2rem;

      &[data-role='Administrateur'] { background: var(--primary-color-100); color: var(--primary-color-700); }
      &[data-role='Éditeur']        { background: var(--yellow-color-200);  color: var(--yellow-color-700); }
      &[data-role='Lecteur']        { background: var(--background-color-100); color: var(--p-text-muted-color); }
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
      .row-email    { display: none; }
      .row-role-col { width: 2rem; overflow: hidden; }
      .row-role     { font-size: 0; padding: 0; }
      .row-status   { width: auto; &__label { display: none; } }
    }
  `,
})
export class MemberRowComponent {
  member = input.required<Member>();
}

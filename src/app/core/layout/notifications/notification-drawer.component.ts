import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Drawer } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { NotificationService, AppNotification, NotificationScope } from '../../services/notification.service';

@Component({
  selector: 'app-notification-drawer',
  imports: [Drawer, ButtonModule, SelectButton, Tag, TooltipModule, FormsModule],
  template: `
    <p-drawer
      [visible]="service.isOpen()"
      (visibleChange)="service.isOpen.set($event)"
      position="right"
      [style]="{ width: '400px' }"
      styleClass="nd-drawer"
      [closeButtonProps]="{ size: 'small', severity: 'secondary', text: true, rounded: true }"
    >
      <ng-template #header>
        <div class="nd-header">
          <span class="nd-header__title">Notifications</span>
          <p-selectbutton
            [options]="scopeOptions"
            [ngModel]="service.scope()"
            (ngModelChange)="service.setScope($event)"
            optionLabel="label"
            optionValue="value"
            size="small"
          />
        </div>
      </ng-template>

      @if (service.notifications().length > 0) {
        <div class="nd-subbar">
          <p-button
            label="Tout marquer comme lu"
            icon="fa-regular fa-check-double"
            [text]="true"
            severity="secondary"
            size="small"
            [disabled]="service.unreadCount() === 0"
            (onClick)="service.markAllAsRead()"
          />
          <p-button
            label="Tout supprimer"
            icon="fa-regular fa-trash"
            [text]="true"
            severity="danger"
            size="small"
            (onClick)="service.deleteAll()"
          />
        </div>
      }

      @if (service.loading()) {
        <div class="nd-loading">
          <i class="fa-regular fa-spinner fa-spin"></i>
        </div>
      } @else if (service.notifications().length === 0) {
        <div class="nd-empty">
          <i class="fa-regular fa-bell-slash nd-empty__icon"></i>
          <span class="nd-empty__text">Aucune notification</span>
          <span class="nd-empty__sub">Vous êtes à jour !</span>
        </div>
      } @else {
        <div class="nd-list">
          @for (notif of service.notifications(); track notif.id) {
            <div
              class="nd-item"
              [class.nd-item--unread]="!notif.is_read"
              (click)="service.markAsRead(notif.id)"
            >
              <span class="nd-item__dot" [class.nd-item__dot--visible]="!notif.is_read"></span>

              <div class="nd-item__content">
                <div class="nd-item__top">
                  <span class="nd-item__title">{{ notif.title }}</span>
                  <span class="nd-item__time">{{ timeAgo(notif.created_at) }}</span>
                </div>
                <p class="nd-item__message">{{ notif.message }}</p>

                @if (notif.type === 'action') {
                  @if (notif.action_status === 'pending') {
                    <div class="nd-item__actions" (click)="$event.stopPropagation()">
                      @for (action of notif.actions; track action.key) {
                        <p-button
                          [label]="action.label"
                          size="small"
                          rounded
                          [severity]="action.key === 'accept' ? 'primary' : 'secondary'"
                          (onClick)="onActionClick($event, notif, action.key)"
                        />
                      }
                    </div>
                  } @else if (notif.action_status) {
                    <div class="nd-item__tag" (click)="$event.stopPropagation()">
                      <p-tag
                        [value]="notif.action_status_label ?? ''"
                        [severity]="notif.action_status === 'accepted' ? 'success' : 'danger'"
                      />
                    </div>
                  }
                }
              </div>

              <span class="nd-item__del-wrap">
                <p-button
                  icon="fa-regular fa-xmark"
                  text
                  rounded
                  severity="secondary"
                  size="small"
                  pTooltip="Supprimer"
                  tooltipPosition="left"
                  (onClick)="onDeleteClick($event, notif.id)"
                />
              </span>
            </div>
          }
        </div>
      }
    </p-drawer>
  `,
  styles: `
    :host ::ng-deep .nd-drawer .p-drawer-content {
      padding: 0;
    }

    .nd-header {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      width: 100%;

      &__title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--p-text-color);
        margin-right: .5rem;
      }
    }

    .nd-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4rem 1rem;
      color: var(--p-text-muted-color);
      font-size: 1.5rem;
    }

    .nd-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 1.5rem;
      gap: 0.75rem;

      &__icon {
        font-size: 2.5rem;
        color: var(--p-text-muted-color);
        margin-bottom: 0.5rem;
      }

      &__text {
        font-size: 1rem;
        font-weight: 600;
        color: var(--p-text-color);
      }

      &__sub {
        font-size: 0.875rem;
        color: var(--p-text-muted-color);
      }
    }

    .nd-subbar {
      display: flex;
      justify-content: space-between;
      padding: 0.375rem 0.75rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .nd-list {
      display: flex;
      flex-direction: column;
    }

    .nd-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1.125rem 1.25rem;
      border-bottom: 1px solid var(--surface-border);
      cursor: pointer;
      transition: background 0.1s;

      &:hover { background: var(--background-color-50); }
      &:hover .nd-item__del-wrap { opacity: 1; }
      &:last-child { border-bottom: none; }

      &--unread {
        background: color-mix(in srgb, var(--p-primary-color) 5%, transparent);

        .nd-item__title { font-weight: 700; }

        &:hover { background: color-mix(in srgb, var(--p-primary-color) 9%, transparent); }
      }

      &__dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background: transparent;
        flex-shrink: 0;
        margin-top: 0.375rem;

        &--visible { background: var(--p-primary-color); }
      }

      &__content {
        flex: 1;
        min-width: 0;
      }

      &__top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.375rem;
      }

      &__title {
        font-size: 0.875rem;
        color: var(--p-text-color);
        font-weight: 500;
        line-height: 1.4;
      }

      &__time {
        font-size: 0.75rem;
        color: var(--p-text-muted-color);
        white-space: nowrap;
        flex-shrink: 0;
        margin-top: 0.0625rem;
      }

      &__message {
        font-size: 0.8125rem;
        color: var(--p-text-muted-color);
        margin: 0;
        line-height: 1.6;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
      }

      &__actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.875rem;
      }

      &__tag {
        margin-top: 0.625rem;
      }

      &__del-wrap {
        opacity: 0;
        transition: opacity 0.15s;
        flex-shrink: 0;
        margin-top: -0.125rem;
      }
    }
  `,
})
export class NotificationDrawerComponent {
  readonly service = inject(NotificationService);

  readonly scopeOptions: { label: string; value: NotificationScope }[] = [
    { label: 'Organisation', value: 'organization' },
    { label: 'Toutes', value: 'all' },
  ];

  onDeleteClick(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.service.deleteNotification(id);
  }

  onActionClick(event: MouseEvent, notif: AppNotification, actionKey: string): void {
    event.stopPropagation();
    this.service.resolve(notif.id, actionKey).subscribe((updated) => {
      this.service.notifications.update((list) =>
        list.map((n) => n.id === updated.id ? updated : n)
      );
      this.service.markAsRead(updated.id);
    });
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }
}

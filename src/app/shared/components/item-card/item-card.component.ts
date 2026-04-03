import { Component, input, output, TemplateRef } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ElementSizeDirective } from '../../directives/element-size.directive';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';
import { OrgAvatarComponent } from '../org-avatar/org-avatar.component';

export interface ItemCardData {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  isOwned: boolean;
  creator: {
    id: string;
    name: string;
    initials: string;
    shape?: 'circle' | 'org';
  };
}

@Component({
  selector: 'app-item-card',
  imports: [DatePipe, ButtonModule, NgTemplateOutlet, ElementSizeDirective, UserAvatarComponent, OrgAvatarComponent],
  template: `
    @if (layout() === 'grid') {
      <div class="card" (click)="cardClick.emit()" (contextmenu)="menuClick.emit($event); $event.preventDefault()">
        <div class="card-header">
          <div class="card-name-group">
            @if (statusTemplate()) {
              <ng-container *ngTemplateOutlet="statusTemplate()!" />
            }
            <span class="card-name">{{ item().name }}</span>
            @if (badgeTemplate()) {
              <ng-container *ngTemplateOutlet="badgeTemplate()!" />
            }
          </div>
          <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" (onClick)="menuClick.emit($event); $event.stopPropagation()" />
        </div>
        <p class="card-description">{{ item().description }}</p>
        <div class="card-footer">
          <div class="card-creator">
            @if (item().creator.shape === 'org') {
              <app-org-avatar [initials]="item().creator.initials" size="1.75rem" fontSize="0.5rem" />
            } @else {
              <span class="card-avatar"><app-user-avatar [userId]="item().creator.id" [initials]="item().creator.initials" /></span>
            }
            <span class="card-creator-name">{{ item().creator.name }}</span>
          </div>
          <span class="card-date">Créé le {{ item().createdAt | date: 'dd/MM/yyyy' }}</span>
        </div>
      </div>
    } @else {
      <div class="row" [appElementSize]="{ compact: compactBreakpoint() }" (click)="cardClick.emit()" (contextmenu)="menuClick.emit($event); $event.preventDefault()">
        @if (statusTemplate()) {
          <ng-container *ngTemplateOutlet="statusTemplate()!" />
        }
        <div class="row-main">
          <div class="row-name-group">
            <span class="card-name">{{ item().name }}</span>
            @if (badgeTemplate()) {
              <ng-container *ngTemplateOutlet="badgeTemplate()!" />
            }
          </div>
          <span class="row-description">{{ item().description }}</span>
        </div>
        <div class="row-meta">
          <div class="card-creator">
            @if (item().creator.shape === 'org') {
              <app-org-avatar [initials]="item().creator.initials" size="1.75rem" fontSize="0.5rem" />
            } @else {
              <span class="card-avatar"><app-user-avatar [userId]="item().creator.id" [initials]="item().creator.initials" /></span>
            }
            <span class="card-creator-name">{{ item().creator.name }}</span>
          </div>
          <span class="card-date">{{ item().createdAt | date: 'dd/MM/yyyy' }}</span>
          <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" (onClick)="menuClick.emit($event); $event.stopPropagation()" />
        </div>
      </div>
    }
  `,
  styleUrl: './item-card.component.scss',
})
export class ItemCardComponent {
  item = input.required<ItemCardData>();
  layout = input<'grid' | 'list'>('grid');
  compactBreakpoint = input(680);
  statusTemplate = input<TemplateRef<unknown> | null>(null);
  badgeTemplate = input<TemplateRef<unknown> | null>(null);

  cardClick = output<void>();
  menuClick = output<MouseEvent>();
}

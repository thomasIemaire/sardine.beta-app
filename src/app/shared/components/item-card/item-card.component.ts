import { Component, input, output, TemplateRef } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ElementSizeDirective } from '../../directives/element-size.directive';

export interface ItemCardData {
  name: string;
  description: string;
  createdAt: Date;
  creator: {
    id: string;
    name: string;
    initials: string;
  };
}

@Component({
  selector: 'app-item-card',
  imports: [DatePipe, ButtonModule, NgTemplateOutlet, ElementSizeDirective],
  template: `
    @if (layout() === 'grid') {
      <div class="card" (click)="cardClick.emit()">
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
          <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" (onClick)="$event.stopPropagation()" />
        </div>
        <p class="card-description">{{ item().description }}</p>
        <div class="card-footer">
          <div class="card-creator">
            <span class="card-avatar">{{ item().creator.initials }}</span>
            <span class="card-creator-name">{{ item().creator.name }}</span>
          </div>
          <span class="card-date">Créé le {{ item().createdAt | date: 'dd/MM/yyyy' }}</span>
        </div>
      </div>
    } @else {
      <div class="row" [appElementSize]="{ compact: compactBreakpoint() }" (click)="cardClick.emit()">
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
            <span class="card-avatar">{{ item().creator.initials }}</span>
            <span class="card-creator-name">{{ item().creator.name }}</span>
          </div>
          <span class="card-date">{{ item().createdAt | date: 'dd/MM/yyyy' }}</span>
          <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" (onClick)="$event.stopPropagation()" />
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

  /** Template for a status indicator shown before the name (e.g. status dot) */
  statusTemplate = input<TemplateRef<unknown> | null>(null);

  /** Template for a badge shown after the name (e.g. percentage) */
  badgeTemplate = input<TemplateRef<unknown> | null>(null);

  cardClick = output<void>();
}

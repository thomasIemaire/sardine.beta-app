import { Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { ItemCardComponent, ItemCardData } from '../item-card/item-card.component';

export type FlowStatus = 'success' | 'warn' | 'danger';

export interface Flow extends ItemCardData {
  status: FlowStatus;
  forkedFromId: string | null;
  organizationId: string;
  deletedAt?: string | null;
}

@Component({
  selector: 'app-flow-card',
  imports: [TooltipModule, ItemCardComponent],
  template: `
    <app-item-card
      [item]="flow()"
      [layout]="layout()"
      [compactBreakpoint]="700"
      [statusTemplate]="dotTpl"
      [badgeTemplate]="flow().forkedFromId ? forkTpl : null"
      (cardClick)="navigate()"
      (menuClick)="menuOpen.emit($event)"
    />
    <ng-template #dotTpl>
      <span class="card-status-dot" [attr.data-severity]="flow().status" [pTooltip]="statusLabel()" tooltipPosition="right"></span>
    </ng-template>
    <ng-template #forkTpl>
      <span class="fork-badge" pTooltip="Forké depuis un flow partagé" tooltipPosition="top">fork</span>
    </ng-template>
  `,
  styles: `
    .fork-badge {
      font-size: 0.5625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      background: var(--primary-color-100);
      color: var(--primary-color-700);
      border: 1px solid var(--primary-color-200);
      line-height: 1.4;
    }
  `,
  styleUrl: './flow-card.component.scss',
})
export class FlowCardComponent {
  private router = inject(Router);

  flow = input.required<Flow>();
  layout = input<'grid' | 'list'>('grid');
  menuOpen = output<MouseEvent>();

  navigate(): void {
    this.router.navigate(['/flows', this.flow().id], {
      queryParams: { orgId: this.flow().organizationId },
    });
  }

  statusLabel(): string {
    switch (this.flow().status) {
      case 'success': return 'Opérationnel';
      case 'warn': return 'En attente';
      case 'danger': return 'En erreur';
    }
  }
}

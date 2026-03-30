import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { ItemCardComponent, ItemCardData } from '../item-card/item-card.component';

export type FlowStatus = 'success' | 'warn' | 'danger';

export interface Flow extends ItemCardData {
  status: FlowStatus;
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
      (cardClick)="navigate()"
    />
    <ng-template #dotTpl>
      <span class="card-status-dot" [attr.data-severity]="flow().status" [pTooltip]="statusLabel()" tooltipPosition="right"></span>
    </ng-template>
  `,
  styleUrl: './flow-card.component.scss',
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

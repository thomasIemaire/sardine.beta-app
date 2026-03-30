import { Component, input, computed } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { ItemCardComponent, ItemCardData } from '../item-card/item-card.component';

export interface Agent extends ItemCardData {
  percentage: number;
}

@Component({
  selector: 'app-agent-card',
  imports: [TooltipModule, ItemCardComponent],
  template: `
    <app-item-card
      [item]="agent()"
      [layout]="layout()"
      [badgeTemplate]="badgeTpl"
    />
    <ng-template #badgeTpl>
      <span class="card-percentage" [attr.data-severity]="percentageSeverity()" pTooltip="Réussite d'extraction" tooltipPosition="right">{{ agent().percentage }}%</span>
    </ng-template>
  `,
  styleUrl: './agent-card.component.scss',
})
export class AgentCardComponent {
  agent = input.required<Agent>();
  layout = input<'grid' | 'list'>('grid');

  percentageSeverity = computed(() => {
    const p = this.agent().percentage;
    if (p >= 70) return 'success';
    if (p >= 40) return 'warn';
    return 'danger';
  });
}

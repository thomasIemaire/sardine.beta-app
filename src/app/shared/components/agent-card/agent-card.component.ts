import { Component, input, output, computed } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { ItemCardComponent, ItemCardData } from '../item-card/item-card.component';

export interface Agent extends ItemCardData {
  percentage: number;
  forkedFromId: string | null;
  schemaData: Record<string, unknown> | null;
  activeVersionId: string | null;
}

@Component({
  selector: 'app-agent-card',
  imports: [TooltipModule, ItemCardComponent],
  template: `
    <app-item-card
      [item]="agent()"
      [layout]="layout()"
      [badgeTemplate]="badgeTpl"
      (cardClick)="cardClick.emit()"
      (menuClick)="menuOpen.emit($event)"
    />
    <ng-template #badgeTpl>
      @if (agent().forkedFromId) {
        <span class="fork-badge" pTooltip="Forké depuis un agent partagé" tooltipPosition="top">fork</span>
      }
      <span class="card-percentage" [attr.data-severity]="percentageSeverity()" pTooltip="Réussite d'extraction" tooltipPosition="right">{{ agent().percentage }}%</span>
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
  styleUrl: './agent-card.component.scss',
})
export class AgentCardComponent {
  agent = input.required<Agent>();
  layout = input<'grid' | 'list'>('grid');

  cardClick = output<void>();
  menuOpen = output<MouseEvent>();

  percentageSeverity = computed(() => {
    const p = this.agent().percentage;
    if (p >= 70) return 'success';
    if (p >= 40) return 'warn';
    return 'danger';
  });
}

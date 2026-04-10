import { Component, input, output, computed } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { ItemCardComponent, ItemCardData } from '../item-card/item-card.component';

export interface Agent extends ItemCardData {
  percentage: number;
  forkedFromId: string | null;
  schemaData: Record<string, unknown> | null;
  activeVersionId: string | null;
  deletedAt?: string | null;
  usedInFlows: boolean;
}

@Component({
  selector: 'app-agent-card',
  imports: [TooltipModule, TagModule, ItemCardComponent],
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
        <p-tag value="fork" severity="secondary" [rounded]="true" class="badge-xs" pTooltip="Forké depuis un agent partagé" tooltipPosition="top" />
      }
      @if (!agent().usedInFlows) {
        <p-tag value="inutilisé" severity="warn" [rounded]="true" class="badge-xs" pTooltip="Cet agent n'est utilisé dans aucun flow" tooltipPosition="top" />
      }
      <p-tag [value]="agent().percentage + '%'" [severity]="percentageSeverity()" [rounded]="true" class="badge-xs" pTooltip="Réussite d'extraction" tooltipPosition="right" />
    </ng-template>
  `,
  styles: `
    :host ::ng-deep .badge-xs {
      font-size: 0.5625rem;
      padding: 0.1rem 0.4rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
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

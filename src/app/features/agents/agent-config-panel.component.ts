import { Component, input, output, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { Agent } from '../../shared/components/agent-card/agent-card.component';

@Component({
  selector: 'app-agent-config-panel',
  imports: [DatePipe, ButtonModule, DividerModule, TooltipModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title-group">
          <span class="panel-title">{{ agent().name }}</span>
          <span class="panel-badge" [attr.data-severity]="percentageSeverity()">{{ agent().percentage }}%</span>
        </div>
        <div class="panel-header-actions">
          <p-button icon="fa-regular fa-code-branch" severity="secondary" [text]="true" rounded size="small" pTooltip="Versions" tooltipPosition="top" (onClick)="toggleVersions.emit()" />
          <p-button icon="fa-regular fa-xmark" severity="secondary" [text]="true" rounded size="small" (onClick)="close.emit()" />
        </div>
      </div>

      <div class="panel-body">
        <section class="panel-section">
          <span class="section-label">Description</span>
          <p class="section-value">{{ agent().description }}</p>
        </section>

        <p-divider />

        <div class="meta-row">
          <section class="panel-section">
            <span class="section-label">Créateur</span>
            <div class="creator-row">
              <span class="creator-avatar">{{ agent().creator.initials }}</span>
              <span class="section-value">{{ agent().creator.name }}</span>
            </div>
          </section>

          <section class="panel-section">
            <span class="section-label">Créé le</span>
            <span class="section-value">{{ agent().createdAt | date: 'dd/MM/yyyy' }}</span>
          </section>
        </div>

        <p-divider />

        <section class="panel-section">
          <span class="section-label">Configuration</span>
          <div class="config-placeholder">
            <i class="fa-regular fa-gear"></i>
            <span>Aucune configuration disponible</span>
          </div>
        </section>
      </div>
    </div>
  `,
  styleUrl: './agent-config-panel.component.scss',
})
export class AgentConfigPanelComponent {
  agent = input.required<Agent>();
  close = output();
  toggleVersions = output();

  percentageSeverity = computed(() => {
    const p = this.agent().percentage;
    if (p >= 70) return 'success';
    if (p >= 40) return 'warn';
    return 'danger';
  });
}

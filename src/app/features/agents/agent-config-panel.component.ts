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
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 1rem;
      border-bottom: 1px solid var(--surface-border);
      flex-shrink: 0;
    }

    .panel-header-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-shrink: 0;
    }

    .panel-title-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }

    .panel-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--p-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .panel-badge {
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      border-radius: 2rem;
      white-space: nowrap;
      flex-shrink: 0;

      &[data-severity='success'] { background: var(--green-color-200); border: 1px solid var(--green-color-300); color: var(--green-color-700); }
      &[data-severity='warn']    { background: var(--yellow-color-200); border: 1px solid var(--yellow-color-300); color: var(--yellow-color-700); }
      &[data-severity='danger']  { background: var(--red-color-200); border: 1px solid var(--red-color-300); color: var(--red-color-700); }
    }

    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .panel-section {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .meta-row {
      display: flex;
      gap: 2rem;
    }

    .section-label {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--p-text-muted-color);
      text-transform: uppercase;
      letter-spacing: 0.025rem;
    }

    .section-value {
      font-size: 0.8125rem;
      color: var(--p-text-color);
      line-height: 1.5;
    }

    .creator-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .creator-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 100%;
      background: var(--primary-color-100);
      color: var(--primary-color-700);
      font-size: 0.5rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .config-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem;
      border-radius: var(--radius-l);
      background: var(--background-color-50);
      color: var(--p-text-muted-color);
      font-size: 0.8125rem;

      i { font-size: 1.25rem; }
    }
  `,
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

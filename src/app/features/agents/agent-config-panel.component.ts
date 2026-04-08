import { Component, input, output, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Agent } from '../../shared/components/agent-card/agent-card.component';
import { MapperComponent } from '../../shared/components/mapper/mapper';
import { UserAvatarComponent } from '../../shared/components/user-avatar/user-avatar.component';
import { OrgAvatarComponent } from '../../shared/components/org-avatar/org-avatar.component';
import { AgentService } from '../../core/services/agent.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

@Component({
  selector: 'app-agent-config-panel',
  imports: [DatePipe, FormsModule, ButtonModule, InputTextModule, TextareaModule, DividerModule, TooltipModule, MapperComponent, UserAvatarComponent, OrgAvatarComponent],
  template: `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title-group">
          @if (editingMeta()) {
            <input
              class="panel-title-input"
              pInputText
              pSize="small"
              [(ngModel)]="editName"
              placeholder="Nom de l'agent"
              (keyup.enter)="saveMeta()"
              (keyup.escape)="cancelEdit()"
            />
          } @else {
            <span class="panel-title">{{ agent().name }}</span>
          }
          <span class="panel-badge" [attr.data-severity]="percentageSeverity()">{{ agent().percentage }}%</span>
        </div>
        <div class="panel-header-actions">
          @if (editingMeta()) {
            <p-button icon="fa-regular fa-xmark" severity="secondary" [text]="true" rounded size="small" pTooltip="Annuler" tooltipPosition="top" (onClick)="cancelEdit()" />
            <p-button icon="fa-regular fa-check" severity="success" [text]="true" rounded size="small" pTooltip="Sauvegarder" tooltipPosition="top" [loading]="savingMeta()" (onClick)="saveMeta()" />
          } @else {
            <p-button icon="fa-regular fa-download" severity="secondary" [text]="true" rounded size="small" pTooltip="Télécharger" tooltipPosition="top" (onClick)="exportAgent()" />
            @if (!readonly()) {
              <p-button icon="fa-regular fa-pen" severity="secondary" [text]="true" rounded size="small" pTooltip="Modifier" tooltipPosition="top" (onClick)="startEdit()" />
              <p-button icon="fa-regular fa-code-branch" severity="secondary" [text]="true" rounded size="small" pTooltip="Versions" tooltipPosition="top" (onClick)="toggleVersions.emit()" />
            }
            <p-button icon="fa-regular fa-xmark" severity="secondary" [text]="true" rounded size="small" (onClick)="close.emit()" />
          }
        </div>
      </div>

      <div class="panel-body">
        <section class="panel-section">
          <span class="section-label">Description</span>
          @if (editingMeta()) {
            <textarea
              pTextarea
              pSize="small"
              [(ngModel)]="editDescription"
              placeholder="Description de l'agent…"
              rows="3"
              class="meta-textarea"
              (keyup.escape)="cancelEdit()"
            ></textarea>
          } @else {
            <p class="section-value">{{ agent().description || '—' }}</p>
          }
        </section>

        <p-divider />

        <div class="meta-row">
          <section class="panel-section">
            <span class="section-label">Créateur</span>
            <div class="creator-row">
              @if (agent().creator.shape === 'org') {
                <app-org-avatar [initials]="agent().creator.initials" size="1.25rem" fontSize="0.4375rem" />
              } @else {
                <span class="creator-avatar"><app-user-avatar [userId]="agent().creator.id" [initials]="agent().creator.initials" /></span>
              }
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
          <div class="section-header">
            <span class="section-label">Configuration</span>
            @if (!readonly()) {
              <p-button
                label="Enregistrer"
                icon="fa-regular fa-floppy-disk"
                severity="secondary"
                size="small"
                rounded
                [loading]="saving()"
                (onClick)="save()"
              />
            }
          </div>

          <app-mapper
            [json]="currentSchema"
            [root]="schemaRoot()"
            [isRoot]="true"
            [readonly]="readonly()"
            label="Schéma de données"
            (jsonChange)="onSchemaChange($event)"
          />
        </section>
      </div>
    </div>
  `,
  styleUrl: './agent-config-panel.component.scss',
})
export class AgentConfigPanelComponent {
  private readonly agentService = inject(AgentService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly messageService = inject(MessageService);

  agent = input.required<Agent>();
  readonly = input(false);
  close = output();
  toggleVersions = output();
  agentUpdated = output<{ name: string; description: string }>();
  versionSaved = output<void>();

  readonly saving = signal(false);
  readonly savingMeta = signal(false);
  readonly editingMeta = signal(false);

  editName = '';
  editDescription = '';
  currentSchema: Record<string, unknown> = {};

  schemaRoot = computed(() =>
    this.agent().name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'SCHEMA'
  );

  percentageSeverity = computed(() => {
    const p = this.agent().percentage;
    if (p >= 70) return 'success';
    if (p >= 40) return 'warn';
    return 'danger';
  });

  constructor() {
    effect(() => {
      // Reset edit mode and schema when the selected agent changes
      const agent = this.agent();
      this.editingMeta.set(false);
      this.currentSchema = { ...(agent.schemaData ?? {}) };
    });
  }

  startEdit(): void {
    this.editName = this.agent().name;
    this.editDescription = this.agent().description;
    this.editingMeta.set(true);
  }

  cancelEdit(): void {
    this.editingMeta.set(false);
  }

  saveMeta(): void {
    const orgId = this.contextSwitcher.selectedId();
    const agentId = this.agent().id;
    const name = this.editName.trim();
    if (!orgId || !agentId || !name || this.savingMeta()) return;

    this.savingMeta.set(true);
    this.agentService.updateAgent(orgId, agentId, name, this.editDescription.trim()).subscribe({
      next: (updated) => {
        this.savingMeta.set(false);
        this.editingMeta.set(false);
        this.agentUpdated.emit({ name: updated.name, description: updated.description });
        this.messageService.add({ severity: 'success', summary: 'Modifié', detail: 'Les informations ont été mises à jour.' });
      },
      error: () => {
        this.savingMeta.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La modification a échoué.' });
      },
    });
  }

  exportAgent(): void {
    const orgId = this.contextSwitcher.selectedId();
    const agent = this.agent();
    if (!orgId) return;

    const exportCall = agent.isOwned
      ? this.agentService.exportAgent(orgId, agent.id)
      : this.agentService.exportSharedAgent(orgId, agent.id);

    exportCall.subscribe({
      next: (response) => {
        const blob = new Blob([response.body!], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${agent.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.messageService.add({ severity: 'success', summary: 'Téléchargement réussi', detail: `"${agent.name}" a été téléchargé.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de télécharger l\'agent.' }),
    });
  }

  onSchemaChange(json: Record<string, unknown>): void {
    this.currentSchema = json;
  }

  save(): void {
    const orgId = this.contextSwitcher.selectedId();
    const agentId = this.agent().id;
    if (!orgId || !agentId || this.saving()) return;

    this.saving.set(true);
    this.agentService.saveAgentVersion(orgId, agentId, this.currentSchema).subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'success', summary: 'Sauvegardé', detail: 'La configuration a été sauvegardée.' });
        this.versionSaved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La sauvegarde a échoué.' });
      },
    });
  }
}

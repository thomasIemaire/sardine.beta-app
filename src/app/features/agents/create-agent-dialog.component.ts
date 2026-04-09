import { Component, inject, model, output, signal, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Dialog } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { AgentService } from '../../core/services/agent.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';
import { DropZoneComponent } from '../../shared/components/drop-zone/drop-zone.component';
import type { Agent } from '../../shared/components/agent-card/agent-card.component';

@Component({
  selector: 'app-create-agent-dialog',
  imports: [FormsModule, ButtonModule, InputTextModule, TextareaModule, Dialog, DividerModule, DropZoneComponent],
  template: `
    <p-dialog
      header="Nouvel agent"
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '480px' }"
      (onHide)="reset()"
    >
      <div class="cf-form">
        <div class="cf-field">
          <label class="cf-label">Nom <span class="cf-required">*</span></label>
          <input pInputText pSize="small" [(ngModel)]="name" placeholder="Mon agent" (keyup.enter)="submit()" autofocus [disabled]="!!importedFile()" />
        </div>
        <div class="cf-field">
          <label class="cf-label">Description <span class="cf-hint">(optionnel)</span></label>
          <textarea pTextarea pSize="small" [(ngModel)]="description" placeholder="Décrivez le rôle de cet agent…" rows="3" style="resize: none; width: 100%;" [disabled]="!!importedFile()"></textarea>
        </div>

        <p-divider align="center" type="dashed">
          <span class="divider-text">Ou importer un agent</span>
        </p-divider>

        <div class="cf-field">
          <div class="import-zone">
            @if (importedFile()) {
              <div class="file-info">
                <span class="file-info__icon"><i class="fa-regular fa-file-code"></i></span>
                <div class="file-info__meta">
                  <span class="file-info__name">{{ importedFile()!.name }}</span>
                  <span class="file-info__size">{{ formatSize(importedFile()!.size) }}</span>
                </div>
                <button type="button" class="remove-file" (click)="removeFile($event)">
                  <i class="fa-regular fa-xmark"></i>
                </button>
              </div>
            } @else {
              <app-drop-zone 
                accept=".json" 
                label="Importer un agent"
                hint="Glissez-déposez un fichier JSON ou cliquez pour sélectionner"
                (filesDropped)="onFilesDropped($event)" />
            }
          </div>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" [text]="true" size="small" rounded (onClick)="visible.set(false)" />
        <p-button [label]="importedFile() ? 'Importer' : 'Créer'" icon="fa-regular fa-plus" size="small" rounded [loading]="loading()" [disabled]="importedFile() ? false : !name.trim()" (onClick)="submit()" />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    .cf-form { display: flex; flex-direction: column; gap: 1rem; padding: 0.25rem 0; }
    .cf-field { display: flex; flex-direction: column; gap: 0.375rem; }
    .cf-label { font-size: 0.8125rem; font-weight: 500; color: var(--p-text-color); }
    .cf-required { color: var(--p-danger-color, #ef4444); margin-left: 2px; }
    .cf-hint { font-size: 0.75rem; font-weight: 400; color: var(--p-text-muted-color); }
    input, textarea { width: 100%; box-sizing: border-box; }
    .import-zone {
      position: relative;
    }
    .file-info {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.625rem 0.75rem;
      background: var(--p-surface-ground);
      border: 1px solid var(--p-surface-border);
      border-radius: 8px;
      width: 100%;
      box-sizing: border-box;
    }
    .file-info__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border-radius: 6px;
      background: color-mix(in srgb, var(--p-primary-500) 12%, transparent);
      color: var(--p-primary-500);
      font-size: 0.875rem;
      flex-shrink: 0;
    }
    .file-info__meta {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
    }
    .file-info__name {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--p-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-info__size {
      font-size: 0.6875rem;
      color: var(--p-text-muted-color);
    }
    .remove-file {
      margin-left: auto;
      background: none;
      border: none;
      color: var(--p-text-muted-color);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
    }
    .remove-file:hover {
      background: color-mix(in srgb, var(--p-red-500) 12%, transparent);
      color: var(--p-red-500);
    }
    .divider-text {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--p-text-muted-color);
      background: var(--p-surface-ground);
      padding: 0 0.75rem;
    }
  `,
})
export class CreateAgentDialogComponent {
  private readonly agentService = inject(AgentService);
  private readonly contextSwitcher = inject(ContextSwitcherService);

  readonly visible = model(false);
  readonly created = output<Agent>();

  name = '';
  description = '';
  readonly loading = signal(false);
  readonly importedFile = signal<File | null>(null);

  submit(): void {
    if (this.loading()) return;
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    if (this.importedFile()) {
      this.loading.set(true);
      this.agentService.importAgent(orgId, this.importedFile()!).subscribe({
        next: (agent) => {
          this.loading.set(false);
          this.visible.set(false);
          this.created.emit(agent);
        },
        error: () => this.loading.set(false),
      });
    } else {
      if (!this.name.trim()) return;
      this.loading.set(true);
      this.agentService.createAgent(orgId, this.name.trim(), this.description.trim()).subscribe({
        next: (agent) => {
          this.loading.set(false);
          this.visible.set(false);
          this.created.emit(agent);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  reset(): void {
    this.name = '';
    this.description = '';
    this.loading.set(false);
    this.importedFile.set(null);
  }

  onFilesDropped(files: File[]): void {
    if (files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  private handleFile(file: File): void {
    if (!file.name.endsWith('.json')) {
      return;
    }
    this.importedFile.set(file);
    this.name = '';
    this.description = '';
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.importedFile.set(null);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }
}

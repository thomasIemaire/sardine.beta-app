import { Component, inject, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Dialog } from 'primeng/dialog';
import { FlowService } from '../../core/services/flow.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';
import type { Flow } from '../../shared/components/flow-card/flow-card.component';

@Component({
  selector: 'app-create-flow-dialog',
  imports: [FormsModule, ButtonModule, InputTextModule, TextareaModule, Dialog],
  template: `
    <p-dialog
      header="Nouveau flow"
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
          <input pInputText pSize="small" [(ngModel)]="name" placeholder="Mon flow" (keyup.enter)="submit()" autofocus />
        </div>
        <div class="cf-field">
          <label class="cf-label">Description <span class="cf-hint">(optionnel)</span></label>
          <textarea pTextarea pSize="small" [(ngModel)]="description" placeholder="Décrivez le rôle de ce flow…" rows="3" style="resize: none; width: 100%;"></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" [text]="true" size="small" rounded (onClick)="visible.set(false)" />
        <p-button label="Créer" icon="fa-regular fa-plus" size="small" rounded [loading]="loading()" [disabled]="!name.trim()" (onClick)="submit()" />
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
  `,
})
export class CreateFlowDialogComponent {
  private readonly flowService = inject(FlowService);
  private readonly contextSwitcher = inject(ContextSwitcherService);

  readonly visible = model(false);
  readonly created = output<Flow>();

  name = '';
  description = '';
  readonly loading = signal(false);

  submit(): void {
    if (!this.name.trim() || this.loading()) return;
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    this.loading.set(true);
    this.flowService.createFlow(orgId, this.name.trim(), this.description.trim()).subscribe({
      next: (flow) => {
        this.loading.set(false);
        this.visible.set(false);
        this.created.emit(flow);
      },
      error: () => this.loading.set(false),
    });
  }

  reset(): void {
    this.name = '';
    this.description = '';
    this.loading.set(false);
  }
}

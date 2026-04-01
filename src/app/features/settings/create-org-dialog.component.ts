import { Component, inject, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { OrganizationService, ApiOrganization } from '../../core/services/organization.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

@Component({
  selector: 'app-create-org-dialog',
  imports: [FormsModule, DialogModule, ButtonModule, InputTextModule],
  template: `
    <p-dialog
      [(visible)]="visible"
      header="Nouvelle organisation cliente"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '480px' }"
      (onHide)="reset()"
    >
      <div class="dialog-body">
        <div class="field">
          <label class="field-label">Nom <span class="required">*</span></label>
          <input pInputText pSize="small" [(ngModel)]="name" placeholder="Ex : Clinique Alpha" [disabled]="loading()" (keyup.enter)="submit()" />
        </div>
        <div class="field">
          <label class="field-label">Référence externe <span class="optional">(optionnel)</span></label>
          <input pInputText pSize="small" [(ngModel)]="externalRef" placeholder="Ex : CLI-001" [disabled]="loading()" />
        </div>
        <div class="field">
          <label class="field-label">Email de contact <span class="optional">(optionnel)</span></label>
          <input pInputText pSize="small" type="email" [(ngModel)]="contactEmail" placeholder="contact@exemple.fr" [disabled]="loading()" />
        </div>

        @if (error()) {
          <div class="dialog-error">
            <i class="fa-regular fa-triangle-exclamation"></i>
            {{ error() }}
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" size="small" rounded [text]="true" [disabled]="loading()" (onClick)="visible.set(false)" />
        <p-button label="Créer" size="small" rounded [disabled]="!name.trim()" [loading]="loading()" (onClick)="submit()" />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    .dialog-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.25rem 0;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;

      input { width: 100%; }
    }

    .field-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--p-text-color);
    }

    .required { color: var(--p-primary-500); }
    .optional { font-weight: 400; color: var(--p-text-muted-color); font-size: 0.75rem; }

    .dialog-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-m, 8px);
      background: var(--red-color-50, #fef2f2);
      border: 1px solid var(--red-color-200, #fecaca);
      font-size: 0.8125rem;
      color: var(--red-color-700, #b91c1c);
    }
  `,
})
export class CreateOrgDialogComponent {
  private readonly orgService = inject(OrganizationService);
  private readonly contextSwitcher = inject(ContextSwitcherService);

  readonly visible = model(false);
  readonly created = output<ApiOrganization>();

  name = '';
  externalRef = '';
  contactEmail = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org || !this.name.trim()) return;
    this.loading.set(true);
    this.error.set(null);
    this.orgService.createOrganization({
      name: this.name.trim(),
      parent_org_id: org.id,
      external_reference: this.externalRef.trim() || null,
      contact_email: this.contactEmail.trim() || null,
    }).subscribe({
      next: (newOrg) => {
        this.loading.set(false);
        this.visible.set(false);
        this.created.emit(newOrg);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Une erreur est survenue. Réessayez plus tard.');
      },
    });
  }

  reset(): void {
    this.name = '';
    this.externalRef = '';
    this.contactEmail = '';
    this.loading.set(false);
    this.error.set(null);
  }
}

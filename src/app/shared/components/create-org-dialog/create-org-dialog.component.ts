import { Component, inject, model, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { OrganizationService, ApiOrganization } from '../../../core/services/organization.service';
import { ContextSwitcherService } from '../../../core/layout/context-switcher/context-switcher.service';

interface OrgOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-create-org-dialog',
  imports: [FormsModule, DialogModule, ButtonModule, InputTextModule, SelectModule],
  template: `
    <p-dialog
      [(visible)]="visible"
      header="Nouvelle organisation"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '440px' }"
      (onShow)="onOpen()"
      (onHide)="reset()"
    >
      <div class="dialog-body">
        <div class="dialog-field">
          <label class="dialog-label" for="org-name">Nom <span class="dialog-required">*</span></label>
          <input
            id="org-name"
            pInputText
            pSize="small"
            [(ngModel)]="name"
            placeholder="Mon organisation"
            [disabled]="loading()"
            (keyup.enter)="submit()"
          />
        </div>

        <div class="dialog-field">
          <label class="dialog-label" for="org-ref">Référence externe <span class="dialog-hint">(optionnel)</span></label>
          <input
            id="org-ref"
            pInputText
            pSize="small"
            [(ngModel)]="externalRef"
            placeholder="ERP-001"
            [disabled]="loading()"
          />
        </div>

        <div class="dialog-field">
          <label class="dialog-label">Distributeur <span class="dialog-hint">(optionnel)</span></label>
          <p-select
            [(ngModel)]="distributorOrgId"
            [options]="ownedOrgOptions()"
            optionLabel="label"
            optionValue="value"
            placeholder="Aucun"
            [showClear]="true"
            [filter]="ownedOrgOptions().length > 5"
            filterPlaceholder="Rechercher…"
            size="small"
            [disabled]="loading() || loadingOrgs()"
            fluid
            appendTo="body"
          />
        </div>

        <div class="dialog-field">
          <label class="dialog-label">Organisation parente <span class="dialog-hint">(optionnel)</span></label>
          <p-select
            [(ngModel)]="parentOrgId"
            [options]="ownedOrgOptions()"
            optionLabel="label"
            optionValue="value"
            placeholder="Aucun"
            [showClear]="true"
            [filter]="ownedOrgOptions().length > 5"
            filterPlaceholder="Rechercher…"
            size="small"
            [disabled]="loading() || loadingOrgs()"
            fluid
            appendTo="body"
          />
        </div>

        @if (error()) {
          <div class="dialog-error">
            <i class="fa-regular fa-triangle-exclamation"></i>
            {{ error() }}
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <p-button
          label="Annuler"
          severity="secondary"
          size="small"
          rounded
          [text]="true"
          [disabled]="loading()"
          (onClick)="visible.set(false)"
        />
        <p-button
          label="Créer"
          size="small"
          rounded
          [disabled]="!name.trim()"
          [loading]="loading()"
          (onClick)="submit()"
        />
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

    .dialog-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;

      input { width: 100%; }
    }

    .dialog-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--p-text-color);
    }

    .dialog-required {
      color: var(--p-danger-color, #ef4444);
      margin-left: 0.125rem;
    }

    .dialog-hint {
      font-weight: 400;
      color: var(--p-text-muted-color);
    }

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

      i { font-size: 0.8125rem; }
    }
  `,
})
export class CreateOrgDialogComponent {
  private readonly orgService = inject(OrganizationService);
  private readonly contextSwitcher = inject(ContextSwitcherService);

  readonly visible = model(false);
  readonly created = output<void>();

  name = '';
  externalRef = '';
  distributorOrgId: string | null = null;
  parentOrgId: string | null = null;

  readonly loading = signal(false);
  readonly loadingOrgs = signal(false);
  readonly error = signal<string | null>(null);
  readonly ownedOrgOptions = signal<OrgOption[]>([]);

  onOpen(): void {
    this.loadingOrgs.set(true);
    this.orgService.getOwnedOrganizations().subscribe({
      next: (orgs) => {
        this.ownedOrgOptions.set(orgs.map((o) => ({ label: o.name, value: o.id })));
        this.loadingOrgs.set(false);
      },
      error: () => this.loadingOrgs.set(false),
    });
  }

  submit(): void {
    if (!this.name.trim() || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    this.orgService.createOrganization({
      name: this.name.trim(),
      external_reference: this.externalRef.trim() || null,
      distributor_org_id: this.distributorOrgId || null,
      parent_org_id: this.parentOrgId || null,
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.visible.set(false);
        this.contextSwitcher.loadOrganizations();
        this.created.emit();
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 409) {
          this.error.set('Une organisation avec ce nom existe déjà.');
        } else {
          this.error.set('Une erreur est survenue. Réessayez plus tard.');
        }
      },
    });
  }

  reset(): void {
    this.name = '';
    this.externalRef = '';
    this.distributorOrgId = null;
    this.parentOrgId = null;
    this.error.set(null);
    this.loading.set(false);
    this.ownedOrgOptions.set([]);
  }
}

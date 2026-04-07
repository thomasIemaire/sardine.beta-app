import { Component, inject, model, output, signal, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { OrganizationService } from '../../core/services/organization.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

interface MemberEntry {
  email: string;
  password: string;
}

@Component({
  selector: 'app-invite-members-dialog',
  imports: [FormsModule, DialogModule, ButtonModule, InputTextModule, SelectButtonModule],
  template: `
    <p-dialog
      [(visible)]="visible"
      header="Ajouter des membres"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '600px' }"
      (onHide)="reset()"
    >
      <div class="dialog-body">

        <!-- Mode toggle -->
        <p-selectbutton
          [options]="modeOptions"
          [ngModel]="mode"
          (ngModelChange)="setMode($event)"
          optionValue="value"
          size="small"
          fluid
        >
          <ng-template pTemplate="item" let-item>
            <i [class]="item.icon"></i>
            {{ item.label }}
          </ng-template>
        </p-selectbutton>

        <!-- ── Manuel ── -->
        @if (mode === 'manual') {
          <div class="manual-block">
          <div class="rows-header">
            <span class="col-label">Email</span>
            <span class="col-label">Mot de passe <span class="col-optional">(optionnel si déjà inscrit)</span></span>
            <span class="col-spacer"></span>
          </div>
          <div class="rows-list">
            @for (row of rows(); track $index; let i = $index) {
              <div class="member-row">
                <input
                  pInputText
                  pSize="small"
                  type="email"
                  placeholder="email@exemple.fr"
                  [(ngModel)]="row.email"
                  [disabled]="loading()"
                />
                <input
                  pInputText
                  pSize="small"
                  type="password"
                  placeholder="Laisser vide si déjà inscrit"
                  [(ngModel)]="row.password"
                  [disabled]="loading()"
                />
                <p-button
                  icon="fa-regular fa-xmark"
                  severity="secondary"
                  [text]="true"
                  size="small"
                  rounded
                  [disabled]="rows().length === 1 || loading()"
                  (onClick)="removeRow(i)"
                />
              </div>
            }
          </div>
          <p-button
            label="Ajouter une ligne"
            icon="fa-regular fa-plus"
            [text]="true"
            severity="secondary"
            size="small"
            rounded
            [disabled]="loading()"
            (onClick)="addRow()"
          />
          </div>
        }

        <!-- ── CSV ── -->
        @if (mode === 'csv') {
          <div
            class="drop-zone"
            [class.is-dragging]="dragging()"
            [class.has-data]="csvRows().length > 0"
            (dragover)="$event.preventDefault(); dragging.set(true)"
            (dragleave)="dragging.set(false)"
            (drop)="onDrop($event)"
            (click)="fileInput.click()"
          >
            @if (csvRows().length === 0) {
              <i class="fa-regular fa-file-arrow-up drop-zone__icon"></i>
              <span class="drop-zone__label">Glissez un fichier ici ou cliquez pour parcourir</span>
              <span class="drop-zone__hint">CSV ou TSV · colonnes : <code>email</code>, <code>password</code></span>
            } @else {
              <i class="fa-regular fa-circle-check drop-zone__icon drop-zone__icon--ok"></i>
              <span class="drop-zone__label">{{ csvRows().length }} membre{{ csvRows().length > 1 ? 's' : '' }} détecté{{ csvRows().length > 1 ? 's' : '' }}</span>
              <span class="drop-zone__hint">Cliquez pour remplacer le fichier</span>
            }
          </div>
          <input #fileInput type="file" accept=".csv,.tsv,.txt" style="display:none" (change)="onFile($event)" />

          @if (csvError()) {
            <div class="csv-error">
              <i class="fa-regular fa-triangle-exclamation"></i>
              {{ csvError() }}
            </div>
          }

          @if (csvRows().length > 0) {
            <div class="csv-preview">
              @for (row of csvRows().slice(0, 6); track $index) {
                <div class="csv-preview__row">
                  <i class="fa-regular fa-user"></i>
                  <span class="csv-preview__email">{{ row.email }}</span>
                </div>
              }
              @if (csvRows().length > 6) {
                <div class="csv-preview__more">
                  + {{ csvRows().length - 6 }} autre{{ csvRows().length - 6 > 1 ? 's' : '' }}
                </div>
              }
            </div>
          }
        }

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
          [label]="submitLabel"
          size="small"
          rounded
          [disabled]="validCount === 0"
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

    /* ── Manual rows ── */
    .manual-block {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .rows-header {
      display: grid;
      grid-template-columns: 1fr 1fr 2rem;
      gap: 0.5rem;
      padding: 0 0.25rem;
    }

    .col-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--p-text-muted-color);
    }

    .col-optional {
      font-weight: 400;
      font-style: italic;
    }

    .col-spacer { width: 2rem; }

    .rows-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 240px;
      overflow-y: auto;
    }

    .member-row {
      display: grid;
      grid-template-columns: 1fr 1fr 2rem;
      gap: 0.5rem;
      align-items: center;

      input { width: 100%; }
    }

    /* ── Drop zone ── */
    .drop-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 2rem 1.5rem;
      border: 1.5px dashed var(--surface-border);
      border-radius: var(--radius-m, 8px);
      background: var(--background-color-50);
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;

      &:hover, &.is-dragging {
        border-color: var(--p-primary-500);
        background: var(--primary-color-50, #eff6ff);
      }

      &.has-data {
        border-style: solid;
        border-color: var(--p-primary-500);
      }
    }

    .drop-zone__icon {
      font-size: 1.75rem;
      color: var(--p-text-muted-color);
      margin-bottom: 0.25rem;

      &--ok { color: var(--p-primary-500); }
    }

    .drop-zone__label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--p-text-color);
    }

    .drop-zone__hint {
      font-size: 0.75rem;
      color: var(--p-text-muted-color);

      code {
        font-family: monospace;
        background: var(--background-color-100);
        padding: 0.1rem 0.3rem;
        border-radius: 3px;
      }
    }

    .csv-error {
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

    /* ── CSV preview ── */
    .csv-preview {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--surface-border);
      border-radius: var(--radius-m, 8px);
      overflow: hidden;
    }

    .csv-preview__row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.4rem 0.75rem;
      border-bottom: 1px solid var(--surface-border);
      font-size: 0.8125rem;

      &:last-child { border-bottom: none; }

      i { font-size: 0.75rem; color: var(--p-text-muted-color); }
    }

    .csv-preview__email {
      color: var(--p-text-color);
    }

    .csv-preview__more {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
      font-style: italic;
    }

    /* ── Error ── */
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
export class InviteMembersDialogComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly orgService = inject(OrganizationService);
  private readonly contextSwitcher = inject(ContextSwitcherService);

  readonly visible = model(false);
  readonly invited = output<void>();

  mode: 'manual' | 'csv' = 'manual';

  readonly modeOptions = [
    { label: 'Saisie manuelle', value: 'manual', icon: 'fa-regular fa-user-plus' },
    { label: 'Importer un fichier', value: 'csv', icon: 'fa-regular fa-file-csv' },
  ];
  readonly rows = signal<MemberEntry[]>([{ email: '', password: '' }]);
  readonly csvRows = signal<MemberEntry[]>([]);
  readonly csvError = signal<string | null>(null);
  readonly dragging = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  get validCount(): number {
    const list = this.mode === 'manual' ? this.rows() : this.csvRows();
    return list.filter((r) => r.email.trim()).length;
  }

  get submitLabel(): string {
    const n = this.validCount;
    return n > 0 ? `Ajouter ${n} membre${n > 1 ? 's' : ''}` : 'Ajouter';
  }

  setMode(mode: 'manual' | 'csv'): void {
    this.mode = mode;
    this.error.set(null);
  }

  addRow(): void {
    this.rows.update((r) => [...r, { email: '', password: '' }]);
  }

  removeRow(i: number): void {
    this.rows.update((r) => r.filter((_, idx) => idx !== i));
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.parseFile(file);
    (event.target as HTMLInputElement).value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.parseFile(file);
  }

  private parseFile(file: File): void {
    this.csvError.set(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = this.parseCSV(text);
      if (!rows.length) {
        this.csvError.set('Aucune donnée valide. Vérifiez le format : une colonne "email" et une colonne "password".');
      } else {
        this.csvRows.set(rows);
      }
    };
    reader.readAsText(file);
  }

  private parseCSV(text: string): MemberEntry[] {
    const lines = text.trim().split(/\r?\n/);
    const result: MemberEntry[] = [];
    for (const line of lines) {
      const parts = line.split(/[,;|\t]/).map((p) => p.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 2) {
        const [email, password] = parts;
        if (email && password && email.toLowerCase() !== 'email') {
          result.push({ email, password });
        }
      }
    }
    return result;
  }

  submit(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    const list = this.mode === 'manual' ? this.rows() : this.csvRows();
    const members = list.filter((r) => r.email.trim());
    if (!members.length) return;
    this.loading.set(true);
    this.error.set(null);
    this.orgService.inviteMembers(org.id, members).subscribe({
      next: () => {
        this.loading.set(false);
        this.visible.set(false);
        this.invited.emit();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Une erreur est survenue. Réessayez plus tard.');
      },
    });
  }

  reset(): void {
    this.mode = 'manual';
    this.rows.set([{ email: '', password: '' }]);
    this.csvRows.set([]);
    this.csvError.set(null);
    this.dragging.set(false);
    this.loading.set(false);
    this.error.set(null);
  }
}

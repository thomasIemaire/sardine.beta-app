import { Component, HostListener, inject, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Dialog } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { DatasetService, ApiDataset } from '../../../core/services/dataset.service';
import { ContextSwitcherService } from '../../../core/layout/context-switcher/context-switcher.service';

@Component({
  selector: 'app-create-dataset-dialog',
  imports: [FormsModule, ButtonModule, InputTextModule, Dialog, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast position="bottom-right" [life]="4000" />

    <p-dialog
      header="Nouveau dataset"
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '520px' }"
      (onHide)="reset()"
    >
      <div class="cd-form">

        <!-- Name -->
        <div class="cd-field">
          <label class="cd-label">Nom <span class="cd-required">*</span></label>
          <input
            pInputText
            pSize="small"
            [(ngModel)]="name"
            placeholder="Mon dataset"
            (keyup.enter)="submit()"
            autofocus
            style="width: 100%;"
          />
        </div>

        <!-- File zone -->
        <div class="cd-field">
          <label class="cd-label">
            Fichiers PDF
            <span class="cd-hint">(optionnel)</span>
          </label>

          <input #fileInput type="file" accept=".pdf" multiple hidden (change)="onFileInput($event)" />

          <div
            class="cd-drop-zone"
            [class.is-over]="isDragOver()"
            (click)="fileInput.click()"
          >
            <i class="fa-regular fa-cloud-arrow-up cd-drop-icon"></i>
            <span class="cd-drop-label">Glisser-déposer des PDF</span>
            <span class="cd-drop-hint">ou cliquer pour parcourir</span>
          </div>

          @if (files().length > 0) {
            <ul class="cd-file-list">
              @for (f of files(); track f.name) {
                <li class="cd-file-item">
                  <i class="fa-regular fa-file-pdf cd-file-icon"></i>
                  <span class="cd-file-name">{{ f.name }}</span>
                  <span class="cd-file-size">{{ formatSize(f.size) }}</span>
                  <p-button
                    icon="fa-regular fa-xmark"
                    severity="secondary"
                    [text]="true"
                    [rounded]="true"
                    size="small"
                    (onClick)="removeFile(f)"
                  />
                </li>
              }
            </ul>
          }
        </div>

      </div>

      <ng-template pTemplate="footer">
        <p-button
          label="Annuler"
          severity="secondary"
          [text]="true"
          size="small"
          rounded
          (onClick)="visible.set(false)"
        />
        <p-button
          label="Créer"
          icon="fa-regular fa-plus"
          size="small"
          rounded
          [loading]="loading()"
          [disabled]="!name.trim()"
          (onClick)="submit()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    .cd-form { display: flex; flex-direction: column; gap: 1.25rem; padding: .25rem 0; }
    .cd-field { display: flex; flex-direction: column; gap: .375rem; }
    .cd-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
    .cd-required { color: var(--p-danger-color, #ef4444); margin-left: 2px; }
    .cd-hint { font-size: .75rem; font-weight: 400; color: var(--p-text-muted-color); margin-left: .25rem; }

    .cd-drop-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: .25rem;
      padding: 1.5rem .5rem;
      border: 1.5px dashed var(--surface-border);
      border-radius: .625rem;
      cursor: pointer;
      text-align: center;
      user-select: none;
      transition: border-color .15s, background .15s;

      &:hover, &.is-over {
        border-color: var(--p-primary-400);
        background: color-mix(in srgb, var(--p-primary-500) 8%, transparent);
      }
      &.is-over { scale: 1.01; }
    }

    .cd-drop-icon {
      font-size: 1.25rem;
      color: var(--p-text-muted-color);
      .cd-drop-zone:hover &, .is-over .cd-drop-icon { color: var(--p-primary-500); }
    }
    .cd-drop-label { font-size: .6875rem; font-weight: 600; color: var(--p-text-color); }
    .cd-drop-hint  { font-size: .625rem; color: var(--p-text-muted-color); }

    .cd-file-list {
      list-style: none;
      margin: .375rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .cd-file-item {
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .375rem .5rem;
      border-radius: .375rem;
      background: var(--background-color-50);
      border: 1px solid var(--surface-border);
      font-size: .8125rem;
    }

    .cd-file-icon { color: #ef4444; flex-shrink: 0; font-size: .875rem; }
    .cd-file-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cd-file-size { font-size: .6875rem; color: var(--p-text-muted-color); flex-shrink: 0; }
  `,
})
export class CreateDatasetDialogComponent {
  private readonly datasetService  = inject(DatasetService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly messageService  = inject(MessageService);

  readonly visible = model(false);
  readonly created = output<ApiDataset>();

  name = '';
  readonly files    = signal<File[]>([]);
  readonly loading  = signal(false);
  readonly isDragOver = signal(false);

  // ── Drag-and-drop on the host element ──────────────────────────────────────
  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      this.isDragOver.set(false);
    }
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const dropped = Array.from(event.dataTransfer?.files ?? []).filter(f => f.name.endsWith('.pdf'));
    if (dropped.length) this.addFiles(dropped);
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []).filter(f => f.name.endsWith('.pdf'));
    input.value = '';
    if (selected.length) this.addFiles(selected);
  }

  private addFiles(incoming: File[]): void {
    const existing = this.files();
    const merged = [...existing];
    for (const f of incoming) {
      if (!merged.some(e => e.name === f.name && e.size === f.size)) merged.push(f);
    }
    this.files.set(merged);
  }

  removeFile(file: File): void {
    this.files.update(list => list.filter(f => f !== file));
  }

  async submit(): Promise<void> {
    if (this.loading() || !this.name.trim()) return;
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    this.loading.set(true);
    try {
      // 1. Create the dataset
      const dataset = await firstValueFrom(this.datasetService.createDataset(orgId, this.name.trim()));

      // 2. Import each file sequentially
      for (const file of this.files()) {
        await firstValueFrom(this.datasetService.importFile(orgId, dataset.id, file));
      }

      // 3. Fetch the final state (counts updated after import)
      const updated = this.files().length > 0
        ? await firstValueFrom(this.datasetService.getDataset(orgId, dataset.id))
        : dataset;

      this.visible.set(false);
      this.created.emit(updated);
    } catch (err: any) {
      const detail = err?.error?.detail ?? err?.error?.message ?? 'Impossible de créer le dataset.';
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail });
    } finally {
      this.loading.set(false);
    }
  }

  reset(): void {
    this.name = '';
    this.files.set([]);
    this.loading.set(false);
    this.isDragOver.set(false);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }
}

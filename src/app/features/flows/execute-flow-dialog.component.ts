import { Component, model, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { formatFileSize } from '../../core/services/document.service';

export interface ExecuteFlowPayload {
  files: File[];
}

@Component({
  selector: 'app-execute-flow-dialog',
  imports: [ButtonModule, Dialog],
  template: `
    <p-dialog
      header="Exécuter le flow"
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '520px' }"
      (onHide)="reset()"
    >
      <p class="ef-hint">
        Déposez un ou plusieurs documents à traiter par ce flow.
      </p>

      <div
        class="ef-dropzone"
        [class.is-dragging]="isDragging()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        <i class="fa-regular fa-cloud-arrow-up ef-dropzone__icon"></i>
        <span class="ef-dropzone__title">Déposez vos fichiers ici</span>
        <span class="ef-dropzone__sub">ou cliquez pour parcourir</span>
      </div>

      <input
        #fileInput
        type="file"
        multiple
        style="display:none"
        (change)="onFileSelect($event)"
      />

      @if (files().length > 0) {
        <div class="ef-list">
          @for (f of files(); track f.name + '|' + f.size + '|' + f.lastModified) {
            <div class="ef-item">
              <i class="fa-regular fa-file ef-item__icon"></i>
              <div class="ef-item__info">
                <span class="ef-item__name" [title]="f.name">{{ f.name }}</span>
                <span class="ef-item__meta">{{ sizeLabel(f.size) }}</span>
              </div>
              <button type="button" class="ef-item__remove" (click)="remove($index)" aria-label="Retirer">
                <i class="fa-regular fa-xmark"></i>
              </button>
            </div>
          }
        </div>
      }

      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" [text]="true" size="small" rounded (onClick)="visible.set(false)" />
        <p-button
          label="Exécuter"
          icon="fa-regular fa-play"
          size="small"
          rounded
          [disabled]="files().length === 0"
          (onClick)="submit()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    :host { display: contents; }

    .ef-hint {
      margin: 0 0 0.875rem;
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
    }

    .ef-dropzone {
      border: 1.5px dashed var(--p-content-border-color);
      border-radius: 0.625rem;
      padding: 1.75rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
      background: var(--p-content-background);

      &:hover, &.is-dragging {
        border-color: var(--p-primary-color);
        background: color-mix(in srgb, var(--p-primary-color) 5%, var(--p-content-background));
      }

      &__icon {
        font-size: 1.75rem;
        color: var(--p-text-muted-color);
      }
      &__title {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--p-text-color);
      }
      &__sub {
        font-size: 0.75rem;
        color: var(--p-text-muted-color);
      }
    }

    .ef-list {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      margin-top: 0.875rem;
      max-height: 220px;
      overflow-y: auto;
    }

    .ef-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      background: var(--p-content-hover-background);

      &__icon { color: var(--p-text-muted-color); font-size: 0.9375rem; }

      &__info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }
      &__name {
        font-size: 0.8125rem;
        color: var(--p-text-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      &__meta {
        font-size: 0.6875rem;
        color: var(--p-text-muted-color);
      }

      &__remove {
        background: none;
        border: none;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 999px;
        color: var(--p-text-muted-color);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background: var(--p-content-background);
          color: var(--p-text-color);
        }
      }
    }
  `,
})
export class ExecuteFlowDialogComponent {
  readonly visible = model(false);
  readonly execute = output<ExecuteFlowPayload>();

  readonly files = signal<File[]>([]);
  readonly isDragging = signal(false);
  private dragCounter = 0;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter++;
    this.isDragging.set(true);
  }

  onDragLeave(_event: DragEvent): void {
    this.dragCounter--;
    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      this.isDragging.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    this.dragCounter = 0;
    const dropped = Array.from(event.dataTransfer?.files ?? []);
    if (dropped.length) this.addFiles(dropped);
  }

  onFileSelect(event: Event): void {
    const selected = Array.from((event.target as HTMLInputElement).files ?? []);
    if (selected.length) this.addFiles(selected);
    (event.target as HTMLInputElement).value = '';
  }

  private addFiles(newFiles: File[]): void {
    this.files.update((list) => {
      // Dédoublonne sur (name, size, lastModified).
      const seen = new Set(list.map((f) => `${f.name}|${f.size}|${f.lastModified}`));
      const merged = [...list];
      for (const f of newFiles) {
        const key = `${f.name}|${f.size}|${f.lastModified}`;
        if (!seen.has(key)) {
          merged.push(f);
          seen.add(key);
        }
      }
      return merged;
    });
  }

  remove(index: number): void {
    this.files.update((list) => list.filter((_, i) => i !== index));
  }

  submit(): void {
    if (this.files().length === 0) return;
    this.execute.emit({ files: this.files() });
    this.visible.set(false);
  }

  reset(): void {
    this.files.set([]);
    this.dragCounter = 0;
    this.isDragging.set(false);
  }

  sizeLabel(size: number): string {
    return formatFileSize(size);
  }
}

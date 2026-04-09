import { Component, HostListener, inject, input, output, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
    selector: 'app-drop-zone',
    imports: [ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="bottom-right" [life]="4000" />

        <div
            class="drop-zone"
            [class.is-over]="isDragOver()"
            [class.is-uploading]="isUploading()"
            (click)="!isUploading() && fileInput.click()">

            <input #fileInput type="file" [accept]="accept()" [multiple]="accept() === ''" hidden (change)="onFileInput($event)" />

            @if (isUploading()) {
                <i class="fa-solid fa-spinner drop-zone__icon drop-zone__icon--spin"></i>
                <span class="drop-zone__label">{{ uploadingLabel() }}</span>
                <span class="drop-zone__hint">{{ files().length }} fichier{{ files().length > 1 ? 's' : '' }}</span>
            } @else if (files().length === 0) {
                <i class="fa-regular fa-cloud-arrow-up drop-zone__icon"></i>
                <span class="drop-zone__label">{{ label() }}</span>
                <span class="drop-zone__hint">{{ hint() }}</span>
            } @else {
                <i class="fa-regular fa-cloud-arrow-up drop-zone__icon"></i>
                <span class="drop-zone__label">{{ label() }}</span>
                <span class="drop-zone__hint">{{ hint() }}</span>
            }
        </div>
    `,
    styles: `
        :host { display: block; }

        .drop-zone {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.125rem;
            padding: 2rem 0.5rem;
            border: 1.5px dashed var(--surface-border);
            border-radius: 0.625rem;
            cursor: pointer;
            transition: border-color 0.15s, background 0.15s, scale 0.15s;
            text-align: center;
            user-select: none;

            &:hover:not(.is-uploading) {
                border-color: var(--p-primary-400);
                background: color-mix(in srgb, var(--p-primary-500) 8%, transparent);
            }

            &.is-over {
                border-color: var(--p-primary-500);
                background: color-mix(in srgb, var(--p-primary-500) 10%, transparent);
                scale: 1.02;
            }

            &.is-uploading {
                cursor: default;
                border-color: var(--p-primary-300);
                border-style: solid;
                background: color-mix(in srgb, var(--p-primary-500) 8%, transparent);
            }
        }

        .drop-zone__icon {
            font-size: 1rem;
            color: var(--p-text-muted-color);

            .is-over & { color: var(--p-primary-500); }

            &--spin {
                color: var(--p-primary-500);
                animation: spin 0.8s linear infinite;
            }
        }

        @keyframes spin {
            from { rotate: 0deg; }
            to   { rotate: 360deg; }
        }

        .drop-zone__label {
            font-size: 0.6875rem;
            font-weight: 600;
            color: var(--p-text-color);
        }

        .drop-zone__hint {
            font-size: 0.625rem;
            color: var(--p-text-muted-color);
        }
    `,
})
export class DropZoneComponent {
    private messageService = inject(MessageService);

    readonly accept = input<string>('');
    readonly label = input<string>('Déposer des fichiers');
    readonly hint = input<string>('ou cliquer pour parcourir');
    readonly uploadingLabel = input<string>('Envoi en cours...');
    readonly filesDropped = output<File[]>();

    readonly isDragOver = signal(false);
    readonly isUploading = signal(false);
    readonly files = signal<File[]>([]);

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

        const dropped = Array.from(event.dataTransfer?.files ?? []);
        if (dropped.length) {
            this.upload(dropped);
        }
    }

    onFileInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        const selected = Array.from(input.files ?? []);
        if (selected.length) {
            this.upload(selected);
            input.value = '';
        }
    }

    private upload(files: File[]): void {
        this.files.set(files);
        this.isUploading.set(true);
        this.filesDropped.emit(files);

        // Simulé — à remplacer par un appel au vrai service d'upload
        setTimeout(() => {
            this.isUploading.set(false);
            this.files.set([]);
            this.messageService.add({
                severity: 'success',
                summary: 'Fichiers envoyés',
                detail: `${files.length} fichier${files.length > 1 ? 's ont été déposés' : ' a été déposé'} avec succès.`,
            });
        }, 2000);
    }
}

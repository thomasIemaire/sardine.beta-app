import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

import { ApiFile, DocFileType, DocumentService, fileTypeFromMime, formatFileSize } from '../../core/services/document.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

@Component({
  selector: 'app-file-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TooltipModule],
  template: `
    <div class="fv-layout" [class.fv-right-collapsed]="!rightOpen()">
      <!-- Left panel : données du fichier -->
      <aside class="fv-left">
        <div class="fv-left-header">
          <button class="fv-back" (click)="goBack()" pTooltip="Retour">
            <i class="fa-regular fa-arrow-left"></i>
          </button>
          <div class="fv-file-head">
            <i class="fv-file-icon {{ iconClass(fileType()) }}" [attr.data-type]="fileType()"></i>
            <div class="fv-file-meta">
              <span class="fv-file-name" [title]="file()?.name">{{ file()?.name || '—' }}</span>
              <div class="fv-file-tags">
                <span class="fv-tag fv-tag--type">{{ (fileType() || 'file').toUpperCase() }}</span>
                @if (file()?.size) {
                  <span class="fv-tag fv-tag--size">{{ sizeLabel(file()!.size) }}</span>
                }
              </div>
            </div>
          </div>
        </div>

        <div class="fv-left-actions">
          <p-button
            label="Télécharger"
            icon="fa-regular fa-download"
            severity="secondary"
            [rounded]="true"
            size="small"
            styleClass="fv-download-btn"
            [disabled]="!file()"
            (onClick)="download()"
          />
        </div>

        <div class="fv-left-body">
          <!-- Zone données du fichier — à remplir plus tard -->
        </div>
      </aside>

      <!-- Center : preview -->
      <main class="fv-center">
        @if (loading()) {
          <div class="fv-placeholder">
            <i class="fa-regular fa-spinner fa-spin"></i>
            <span>Chargement…</span>
          </div>
        } @else if (previewUrl()) {
          @switch (previewKind()) {
            @case ('pdf') {
              <iframe class="fv-pdf" [src]="previewUrl()" title="preview"></iframe>
            }
            @case ('image') {
              <img class="fv-image" [src]="previewUrl()" [alt]="file()?.name || ''" />
            }
            @default {
              <div class="fv-placeholder">
                <i class="fa-regular fa-file-circle-question"></i>
                <span>Aperçu non disponible pour ce type de fichier.</span>
                <p-button label="Télécharger" icon="fa-regular fa-download" size="small" [rounded]="true" (onClick)="download()" />
              </div>
            }
          }
        } @else if (error()) {
          <div class="fv-placeholder">
            <i class="fa-regular fa-triangle-exclamation"></i>
            <span>{{ error() }}</span>
          </div>
        }
      </main>

      <!-- Right : historique & commentaires (retractable) -->
      <aside class="fv-right" [class.is-collapsed]="!rightOpen()">
        <button
          class="fv-right-toggle"
          (click)="toggleRight()"
          [pTooltip]="rightOpen() ? 'Réduire' : 'Ouvrir'"
          tooltipPosition="left"
        >
          <i class="fa-regular" [class.fa-chevron-right]="rightOpen()" [class.fa-chevron-left]="!rightOpen()"></i>
        </button>

        @if (rightOpen()) {
          <div class="fv-right-content">
            <div class="fv-right-header">
              <h3>Historique et commentaire</h3>
            </div>

            <section class="fv-section">
              <span class="fv-section-title">HISTORIQUE</span>
              <div class="fv-history">
                <!-- Historique statique pour l'instant -->
                <div class="fv-history-item">
                  <div class="fv-history-dot fv-history-dot--add">
                    <i class="fa-regular fa-plus"></i>
                  </div>
                  <div class="fv-history-body">
                    <div class="fv-history-title">Fichier ajouté</div>
                    @if (file()) {
                      <div class="fv-history-sub">{{ file()!.created_at | date:'dd/MM/yyyy HH:mm' }}</div>
                    }
                  </div>
                </div>
              </div>
            </section>

            <section class="fv-section">
              <span class="fv-section-title">COMMENTAIRES</span>
              <div class="fv-comments-empty">
                <i class="fa-regular fa-comment"></i>
                <span>Aucun commentaire</span>
              </div>
              <div class="fv-comment-input">
                <input type="text" pInputText placeholder="Ajouter un commentaire..." [(ngModel)]="newComment" />
                <p-button label="Envoyer" icon="fa-regular fa-paper-plane" size="small" [rounded]="true" [disabled]="!newComment.trim()" />
              </div>
            </section>
          </div>
        }
      </aside>
    </div>
  `,
  styleUrl: './file-viewer.page.scss',
})
export class FileViewerPage implements OnInit, OnDestroy {
  private readonly docService = inject(DocumentService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly file = signal<ApiFile | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly previewKind = signal<'pdf' | 'image' | 'other'>('other');
  readonly rightOpen = signal(true);

  newComment = '';
  private objectUrl: string | null = null;

  fileType(): DocFileType | null {
    const f = this.file();
    if (!f) return null;
    return fileTypeFromMime(f.mime_type, f.name);
  }

  ngOnInit(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) {
      this.error.set("Aucune organisation sélectionnée.");
      this.loading.set(false);
      return;
    }

    // File passé via navigation state (ouverture depuis /documents).
    const stateFile = (history.state as { file?: ApiFile } | null)?.file ?? null;

    const fileId = this.route.snapshot.paramMap.get('fileId');
    const folderId = this.route.snapshot.queryParamMap.get('folder');

    if (stateFile && (!fileId || stateFile.id === fileId)) {
      this.file.set(stateFile);
      this.loadPreview(orgId, stateFile);
      return;
    }

    // Fallback (refresh F5) : on charge les fichiers du dossier et on trouve l'id.
    if (fileId && folderId) {
      this.docService.getFiles(orgId, folderId, { pageSize: 200 })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (page) => {
            const f = (page.items ?? []).find(x => x.id === fileId);
            if (!f) {
              this.error.set("Fichier introuvable.");
              this.loading.set(false);
              return;
            }
            this.file.set(f);
            this.loadPreview(orgId, f);
          },
          error: () => {
            this.error.set("Impossible de charger le fichier.");
            this.loading.set(false);
          },
        });
    } else {
      this.error.set("Fichier introuvable.");
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private loadPreview(orgId: string, file: ApiFile): void {
    const type = fileTypeFromMime(file.mime_type, file.name);
    if (type === 'pdf') {
      this.previewKind.set('pdf');
    } else if (type === 'png' || type === 'jpg') {
      this.previewKind.set('image');
    } else {
      this.previewKind.set('other');
      this.loading.set(false);
      return;
    }

    this.docService.getFileBlob(orgId, file.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          // Force le MIME type correct — le serveur peut renvoyer
          // application/octet-stream ou Content-Disposition: attachment,
          // ce qui déclencherait un téléchargement au lieu d'un aperçu.
          const typed = new Blob([blob], { type: file.mime_type });
          this.objectUrl = URL.createObjectURL(typed);
          this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
          this.loading.set(false);
        },
        error: () => {
          this.error.set("Impossible de charger l'aperçu.");
          this.loading.set(false);
        },
      });
  }

  toggleRight(): void {
    this.rightOpen.update(v => !v);
  }

  goBack(): void {
    const folderId = this.route.snapshot.queryParamMap.get('folder');
    this.router.navigate(['/documents'], {
      queryParams: folderId ? { folder: folderId } : {},
    });
  }

  download(): void {
    const orgId = this.contextSwitcher.selectedId();
    const f = this.file();
    if (!orgId || !f) return;
    this.docService.downloadFile(orgId, f.id, f.name);
  }

  sizeLabel(size: number): string {
    return formatFileSize(size);
  }

  iconClass(type: DocFileType | null): string {
    switch (type) {
      case 'pdf':  return 'fa-regular fa-file-pdf';
      case 'docx': return 'fa-regular fa-file-word';
      case 'xlsx': return 'fa-regular fa-file-excel';
      case 'png':
      case 'jpg':  return 'fa-regular fa-file-image';
      case 'txt':  return 'fa-regular fa-file-lines';
      case 'csv':  return 'fa-regular fa-file-csv';
      default:     return 'fa-regular fa-file';
    }
  }
}

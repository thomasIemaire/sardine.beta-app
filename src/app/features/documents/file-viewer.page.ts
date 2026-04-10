import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

import { ApiFile, ApiFileDetail, DocFileType, DocumentService, fileTypeFromMime, formatFileSize } from '../../core/services/document.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';
import { AgentResultTreeComponent, AgentResultEntry, toEntries, entriesToObject } from './agent-result-tree.component';

@Component({
  selector: 'app-file-viewer',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TooltipModule, ToastModule, AgentResultTreeComponent],
  template: `
    <p-toast position="bottom-right" [life]="3000" />
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
          @if (agentResultEntries().length) {
            <div class="fv-results">
              <span class="fv-section-title">RÉSULTATS D'EXTRACTION</span>
              <app-agent-result-tree [entries]="agentResultEntries()" (change)="onResultsChange()" />
              <p-button
                label="Sauvegarder"
                icon="fa-regular fa-floppy-disk"
                size="small"
                [rounded]="true"
                [loading]="savingResults()"
                (onClick)="saveResults()"
                styleClass="fv-save-btn"
              />
            </div>
          }
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
export class FileViewerPage implements OnInit {
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
  readonly agentResultEntries = signal<AgentResultEntry[]>([]);
  readonly savingResults = signal(false);
  readonly resultsDirty = signal(false);
  private readonly messageService = inject(MessageService);
  private agentResultKey: 'agentResult' | 'agentResults' = 'agentResults';

  newComment = '';

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

    const fileId = this.route.snapshot.paramMap.get('fileId');
    if (!fileId) {
      this.error.set("Fichier introuvable.");
      this.loading.set(false);
      return;
    }

    this.docService.getFile(orgId, fileId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.file.set(detail);
          const results = detail.flow_execution_results as any;
          let agentsResult = results?.agentResults ?? results?.data?.agentResults;
          if (agentsResult) {
            this.agentResultKey = 'agentResults';
          } else {
            agentsResult = results?.agentResult ?? results?.data?.agentResult;
            if (agentsResult) this.agentResultKey = 'agentResult';
          }
          if (agentsResult && typeof agentsResult === 'object') {
            this.agentResultEntries.set(toEntries(agentsResult));
          }
          this.loadPreview(detail);
        },
        error: () => {
          this.error.set("Impossible de charger le fichier.");
          this.loading.set(false);
        },
      });
  }

  private loadPreview(detail: ApiFileDetail): void {
    const type = fileTypeFromMime(detail.content_mime_type, detail.name);

    if (type === 'pdf') {
      this.previewKind.set('pdf');
    } else if (type === 'png' || type === 'jpg') {
      this.previewKind.set('image');
    } else {
      this.previewKind.set('other');
      this.loading.set(false);
      return;
    }

    const dataUrl = `data:${detail.content_mime_type};base64,${detail.content_base64}`;
    this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl));
    this.loading.set(false);
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

  onResultsChange(): void {
    this.resultsDirty.set(true);
  }

  saveResults(): void {
    const orgId = this.contextSwitcher.selectedId();
    const f = this.file();
    if (!orgId || !f) return;

    this.savingResults.set(true);
    const updated = entriesToObject(this.agentResultEntries());
    const payload = { [this.agentResultKey]: updated };

    this.docService.updateExecutionResults(orgId, f.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingResults.set(false);
          this.resultsDirty.set(false);
          this.messageService.add({ severity: 'success', summary: 'Sauvegardé', detail: 'Résultats mis à jour.' });
        },
        error: () => {
          this.savingResults.set(false);
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de sauvegarder les résultats.' });
        },
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

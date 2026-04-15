import { Component, HostListener, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DropZoneComponent } from '../../../shared/components/drop-zone/drop-zone.component';
import { PdfViewerComponent, AnnotationRect, RectType } from './pdf-viewer.component';

// ── Domain types ─────────────────────────────────────────────────────────────

export type DocType =
  | 'facture'
  | 'facture-suivante'
  | 'bulletin-de-paie'
  | 'bulletin-de-paie-suivant'
  | 'releve-bancaire'
  | 'autre';

interface DocTypeOption {
  value: DocType;
  label: string;
}

const DOC_TYPE_OPTIONS: DocTypeOption[] = [
  { value: 'facture', label: 'Facture (1ère page)' },
  { value: 'facture-suivante', label: 'Facture (suite)' },
  { value: 'bulletin-de-paie', label: 'Bulletin de paie (1ère page)' },
  { value: 'bulletin-de-paie-suivant', label: 'Bulletin de paie (suite)' },
  { value: 'releve-bancaire', label: 'Relevé bancaire' },
  { value: 'autre', label: 'Autre' },
];

interface TrainingPage {
  /** Which PDF file this page belongs to */
  fileIndex: number;
  /** 1-indexed page within its PDF */
  pageNumber: number;
  /** Cached ArrayBuffer of the PDF (shared among pages of the same file) */
  pdfData: ArrayBuffer;
  /** Document type label for this page */
  docType: DocType | null;
  /** Annotation rectangles drawn on this page */
  rects: AnnotationRect[];
  /** Whether this page has been saved to the mock backend */
  saved: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-training',
  imports: [
    FormsModule,
    ButtonModule,
    SelectModule,
    TooltipModule,
    ToastModule,
    DropZoneComponent,
    PdfViewerComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast position="bottom-right" [life]="3500" />

    <!-- ── Import state ───────────────────────────────────────────────────── -->
    @if (state() === 'import') {
      <div class="import-screen">
        <div class="import-card">
          <div class="import-header">
            <i class="fa-regular fa-dumbbell import-icon"></i>
            <span class="import-title">Données d'entraînement</span>
            <span class="import-subtitle">
              Importez un ou plusieurs fichiers PDF pour démarrer l'annotation des pages.
            </span>
          </div>
          <app-drop-zone
            accept=".pdf"
            label="Déposer des fichiers PDF"
            hint="Glissez-déposez ou cliquez pour sélectionner (plusieurs fichiers acceptés)"
            (filesDropped)="onFilesDropped($event)"
          />
        </div>
      </div>
    }

    <!-- ── Annotation state ───────────────────────────────────────────────── -->
    @if (state() === 'annotating') {
      <div class="editor">

        <!-- Toolbar -->
        <div class="editor-toolbar">

          <!-- Left: mode + rect type -->
          <div class="toolbar-group">
            <div class="mode-toggle">
              <button
                class="mode-btn"
                [class.active]="viewMode() === 'move'"
                (click)="viewMode.set('move')"
                pTooltip="Mode déplacement"
                tooltipPosition="bottom"
              >
                <i class="fa-regular fa-hand"></i>
              </button>
              <button
                class="mode-btn"
                [class.active]="viewMode() === 'draw'"
                (click)="viewMode.set('draw')"
                pTooltip="Mode dessin"
                tooltipPosition="bottom"
              >
                <i class="fa-regular fa-vector-square"></i>
              </button>
            </div>

            @if (viewMode() === 'draw') {
              <div class="rect-types">
                @for (rt of rectTypes; track rt.value) {
                  <button
                    class="rect-type-btn"
                    [class.active]="activeType() === rt.value"
                    [style.--color]="rt.color"
                    (click)="activeType.set(rt.value)"
                    [pTooltip]="rt.label"
                    tooltipPosition="bottom"
                  >
                    <i [class]="rt.icon"></i>
                    <span>{{ rt.label }}</span>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Center: page info -->
          <div class="toolbar-center">
            <span class="page-info">
              Page <strong>{{ currentPageIndex() + 1 }}</strong> / {{ pages().length }}
            </span>
            <span class="file-info">
              {{ currentPage()?.fileIndex !== undefined ? fileNames()[currentPage()!.fileIndex] : '' }}
              — p.&nbsp;{{ currentPage()?.pageNumber }}
            </span>
          </div>

          <!-- Right: doc type select -->
          <div class="toolbar-group toolbar-group--right">
            <label class="doc-type-label">Type de document</label>
            <p-select
              [options]="docTypeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Sélectionner…"
              size="small"
              [ngModel]="currentPage()?.docType"
              (ngModelChange)="setDocType($event)"
              [style]="{ minWidth: '220px' }"
            />
          </div>
        </div>

        <!-- Viewer -->
        <div class="editor-main">
          @if (currentPage(); as page) {
            <app-pdf-viewer
              [pdfData]="page.pdfData"
              [pageNumber]="page.pageNumber"
              [mode]="viewMode()"
              [activeType]="activeType()"
              [initialRects]="page.rects"
              (rectsChange)="onRectsChange($event)"
            />
          }
        </div>

        <!-- Footer -->
        <div class="editor-footer">
          <div class="footer-left">
            <p-button
              label="Recommencer"
              severity="secondary"
              [text]="true"
              size="small"
              rounded
              icon="fa-regular fa-rotate-left"
              pTooltip="Réinitialiser et importer de nouveaux fichiers"
              tooltipPosition="top"
              (onClick)="reset()"
            />
          </div>

          <div class="footer-center">
            <!-- Progress dots (max 20 shown) -->
            <div class="progress-dots">
              @for (p of progressDots(); track $index) {
                <span
                  class="dot"
                  [class.dot--current]="p.isCurrent"
                  [class.dot--saved]="p.saved"
                ></span>
              }
              @if (pages().length > 20) {
                <span class="dot-overflow">+{{ pages().length - 20 }}</span>
              }
            </div>
          </div>

          <div class="footer-right">
            @if (currentPageIndex() > 0) {
              <p-button
                label="Précédent"
                severity="secondary"
                size="small"
                rounded
                icon="fa-regular fa-chevron-left"
                iconPos="left"
                (onClick)="prevPage()"
              />
            }
            <p-button
              [label]="isLastPage() ? 'Enregistrer' : 'Suivant'"
              [icon]="isLastPage() ? 'fa-regular fa-floppy-disk' : 'fa-regular fa-chevron-right'"
              iconPos="right"
              size="small"
              rounded
              [disabled]="!currentPage()?.docType"
              [loading]="saving()"
              (onClick)="nextOrSave()"
            />
          </div>
        </div>
      </div>
    }

    <!-- ── Done state ─────────────────────────────────────────────────────── -->
    @if (state() === 'done') {
      <div class="done-screen">
        <i class="fa-regular fa-circle-check done-icon"></i>
        <span class="done-title">Données enregistrées</span>
        <span class="done-subtitle">
          {{ pages().length }} page{{ pages().length > 1 ? 's ont été annotées' : ' a été annotée' }} et enregistrée{{ pages().length > 1 ? 's' : '' }}.
        </span>
        <p-button
          label="Nouvel entraînement"
          icon="fa-regular fa-plus"
          size="small"
          rounded
          (onClick)="reset()"
        />
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    /* ── Import ──────────────────────────────────────────────────────────── */
    .import-screen {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .import-card {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      width: 100%;
      max-width: 480px;
    }

    .import-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: .375rem;
    }

    .import-icon {
      font-size: 2rem;
      color: var(--p-primary-500);
      margin-bottom: .25rem;
    }

    .import-title {
      font-size: 1rem;
      font-weight: 600;
    }

    .import-subtitle {
      font-size: .8125rem;
      color: var(--p-text-muted-color);
      max-width: 360px;
    }

    /* ── Editor ──────────────────────────────────────────────────────────── */
    .editor {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .editor-toolbar {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: .5rem 1rem;
      border-bottom: 1px solid var(--surface-border);
      background: var(--p-surface-card);
      flex-shrink: 0;
    }

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: .5rem;
      flex: 1;

      &--right {
        justify-content: flex-end;
        gap: .5rem;
      }
    }

    .toolbar-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      gap: .125rem;
    }

    .page-info {
      font-size: .875rem;
    }

    .file-info {
      font-size: .6875rem;
      color: var(--p-text-muted-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
    }

    .doc-type-label {
      font-size: .8125rem;
      font-weight: 500;
      white-space: nowrap;
    }

    /* Mode toggle */
    .mode-toggle {
      display: flex;
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      overflow: hidden;
    }

    .mode-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--p-text-muted-color);
      transition: background .15s, color .15s;
      font-size: .875rem;

      &:hover { background: var(--p-surface-hover); }
      &.active {
        background: var(--p-primary-500);
        color: white;
      }
    }

    /* Rect type buttons */
    .rect-types {
      display: flex;
      gap: .375rem;
    }

    .rect-type-btn {
      display: flex;
      align-items: center;
      gap: .3rem;
      padding: .25rem .625rem;
      border: 1.5px solid var(--color);
      border-radius: 6px;
      background: transparent;
      color: var(--color);
      cursor: pointer;
      font-size: .75rem;
      font-weight: 600;
      transition: background .15s;

      &:hover { background: color-mix(in srgb, var(--color) 12%, transparent); }
      &.active { background: color-mix(in srgb, var(--color) 18%, transparent); }

      i { font-size: .75rem; }
    }

    /* Viewer */
    .editor-main {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    /* Footer */
    .editor-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: .625rem 1rem;
      border-top: 1px solid var(--surface-border);
      background: var(--p-surface-card);
      flex-shrink: 0;
    }

    .footer-left, .footer-right {
      display: flex;
      align-items: center;
      gap: .5rem;
      flex: 1;
    }

    .footer-right { justify-content: flex-end; }

    .footer-center {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
    }

    /* Progress dots */
    .progress-dots {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
      justify-content: center;
      max-width: 300px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--surface-border);
      transition: background .2s, transform .2s;

      &--saved { background: var(--p-primary-500); }
      &--current {
        background: var(--p-primary-300);
        transform: scale(1.4);
      }
      &--current.dot--saved { background: var(--p-primary-500); }
    }

    .dot-overflow {
      font-size: .6875rem;
      color: var(--p-text-muted-color);
    }

    /* ── Done ────────────────────────────────────────────────────────────── */
    .done-screen {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: .75rem;
    }

    .done-icon {
      font-size: 3rem;
      color: var(--p-primary-500);
    }

    .done-title {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .done-subtitle {
      font-size: .875rem;
      color: var(--p-text-muted-color);
      margin-bottom: .5rem;
    }
  `,
})
export class TrainingComponent {
  // ── UI config ───────────────────────────────────────────────────────────────

  readonly docTypeOptions = DOC_TYPE_OPTIONS;

  readonly rectTypes: { value: RectType; label: string; icon: string; color: string }[] = [
    { value: 'texte', label: 'Texte', icon: 'fa-regular fa-font', color: '#3b82f6' },
    { value: 'image', label: 'Image', icon: 'fa-regular fa-image', color: '#f59e0b' },
    { value: 'tableau', label: 'Tableau', icon: 'fa-regular fa-table', color: '#10b981' },
  ];

  // ── State ───────────────────────────────────────────────────────────────────

  readonly state = signal<'import' | 'annotating' | 'done'>('import');
  readonly viewMode = signal<'move' | 'draw'>('move');
  readonly activeType = signal<RectType>('texte');
  readonly saving = signal(false);

  readonly pages = signal<TrainingPage[]>([]);
  readonly fileNames = signal<string[]>([]);
  readonly currentPageIndex = signal(0);

  readonly currentPage = computed(() => this.pages()[this.currentPageIndex()]);
  readonly isLastPage = computed(() => this.currentPageIndex() === this.pages().length - 1);

  readonly progressDots = computed(() =>
    this.pages()
      .slice(0, 20)
      .map((p, i) => ({ saved: p.saved, isCurrent: i === this.currentPageIndex() }))
  );

  // ── File import ─────────────────────────────────────────────────────────────

  async onFilesDropped(files: File[]): Promise<void> {
    const pdfFiles = files.filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (!pdfFiles.length) return;

    const allPages: TrainingPage[] = [];
    const names: string[] = [];

    for (let fileIndex = 0; fileIndex < pdfFiles.length; fileIndex++) {
      const file = pdfFiles[fileIndex];
      names.push(file.name);

      const buffer = await file.arrayBuffer();

      // Determine page count via pdfjs (dynamic import to keep bundle clean)
      let pageCount = 1;
      try {
        const { getDocument } = await import('pdfjs-dist');
        const doc = await getDocument({ data: buffer.slice(0) }).promise;
        pageCount = doc.numPages;
        await doc.destroy();
      } catch {
        pageCount = 1;
      }

      for (let p = 1; p <= pageCount; p++) {
        allPages.push({
          fileIndex,
          pageNumber: p,
          pdfData: buffer,
          docType: null,
          rects: [],
          saved: false,
        });
      }
    }

    this.fileNames.set(names);
    this.pages.set(allPages);
    this.currentPageIndex.set(0);
    this.state.set('annotating');
  }

  // ── Annotation ──────────────────────────────────────────────────────────────

  setDocType(value: DocType): void {
    this.pages.update((pages) => {
      const updated = [...pages];
      updated[this.currentPageIndex()] = { ...updated[this.currentPageIndex()], docType: value };
      return updated;
    });
  }

  onRectsChange(rects: AnnotationRect[]): void {
    this.pages.update((pages) => {
      const updated = [...pages];
      updated[this.currentPageIndex()] = { ...updated[this.currentPageIndex()], rects };
      return updated;
    });
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  prevPage(): void {
    if (this.currentPageIndex() > 0) {
      this.currentPageIndex.update((i) => i - 1);
      this.viewMode.set('move');
    }
  }

  async nextOrSave(): Promise<void> {
    await this.saveCurrent();

    if (this.isLastPage()) {
      // Final save — mark training dataset as complete (mock)
      await this.finalizeTraining();
    } else {
      this.currentPageIndex.update((i) => i + 1);
      this.viewMode.set('move');
    }
  }

  // ── Mock API calls ──────────────────────────────────────────────────────────

  private async saveCurrent(): Promise<void> {
    const idx = this.currentPageIndex();
    const page = this.pages()[idx];
    if (!page) return;

    this.saving.set(true);

    // Mock: simulate API call
    await new Promise((r) => setTimeout(r, 300));

    // Mock payload that would be sent to the server
    const payload = {
      fileIndex: page.fileIndex,
      pageNumber: page.pageNumber,
      docType: page.docType,
      rects: page.rects,
    };
    console.debug('[Training mock] Saved page', payload);

    this.pages.update((pages) => {
      const updated = [...pages];
      updated[idx] = { ...updated[idx], saved: true };
      return updated;
    });

    this.saving.set(false);
  }

  private async finalizeTraining(): Promise<void> {
    this.saving.set(true);

    // Mock: simulate finalizing the training dataset
    await new Promise((r) => setTimeout(r, 500));

    const summary = {
      totalPages: this.pages().length,
      files: this.fileNames(),
      pages: this.pages().map((p) => ({
        file: this.fileNames()[p.fileIndex],
        pageNumber: p.pageNumber,
        docType: p.docType,
        rectangles: p.rects.length,
      })),
    };
    console.debug('[Training mock] Finalized training dataset', summary);

    this.saving.set(false);
    this.state.set('done');
  }

  reset(): void {
    this.state.set('import');
    this.pages.set([]);
    this.fileNames.set([]);
    this.currentPageIndex.set(0);
    this.viewMode.set('move');
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.state() !== 'annotating') return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        if (!this.isLastPage() && this.currentPage()?.docType) {
          event.preventDefault();
          this.nextOrSave();
        }
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        if (this.currentPageIndex() > 0) {
          event.preventDefault();
          this.prevPage();
        }
        break;
      case 'm':
      case 'M':
        this.viewMode.set('move');
        break;
      case 'd':
      case 'D':
        this.viewMode.set('draw');
        break;
      case '1':
        this.activeType.set('texte');
        break;
      case '2':
        this.activeType.set('image');
        break;
      case '3':
        this.activeType.set('tableau');
        break;
    }
  }
}

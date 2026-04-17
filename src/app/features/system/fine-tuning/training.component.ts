import { Component, HostListener, inject, output, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { DropZoneComponent } from '../../../shared/components/drop-zone/drop-zone.component';
import { PdfViewerComponent, AnnotationRect, RectType } from './pdf-viewer.component';
import { DatasetService, ApiDocumentType, ApiZone, ApiZoneType } from '../../../core/services/dataset.service';
import { ContextSwitcherService } from '../../../core/layout/context-switcher/context-switcher.service';

// ── UI ↔ API mapping ──────────────────────────────────────────────────────────

type UiDocType =
  | 'invoice'
  | 'invoice_next'
  | 'payslip'
  | 'contract'
  | 'quote'
  | 'purchase_order'
  | 'credit_note'
  | 'bank_statement'
  | 'certificate'
  | 'terms_of_service'
  | 'terms_of_sale';

interface DocTypeOption {
  value: UiDocType;
  label: string;
}

const DOC_TYPE_OPTIONS: DocTypeOption[] = [
  { value: 'invoice',           label: 'Facture'           },
  { value: 'invoice_next',      label: 'Facture (suite)'   },
  { value: 'payslip',           label: 'Bulletin de paie'  },
  { value: 'contract',          label: 'Contrat'           },
  { value: 'quote',             label: 'Devis'             },
  { value: 'purchase_order',    label: 'Bon de commande'   },
  { value: 'credit_note',       label: 'Avoir'             },
  { value: 'bank_statement',    label: 'Relevé bancaire'   },
  { value: 'certificate',       label: 'Attestation'       },
  { value: 'terms_of_service',  label: 'CGU'               },
  { value: 'terms_of_sale',     label: 'CGV'               },
];

function toApiDocType(ui: UiDocType): ApiDocumentType {
  return ui; // UiDocType values match ApiDocumentType exactly
}

function fromApiDocType(api: ApiDocumentType): UiDocType | null {
  if (!api) return null;
  const known: UiDocType[] = [
    'invoice', 'invoice_next', 'payslip', 'contract', 'quote', 'purchase_order',
    'credit_note', 'bank_statement', 'certificate', 'terms_of_service', 'terms_of_sale',
  ];
  return known.includes(api as UiDocType) ? (api as UiDocType) : null;
}

function toApiZoneType(rt: RectType): ApiZoneType {
  switch (rt) {
    case 'texte':   return 'text';
    case 'image':   return 'image';
    case 'tableau': return 'table';
  }
}

/** Convert internal 0–1 coords to API 0–100 percentages */
function toApiZone(r: AnnotationRect): { type: ApiZoneType; x: number; y: number; width: number; height: number } {
  return {
    type:   toApiZoneType(r.type),
    x:      r.x      * 100,
    y:      r.y      * 100,
    width:  r.width  * 100,
    height: r.height * 100,
  };
}

function fromApiZoneType(api: ApiZoneType): RectType {
  switch (api) {
    case 'text':  return 'texte';
    case 'image': return 'image';
    case 'table': return 'tableau';
  }
}

/** Convert API 0–100 percentages back to internal 0–1 coords */
function fromApiZone(z: ApiZone): AnnotationRect {
  return {
    id:     z.id,
    x:      z.x      / 100,
    y:      z.y      / 100,
    width:  z.width  / 100,
    height: z.height / 100,
    type:   fromApiZoneType(z.type),
  };
}

// ── Internal page model ───────────────────────────────────────────────────────

interface TrainingPage {
  /** Backend page id */
  pageId: string;
  /** Original filename */
  filename: string;
  /** 1-indexed within the original PDF */
  pageNumber: number;
  /** Lazily loaded PDF binary for this single page */
  pdfData: ArrayBuffer | null;
  /** UI doc type */
  docType: UiDocType | null;
  /** Annotation rectangles (internal 0–1 coords) */
  rects: AnnotationRect[];
  /** True once saved to backend */
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

    <!-- ── Import ───────────────────────────────────────────────────────────── -->
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

          @if (importing()) {
            <div class="importing-status">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span>{{ importStatus() }}</span>
            </div>
          } @else {
            <app-drop-zone
              accept=".pdf"
              label="Déposer des fichiers PDF"
              hint="Glissez-déposez ou cliquez pour sélectionner (plusieurs fichiers acceptés)"
              (filesDropped)="onFilesDropped($event)"
            />
          }
        </div>
      </div>
    }

    <!-- ── Annotating ────────────────────────────────────────────────────────── -->
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
              ><i class="fa-regular fa-hand"></i></button>
              <button
                class="mode-btn"
                [class.active]="viewMode() === 'draw'"
                (click)="viewMode.set('draw')"
                pTooltip="Mode dessin (D)"
                tooltipPosition="bottom"
              ><i class="fa-regular fa-vector-square"></i></button>
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

          <!-- Center: page info + processed badge -->
          <div class="toolbar-center">
            <div class="page-info-row">
              <span class="page-info">
                Page <strong>{{ currentPageIndex() + 1 }}</strong> / {{ pages().length }}
              </span>
              @if (currentPage()!.saved) {
                <span class="page-badge page-badge--done" pTooltip="Page traitée" tooltipPosition="bottom">
                  <i class="fa-regular fa-circle-check"></i> Traitée
                </span>
              } @else {
                <span class="page-badge page-badge--pending" pTooltip="Page non traitée" tooltipPosition="bottom">
                  <i class="fa-regular fa-circle-dashed"></i> Non traitée
                </span>
              }
            </div>
            <span class="file-info">
              {{ currentPage()!.filename }} — p.&nbsp;{{ currentPage()!.pageNumber }}
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
              [ngModel]="currentPage().docType"
              (ngModelChange)="setDocType($event)"
              [style]="{ minWidth: '220px' }"
            />
          </div>
        </div>

        <!-- Viewer -->
        <div class="editor-main">
          @if (currentPage(); as page) {
            @if (loadingPage()) {
              <div class="page-loading">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Chargement de la page…</span>
              </div>
            } @else if (page.pdfData) {
              <app-pdf-viewer
                [pdfData]="page.pdfData"
                [pageNumber]="1"
                [mode]="viewMode()"
                [activeType]="activeType()"
                [initialRects]="page.rects"
                (rectsChange)="onRectsChange($event)"
              />
            }
          }
        </div>

        <!-- Footer -->
        <div class="editor-footer">
          <div class="footer-left">
            <p-button
              label="Retour"
              severity="secondary"
              [text]="true"
              size="small"
              rounded
              icon="fa-regular fa-arrow-left"
              (onClick)="reset()"
            />
          </div>

          <div class="footer-center">
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
                [disabled]="saving()"
                (onClick)="prevPage()"
              />
            }
            <p-button
              [label]="isLastPage() ? 'Enregistrer' : 'Suivant'"
              [icon]="isLastPage() ? 'fa-regular fa-floppy-disk' : 'fa-regular fa-chevron-right'"
              iconPos="right"
              size="small"
              rounded
              [disabled]="!currentPage().docType || loadingPage()"
              [loading]="saving()"
              (onClick)="nextOrSave()"
            />
          </div>
        </div>
      </div>
    }

    <!-- ── Done ──────────────────────────────────────────────────────────────── -->
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

    .import-title { font-size: 1rem; font-weight: 600; }

    .import-subtitle {
      font-size: .8125rem;
      color: var(--p-text-muted-color);
      max-width: 360px;
    }

    .importing-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .625rem;
      padding: 1.5rem;
      font-size: .875rem;
      color: var(--p-text-muted-color);
      border: 1.5px dashed var(--surface-border);
      border-radius: .625rem;
      i { color: var(--p-primary-500); }
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
      &--right { justify-content: flex-end; }
    }

    .toolbar-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      gap: .125rem;
    }

    .page-info-row {
      display: flex;
      align-items: center;
      gap: .5rem;
    }

    .page-info { font-size: .875rem; }

    .page-badge {
      display: inline-flex;
      align-items: center;
      gap: .25rem;
      font-size: .6875rem;
      font-weight: 600;
      padding: .125rem .5rem;
      border-radius: 999px;
      i { font-size: .6875rem; }

      &--done {
        background: color-mix(in srgb, #10b981 15%, transparent);
        color: #059669;
      }
      &--pending {
        background: color-mix(in srgb, #f59e0b 15%, transparent);
        color: #d97706;
      }
    }

    .file-info {
      font-size: .6875rem;
      color: var(--p-text-muted-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
    }

    .doc-type-label { font-size: .8125rem; font-weight: 500; white-space: nowrap; }

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
      &.active { background: var(--p-primary-500); color: white; }
    }

    .rect-types { display: flex; gap: .375rem; }

    .rect-type-btn {
      display: flex;
      align-items: center;
      gap: .3rem;
      padding: .25rem .625rem;
      border: 2px solid var(--color);
      border-radius: 6px;
      background: transparent;
      color: var(--color);
      cursor: pointer;
      font-size: .75rem;
      font-weight: 600;
      transition: background .12s, color .12s, box-shadow .12s;
      &:hover:not(.active) { background: color-mix(in srgb, var(--color) 15%, transparent); }
      &.active {
        background: var(--color);
        color: #fff;
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color) 35%, transparent);
      }
      i { font-size: .75rem; }
    }

    .editor-main {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .page-loading {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      font-size: .875rem;
      color: var(--p-text-muted-color);
      i { font-size: 1.5rem; color: var(--p-primary-500); }
    }

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
    .footer-center { display: flex; align-items: center; justify-content: center; flex: 1; }

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
      &--current { background: var(--p-primary-300); transform: scale(1.4); }
      &--current.dot--saved { background: var(--p-primary-500); }
    }

    .dot-overflow { font-size: .6875rem; color: var(--p-text-muted-color); }

    /* ── Done ────────────────────────────────────────────────────────────── */
    .done-screen {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: .75rem;
    }

    .done-icon { font-size: 3rem; color: var(--p-primary-500); }
    .done-title { font-size: 1.125rem; font-weight: 600; }
    .done-subtitle { font-size: .875rem; color: var(--p-text-muted-color); margin-bottom: .5rem; }
  `,
})
export class TrainingComponent {
  private readonly datasetService   = inject(DatasetService);
  private readonly contextSwitcher  = inject(ContextSwitcherService);
  private readonly messageService   = inject(MessageService);
  private readonly router           = inject(Router);
  private readonly route            = inject(ActivatedRoute);

  /** Emitted when the user clicks "Retour" — signals the parent to go back to the list */
  readonly backToList = output<void>();
  /** Emitted when all pages have been annotated and saved — signals the parent to return to list with a success message */
  readonly completed = output<number>();

  // ── UI config ───────────────────────────────────────────────────────────────

  readonly docTypeOptions = DOC_TYPE_OPTIONS;

  readonly rectTypes: { value: RectType; label: string; icon: string; color: string }[] = [
    { value: 'texte',   label: 'Texte',   icon: 'fa-regular fa-font',   color: '#3b82f6' },
    { value: 'image',   label: 'Image',   icon: 'fa-regular fa-image',  color: '#f59e0b' },
    { value: 'tableau', label: 'Tableau', icon: 'fa-regular fa-table',  color: '#10b981' },
  ];

  // ── State ───────────────────────────────────────────────────────────────────

  readonly state        = signal<'import' | 'annotating' | 'done'>('import');
  readonly viewMode     = signal<'move' | 'draw'>('move');
  readonly activeType   = signal<RectType>('texte');
  readonly saving       = signal(false);
  readonly importing    = signal(false);
  readonly importStatus = signal('');
  readonly loadingPage  = signal(false);

  readonly pages            = signal<TrainingPage[]>([]);
  readonly currentPageIndex = signal(0);
  /** Dataset id created on the backend for this session */
  private datasetId: string | null = null;

  readonly currentPage  = computed(() => this.pages()[this.currentPageIndex()]);
  readonly isLastPage   = computed(() => this.currentPageIndex() === this.pages().length - 1);

  readonly progressDots = computed(() =>
    this.pages().slice(0, 20).map((p, i) => ({
      saved:     p.saved,
      isCurrent: i === this.currentPageIndex(),
    }))
  );

  // ── Import ──────────────────────────────────────────────────────────────────

  async onFilesDropped(files: File[]): Promise<void> {
    const pdfFiles = files.filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (!pdfFiles.length) return;

    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Aucune organisation sélectionnée.' });
      return;
    }

    this.importing.set(true);

    try {
      // 1. Create the dataset
      this.importStatus.set('Création du dataset…');
      const dataset = await firstValueFrom(
        this.datasetService.createDataset(orgId, `Entraînement ${new Date().toLocaleDateString('fr-FR')}`)
      );
      this.datasetId = dataset.id;

      // 2. Import each PDF file
      const allPages: TrainingPage[] = [];

      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        this.importStatus.set(`Import ${file.name} (${i + 1}/${pdfFiles.length})…`);

        const result = await firstValueFrom(
          this.datasetService.importFile(orgId, dataset.id, file)
        );

        // 3. Fetch all pages for this file (paginated, max 100 per call)
        const PAGE_LIMIT = 100;
        let pageNum = 1;
        let fetched = 0;
        let total = Infinity;

        while (fetched < total) {
          const resp = await firstValueFrom(
            this.datasetService.listPages(orgId, dataset.id, {
              filename: result.original_filename,
              page:     pageNum,
              limit:    PAGE_LIMIT,
            })
          );
          total = resp.total;
          for (const p of resp.data) {
            allPages.push({
              pageId:     p.id,
              filename:   p.original_filename,
              pageNumber: p.page_number,
              pdfData:    null,
              docType:    null,
              rects:      [],
              saved:      p.processed,
            });
          }
          fetched += resp.data.length;
          pageNum++;
          if (resp.data.length === 0) break; // safety
        }
      }

      // Sort by filename then page_number to keep the original order
      allPages.sort((a, b) =>
        a.filename.localeCompare(b.filename) || a.pageNumber - b.pageNumber
      );

      this.pages.set(allPages);
      this.currentPageIndex.set(0);
      this.importing.set(false);
      this.state.set('annotating');

      // Load first page binary
      await this.loadPageBinary(0);

    } catch (err: unknown) {
      this.importing.set(false);
      const detail = (err as { error?: { detail?: string } })?.error?.detail ?? 'Erreur lors de l\'import.';
      this.messageService.add({ severity: 'error', summary: 'Import échoué', detail });
    }
  }

  /** Fetch the PDF binary and zones for a page if not already loaded */
  private async loadPageBinary(index: number): Promise<void> {
    const page = this.pages()[index];
    if (!page || page.pdfData) return;

    const orgId = this.contextSwitcher.selectedId();
    if (!orgId || !this.datasetId) return;

    this.loadingPage.set(true);
    try {
      const [buffer, pageDetail] = await Promise.all([
        firstValueFrom(this.datasetService.getPageBinary(orgId, this.datasetId, page.pageId)),
        firstValueFrom(this.datasetService.getPage(orgId, this.datasetId, page.pageId)),
      ]);
      this.pages.update((pages) => {
        const updated = [...pages];
        updated[index] = {
          ...updated[index],
          pdfData: buffer,
          rects: (pageDetail.zones ?? []).map(fromApiZone),
        };
        return updated;
      });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la page PDF.' });
    } finally {
      this.loadingPage.set(false);
    }
  }

  // ── Annotation ──────────────────────────────────────────────────────────────

  setDocType(value: UiDocType): void {
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

  private updatePageParam(index: number): void {
    const pageId = this.pages()[index]?.pageId;
    if (!pageId) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: pageId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  async prevPage(): Promise<void> {
    const prev = this.currentPageIndex() - 1;
    if (prev < 0) return;
    this.currentPageIndex.set(prev);
    this.viewMode.set('move');
    this.updatePageParam(prev);
    await this.loadPageBinary(prev);
  }

  async nextOrSave(): Promise<void> {
    await this.saveCurrent();
    if (this.isLastPage()) {
      this.completed.emit(this.pages().length);
      this.backToList.emit();
    } else {
      const next = this.currentPageIndex() + 1;
      this.currentPageIndex.set(next);
      this.viewMode.set('move');
      this.updatePageParam(next);
      await this.loadPageBinary(next);
    }
  }

  // ── API save ─────────────────────────────────────────────────────────────────

  private async saveCurrent(): Promise<void> {
    const idx  = this.currentPageIndex();
    const page = this.pages()[idx];
    if (!page || !page.docType) return;

    const orgId = this.contextSwitcher.selectedId();
    if (!orgId || !this.datasetId) return;

    this.saving.set(true);
    try {
      // Save zones (full replacement)
      await firstValueFrom(
        this.datasetService.saveZones(
          orgId,
          this.datasetId,
          page.pageId,
          page.rects.map(toApiZone),
        )
      );

      // Mark the page as processed with its document type
      await firstValueFrom(
        this.datasetService.updatePage(orgId, this.datasetId, page.pageId, {
          processed:     true,
          document_type: toApiDocType(page.docType),
        })
      );

      this.pages.update((pages) => {
        const updated = [...pages];
        updated[idx] = { ...updated[idx], saved: true };
        return updated;
      });
    } catch (err: unknown) {
      const detail = (err as { error?: { detail?: string } })?.error?.detail ?? 'Impossible de sauvegarder la page.';
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail });
      throw err; // re-throw so nextOrSave() stops
    } finally {
      this.saving.set(false);
    }
  }

  // ── Resume existing dataset ──────────────────────────────────────────────────

  async resumeFromDataset(datasetId: string, startPageId?: string): Promise<void> {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    this.datasetId = datasetId;
    this.importing.set(true);
    this.importStatus.set('Chargement du dataset…');

    try {
      const allPages: TrainingPage[] = [];
      const PAGE_LIMIT = 100;
      let pageNum = 1;
      let fetched = 0;
      let total = Infinity;

      while (fetched < total) {
        const resp = await firstValueFrom(
          this.datasetService.listPages(orgId, datasetId, { page: pageNum, limit: PAGE_LIMIT })
        );
        total = resp.total;
        for (const p of resp.data) {
          allPages.push({
            pageId:     p.id,
            filename:   p.original_filename,
            pageNumber: p.page_number,
            pdfData:    null,
            docType:    fromApiDocType(p.document_type),
            rects:      [], // zones loaded lazily when the page opens
            saved:      p.processed,
          });
        }
        fetched += resp.data.length;
        pageNum++;
        if (resp.data.length === 0) break;
      }

      allPages.sort((a, b) => a.filename.localeCompare(b.filename) || a.pageNumber - b.pageNumber);

      // Jump to the requested page, or the first unprocessed one
      const startIndex = startPageId
        ? Math.max(0, allPages.findIndex((p) => p.pageId === startPageId))
        : Math.max(0, allPages.findIndex((p) => !p.saved));

      this.pages.set(allPages);
      this.currentPageIndex.set(startIndex);
      this.importing.set(false);
      this.state.set('annotating');

      await this.loadPageBinary(startIndex);
    } catch (err: unknown) {
      this.importing.set(false);
      const detail = (err as { error?: { detail?: string } })?.error?.detail ?? 'Erreur lors du chargement.';
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail });
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  reset(): void {
    this.state.set('import');
    this.pages.set([]);
    this.currentPageIndex.set(0);
    this.viewMode.set('move');
    this.datasetId = null;
    this.backToList.emit();
  }

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────

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
      case '1': this.activeType.set('texte');   break;
      case '2': this.activeType.set('image');   break;
      case '3': this.activeType.set('tableau'); break;
    }
  }
}

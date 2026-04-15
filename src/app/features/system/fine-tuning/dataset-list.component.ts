import { Component, inject, output, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { firstValueFrom } from 'rxjs';
import { DatasetService, ApiDataset, ApiPage, DatasetStatus } from '../../../core/services/dataset.service';
import { ContextSwitcherService } from '../../../core/layout/context-switcher/context-switcher.service';

export interface DatasetOpenEvent {
  datasetId: string;
  startPageId?: string;
}

const PAGE_LIMIT = 20;

@Component({
  selector: 'app-dataset-list',
  imports: [DatePipe, ButtonModule, ToastModule, TooltipModule, ConfirmDialogModule],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast position="bottom-right" [life]="3500" />
    <p-confirmDialog />

    <!-- Hidden file input for PDF import -->
    <input #fileInput type="file" accept=".pdf" multiple hidden (change)="onFileInputChange($event)" />

    <div class="dl-root">

      <!-- ── Left: dataset list ───────────────────────────────────────────── -->
      <div class="dl-list">
        <div class="dl-list-header">
          <span class="dl-list-title">Datasets</span>
          <p-button icon="fa-regular fa-plus" label="Nouveau" size="small" rounded (onClick)="newDataset.emit()" />
        </div>

        @if (loading()) {
          <div class="dl-spinner"><i class="fa-solid fa-spinner fa-spin"></i></div>
        } @else if (datasets().length === 0) {
          <div class="dl-empty">
            <i class="fa-regular fa-folder-open"></i>
            <span>Aucun dataset</span>
          </div>
        } @else {
          <ul class="dl-items">
            @for (ds of datasets(); track ds.id) {
              <li class="dl-item" [class.active]="selected()?.id === ds.id" (click)="select(ds)">
                <div class="dl-item-main">
                  <span class="dl-item-name">{{ ds.name }}</span>
                  <span class="dl-item-meta">
                    {{ ds.page_count ?? 0 }} page{{ (ds.page_count ?? 0) > 1 ? 's' : '' }}
                    · {{ ds.created_at | date:'dd/MM/yyyy' }}
                  </span>
                </div>
                <span class="dl-status" [class]="'dl-status--' + ds.status">{{ statusLabel(ds.status) }}</span>
              </li>
            }
          </ul>
        }
      </div>

      <!-- ── Right: detail ─────────────────────────────────────────────────── -->
      <div class="dl-detail">
        @if (!selected()) {
          <div class="dl-detail-empty">
            <i class="fa-regular fa-rectangle-list"></i>
            <span>Sélectionnez un dataset pour voir les détails</span>
          </div>
        } @else {
          <div class="dl-detail-content">

            <!-- Header -->
            <div class="dl-detail-header">
              <div class="dl-detail-title-row">
                <span class="dl-detail-name">{{ selected()!.name }}</span>
                <span class="dl-status dl-status--lg" [class]="'dl-status--' + selected()!.status">
                  {{ statusLabel(selected()!.status) }}
                </span>
              </div>
              <div class="dl-detail-actions">
                <p-button
                  label="Ajouter un fichier"
                  icon="fa-regular fa-file-plus"
                  severity="secondary"
                  size="small"
                  rounded
                  [loading]="importing()"
                  pTooltip="Importer un ou plusieurs PDF dans ce dataset"
                  tooltipPosition="bottom"
                  (onClick)="fileInput.click()"
                />
                @if (selected()!.status !== 'ready') {
                  <p-button
                    label="Continuer"
                    icon="fa-regular fa-play"
                    size="small"
                    rounded
                    [loading]="resuming()"
                    (onClick)="resumeDataset()"
                    pTooltip="Reprend à la première page non traitée"
                    tooltipPosition="bottom"
                  />
                }
                <p-button
                  icon="fa-regular fa-trash"
                  severity="danger"
                  [text]="true"
                  size="small"
                  rounded
                  pTooltip="Supprimer"
                  tooltipPosition="bottom"
                  (onClick)="confirmDelete()"
                />
              </div>
            </div>

            <!-- Stats -->
            <div class="dl-stats">
              <div class="dl-stat">
                <span class="dl-stat-value">{{ selected()!.page_count ?? 0 }}</span>
                <span class="dl-stat-label">Pages</span>
              </div>
              <div class="dl-stat">
                <span class="dl-stat-value dl-stat-value--ok">{{ selected()!.processed_count ?? 0 }}</span>
                <span class="dl-stat-label">Traitées</span>
              </div>
              <div class="dl-stat">
                <span class="dl-stat-value dl-stat-value--warn">
                  {{ (selected()!.page_count ?? 0) - (selected()!.processed_count ?? 0) }}
                </span>
                <span class="dl-stat-label">En attente</span>
              </div>
              <div class="dl-stat">
                <span class="dl-stat-value">{{ selected()!.file_count ?? 0 }}</span>
                <span class="dl-stat-label">Fichier{{ (selected()!.file_count ?? 0) > 1 ? 's' : '' }}</span>
              </div>
            </div>

            <!-- Progress bar -->
            @if ((selected()!.page_count ?? 0) > 0) {
              <div class="dl-progress-wrap">
                <div class="dl-progress-bar">
                  <div class="dl-progress-fill" [style.width.%]="progressPct()"></div>
                </div>
                <span class="dl-progress-label">{{ progressPct() }}%</span>
              </div>
            }

            <!-- Pages list -->
            @if (loadingDetail()) {
              <div class="dl-spinner"><i class="fa-solid fa-spinner fa-spin"></i></div>
            } @else {
              <div class="dl-pages-section">
                <div class="dl-pages-header">
                  <span class="dl-pages-title">Pages</span>
                  <span class="dl-pages-count">{{ pagesTotal() }} au total</span>
                </div>

                @if (pages().length > 0) {
                  <ul class="dl-pages-list">
                    @for (p of pages(); track p.id) {
                      <li class="dl-page-item" (click)="openPage(p.id)">
                        <i class="fa-regular fa-file-pdf dl-page-icon"></i>
                        <span class="dl-page-name">{{ p.original_filename }}</span>
                        <span class="dl-page-num">p.&nbsp;{{ p.page_number }}</span>
                        @if (p.processed) {
                          <span class="dl-page-status dl-page-status--done">
                            <i class="fa-regular fa-circle-check"></i> Traitée
                          </span>
                        } @else {
                          <span class="dl-page-status dl-page-status--pending">
                            <i class="fa-regular fa-circle-dashed"></i> En attente
                          </span>
                        }
                        <i class="fa-regular fa-arrow-right dl-page-arrow"></i>
                      </li>
                    }
                  </ul>

                  <!-- Pagination -->
                  @if (totalPagesPagination() > 1) {
                    <div class="dl-pagination">
                      <button
                        class="dl-pag-btn"
                        [disabled]="currentPage() === 1"
                        (click)="goToPage(currentPage() - 1)"
                      ><i class="fa-regular fa-chevron-left"></i></button>

                      @for (n of pageNumbers(); track n) {
                        @if (n === -1) {
                          <span class="dl-pag-ellipsis">…</span>
                        } @else {
                          <button
                            class="dl-pag-btn"
                            [class.active]="n === currentPage()"
                            (click)="goToPage(n)"
                          >{{ n }}</button>
                        }
                      }

                      <button
                        class="dl-pag-btn"
                        [disabled]="currentPage() === totalPagesPagination()"
                        (click)="goToPage(currentPage() + 1)"
                      ><i class="fa-regular fa-chevron-right"></i></button>
                    </div>
                  }
                } @else {
                  <div class="dl-all-done">
                    <i class="fa-regular fa-circle-check"></i>
                    <span>Aucune page dans ce dataset</span>
                  </div>
                }
              </div>
            }

          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: flex; flex: 1; overflow: hidden; }

    .dl-root { display: flex; flex: 1; overflow: hidden; }

    /* ── Left list ─────────────────────────────────────────────────────────── */
    .dl-list {
      width: 280px;
      flex-shrink: 0;
      border-right: 1px solid var(--surface-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dl-list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: .875rem 1rem;
      border-bottom: 1px solid var(--surface-border);
      flex-shrink: 0;
    }

    .dl-list-title { font-size: .875rem; font-weight: 600; }

    .dl-items { list-style: none; margin: 0; padding: .375rem; overflow-y: auto; flex: 1; }

    .dl-item {
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .625rem .75rem;
      border-radius: 8px;
      cursor: pointer;
      transition: background .12s;
      &:hover { background: var(--p-surface-hover); }
      &.active { background: color-mix(in srgb, var(--p-primary-500) 10%, transparent); }
    }

    .dl-item-main { display: flex; flex-direction: column; gap: .125rem; flex: 1; min-width: 0; }
    .dl-item-name { font-size: .8125rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dl-item-meta { font-size: .6875rem; color: var(--p-text-muted-color); }

    /* ── Status badge ──────────────────────────────────────────────────────── */
    .dl-status {
      font-size: .625rem;
      font-weight: 700;
      padding: .125rem .4rem;
      border-radius: 4px;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: .03em;
      flex-shrink: 0;
      &--lg { font-size: .6875rem; padding: .2rem .5rem; }
      &--draft       { background: color-mix(in srgb, var(--p-text-muted-color) 15%, transparent); color: var(--p-text-muted-color); }
      &--in_progress { background: color-mix(in srgb, #f59e0b 18%, transparent); color: #d97706; }
      &--ready       { background: color-mix(in srgb, #10b981 18%, transparent); color: #059669; }
    }

    /* ── Detail panel ──────────────────────────────────────────────────────── */
    .dl-detail { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }

    .dl-detail-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: .625rem;
      color: var(--p-text-muted-color);
      font-size: .875rem;
      i { font-size: 2rem; }
    }

    .dl-detail-content { display: flex; flex-direction: column; gap: 1.25rem; padding: 1.5rem; }

    .dl-detail-header { display: flex; flex-direction: column; gap: .75rem; }

    .dl-detail-title-row { display: flex; align-items: center; gap: .75rem; }

    .dl-detail-name { font-size: 1.125rem; font-weight: 600; flex: 1; }

    .dl-detail-actions { display: flex; gap: .5rem; align-items: center; }

    /* ── Stats ─────────────────────────────────────────────────────────────── */
    .dl-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: .75rem; }

    .dl-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: .25rem;
      padding: .875rem .5rem;
      border: 1px solid var(--surface-border);
      border-radius: 10px;
      background: var(--p-surface-card);
    }

    .dl-stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1;
      &--ok   { color: #10b981; }
      &--warn { color: #f59e0b; }
    }

    .dl-stat-label { font-size: .6875rem; color: var(--p-text-muted-color); text-align: center; }

    /* ── Progress bar ──────────────────────────────────────────────────────── */
    .dl-progress-wrap { display: flex; align-items: center; gap: .75rem; }

    .dl-progress-bar { flex: 1; height: 6px; border-radius: 3px; background: var(--surface-border); overflow: hidden; }

    .dl-progress-fill { height: 100%; border-radius: 3px; background: var(--p-primary-500); transition: width .3s; }

    .dl-progress-label { font-size: .75rem; color: var(--p-text-muted-color); white-space: nowrap; min-width: 36px; text-align: right; }

    /* ── Pages section ─────────────────────────────────────────────────────── */
    .dl-pages-section { display: flex; flex-direction: column; gap: .625rem; }

    .dl-pages-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .dl-pages-title { font-size: .8125rem; font-weight: 600; }

    .dl-pages-count { font-size: .75rem; color: var(--p-text-muted-color); }

    .dl-pages-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }

    .dl-page-item {
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .5rem .75rem;
      border-radius: 7px;
      cursor: pointer;
      font-size: .8125rem;
      transition: background .12s;
      &:hover { background: var(--p-surface-hover); }
      &:hover .dl-page-arrow { opacity: 1; }
    }

    .dl-page-icon { color: var(--p-text-muted-color); flex-shrink: 0; }

    .dl-page-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .dl-page-num { font-size: .75rem; color: var(--p-text-muted-color); flex-shrink: 0; }

    .dl-page-status {
      display: inline-flex;
      align-items: center;
      gap: .2rem;
      font-size: .6875rem;
      font-weight: 600;
      padding: .1rem .4rem;
      border-radius: 999px;
      flex-shrink: 0;
      i { font-size: .6875rem; }

      &--done    { background: color-mix(in srgb, #10b981 15%, transparent); color: #059669; }
      &--pending { background: color-mix(in srgb, #f59e0b 15%, transparent); color: #d97706; }
    }

    .dl-page-arrow { color: var(--p-primary-500); font-size: .75rem; opacity: 0; transition: opacity .12s; flex-shrink: 0; }

    /* ── Pagination ────────────────────────────────────────────────────────── */
    .dl-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding-top: .25rem;
    }

    .dl-pag-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 30px;
      height: 30px;
      padding: 0 .4rem;
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      font-size: .75rem;
      color: var(--p-text-color);
      transition: background .12s;
      &:hover:not(:disabled):not(.active) { background: var(--p-surface-hover); }
      &.active { background: var(--p-primary-500); color: #fff; border-color: var(--p-primary-500); font-weight: 700; }
      &:disabled { opacity: .35; cursor: default; }
    }

    .dl-pag-ellipsis { font-size: .75rem; color: var(--p-text-muted-color); padding: 0 .2rem; }

    .dl-all-done {
      display: flex;
      align-items: center;
      gap: .5rem;
      font-size: .875rem;
      color: #10b981;
      padding: .75rem;
      background: color-mix(in srgb, #10b981 10%, transparent);
      border-radius: 8px;
      i { font-size: 1rem; }
    }

    /* ── Shared ────────────────────────────────────────────────────────────── */
    .dl-spinner { display: flex; justify-content: center; padding: 2rem; color: var(--p-primary-500); font-size: 1.25rem; }

    .dl-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      color: var(--p-text-muted-color);
      font-size: .875rem;
      i { font-size: 1.75rem; }
    }
  `,
})
export class DatasetListComponent implements OnInit {
  private readonly datasetService      = inject(DatasetService);
  private readonly contextSwitcher     = inject(ContextSwitcherService);
  private readonly messageService      = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly newDataset = output<void>();
  readonly openEditor = output<DatasetOpenEvent>();

  readonly loading       = signal(true);
  readonly loadingDetail = signal(false);
  readonly resuming      = signal(false);
  readonly importing     = signal(false);
  readonly datasets      = signal<ApiDataset[]>([]);
  readonly selected      = signal<ApiDataset | null>(null);

  // ── Pages pagination ────────────────────────────────────────────────────────
  readonly pages       = signal<ApiPage[]>([]);
  readonly pagesTotal  = signal(0);
  readonly currentPage = signal(1);

  readonly totalPagesPagination = computed(() => Math.ceil(this.pagesTotal() / PAGE_LIMIT));

  /** Compact page number list with ellipsis (max 7 buttons) */
  readonly pageNumbers = computed(() => {
    const total = this.totalPagesPagination();
    const cur   = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (cur > 3)           pages.push(-1);
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2)   pages.push(-1);
    pages.push(total);
    return pages;
  });

  readonly progressPct = computed(() => {
    const ds = this.selected();
    if (!ds || !ds.page_count) return 0;
    return Math.round(((ds.processed_count ?? 0) / ds.page_count) * 100);
  });

  ngOnInit(): void { this.loadDatasets(); }

  async loadDatasets(): Promise<void> {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.loading.set(true);
    try {
      const list = await firstValueFrom(this.datasetService.listDatasets(orgId));
      this.datasets.set(list);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les datasets.' });
    } finally {
      this.loading.set(false);
    }
  }

  async select(ds: ApiDataset): Promise<void> {
    this.selected.set(ds);
    this.currentPage.set(1);
    await this.loadPages(ds.id, 1);
  }

  async goToPage(page: number): Promise<void> {
    const ds = this.selected();
    if (!ds) return;
    this.currentPage.set(page);
    await this.loadPages(ds.id, page);
  }

  private async loadPages(datasetId: string, page: number): Promise<void> {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.loadingDetail.set(true);
    try {
      // First fetch unprocessed pages, then processed — merge in that order
      // We achieve this by fetching page N of the full sorted list:
      // The API sorts by processed asc, page_number asc (backend contract)
      const resp = await firstValueFrom(
        this.datasetService.listPages(orgId, datasetId, { page, limit: PAGE_LIMIT })
      );
      this.pages.set(resp.data);
      this.pagesTotal.set(resp.total);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les pages.' });
    } finally {
      this.loadingDetail.set(false);
    }
  }

  // ── Import additional file ──────────────────────────────────────────────────

  async onFileInputChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).filter((f) => f.name.endsWith('.pdf'));
    input.value = '';
    if (!files.length) return;

    const ds    = this.selected();
    const orgId = this.contextSwitcher.selectedId();
    if (!ds || !orgId) return;

    this.importing.set(true);
    try {
      for (const file of files) {
        await firstValueFrom(this.datasetService.importFile(orgId, ds.id, file));
      }
      // Refresh dataset summary + page list
      const updated = await firstValueFrom(this.datasetService.getDataset(orgId, ds.id));
      this.selected.set(updated);
      this.datasets.update((list) => list.map((d) => d.id === updated.id ? updated : d));
      this.currentPage.set(1);
      await this.loadPages(ds.id, 1);
      this.messageService.add({
        severity: 'success',
        summary: 'Import réussi',
        detail: `${files.length} fichier${files.length > 1 ? 's importés' : ' importé'}.`,
      });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible d\'importer le fichier.' });
    } finally {
      this.importing.set(false);
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  openPage(pageId: string): void {
    const ds = this.selected();
    if (!ds) return;
    this.openEditor.emit({ datasetId: ds.id, startPageId: pageId });
  }

  resumeDataset(): void {
    const ds = this.selected();
    if (!ds) return;
    this.openEditor.emit({ datasetId: ds.id });
  }

  confirmDelete(): void {
    this.confirmationService.confirm({
      message: `Supprimer le dataset « ${this.selected()!.name} » ? Cette action est irréversible.`,
      header: 'Confirmer la suppression',
      icon: 'fa-regular fa-triangle-exclamation',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteSelected(),
    });
  }

  private async deleteSelected(): Promise<void> {
    const ds    = this.selected();
    const orgId = this.contextSwitcher.selectedId();
    if (!ds || !orgId) return;
    try {
      await firstValueFrom(this.datasetService.deleteDataset(orgId, ds.id));
      this.datasets.update((list) => list.filter((d) => d.id !== ds.id));
      this.selected.set(null);
      this.pages.set([]);
      this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: `Dataset « ${ds.name} » supprimé.` });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer le dataset.' });
    }
  }

  statusLabel(status: DatasetStatus): string {
    switch (status) {
      case 'draft':       return 'Brouillon';
      case 'in_progress': return 'En cours';
      case 'ready':       return 'Prêt';
    }
  }
}

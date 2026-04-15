import { Component, inject, output, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PaginatorState } from 'primeng/paginator';
import { firstValueFrom } from 'rxjs';
import { DatasetService, ApiDataset, ApiPage, DatasetStatus } from '../../../core/services/dataset.service';
import { ContextSwitcherService } from '../../../core/layout/context-switcher/context-switcher.service';
import { PaginatorBarComponent } from '../../../shared/components/paginator-bar/paginator-bar.component';

export interface DatasetOpenEvent {
  datasetId: string;
  startPageId?: string;
}

type SortField = 'default' | 'filename' | 'page_number' | 'status';

@Component({
  selector: 'app-dataset-list',
  imports: [DatePipe, FormsModule, ButtonModule, SelectModule, ToastModule, TooltipModule, ConfirmDialogModule, PaginatorBarComponent],
  providers: [MessageService, ConfirmationService],
  styleUrl: './dataset-list.component.scss',
  template: `
    <p-toast position="bottom-right" [life]="3500" />
    <p-confirmDialog />

    <input #fileInput type="file" accept=".pdf" multiple hidden (change)="onFileInputChange($event)" />

    <div class="dl-wrapper">

      <!-- Toolbar -->
      <div class="dl-toolbar">
        @if (!loading()) {
          <span class="dl-toolbar-count">
            {{ datasets().length }} dataset{{ datasets().length > 1 ? 's' : '' }}
          </span>
        } @else {
          <span></span>
        }
        <p-button icon="fa-regular fa-plus" label="Nouveau dataset" size="small" rounded (onClick)="newDataset.emit()" />
      </div>

      <!-- Main layout -->
      <div class="dl-layout">

        <!-- ── Left: card grid ─────────────────────────────────────────────── -->
        <div class="dl-main">
          <div class="dl-body">
            @if (loading()) {
              <div class="dl-spinner"><i class="fa-solid fa-spinner fa-spin"></i></div>
            } @else if (datasets().length === 0) {
              <div class="dl-empty">
                <i class="fa-regular fa-folder-open"></i>
                <span>Aucun dataset · Créez votre premier pour commencer.</span>
              </div>
            } @else {
              <div class="dl-grid">
                @for (ds of datasets(); track ds.id) {
                  <div class="ds-card" [class.selected]="expanded()?.id === ds.id" (click)="toggle(ds)">

                    <div class="ds-card-header">
                      <div class="ds-card-name-group">
                        <span class="ds-card-name">{{ ds.name }}</span>
                        <span class="dl-status" [class]="'dl-status--' + ds.status">{{ statusLabel(ds.status) }}</span>
                      </div>
                    </div>

                    <p class="ds-card-description">
                      {{ ds.page_count ?? 0 }} page{{ (ds.page_count ?? 0) > 1 ? 's' : '' }}
                      · {{ ds.file_count ?? 0 }} fichier{{ (ds.file_count ?? 0) > 1 ? 's' : '' }}
                    </p>

                    <div class="ds-card-footer">
                      <div class="ds-card-footer-stats">
                        @if ((ds.processed_count ?? 0) > 0) {
                          <span class="stat-ok">{{ ds.processed_count }} traitée{{ (ds.processed_count ?? 0) > 1 ? 's' : '' }}</span>
                          <span class="sep">·</span>
                        }
                        @if ((ds.page_count ?? 0) - (ds.processed_count ?? 0) > 0) {
                          <span class="stat-warn">{{ (ds.page_count ?? 0) - (ds.processed_count ?? 0) }} en attente</span>
                        }
                        @if ((ds.processed_count ?? 0) === 0 && (ds.page_count ?? 0) === 0) {
                          <span>Aucune page</span>
                        }
                      </div>
                      <span class="ds-card-date">{{ ds.created_at | date:'dd/MM/yyyy' }}</span>
                    </div>

                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- ── Right: detail panel ─────────────────────────────────────────── -->
        @if (expanded()) {
          <div class="dl-panel">

            <!-- Panel header -->
            <div class="dl-panel-header">
              <div class="dl-panel-title-row">
                <span class="dl-panel-name">{{ expanded()!.name }}</span>
                <span class="dl-status dl-status--lg" [class]="'dl-status--' + expanded()!.status">
                  {{ statusLabel(expanded()!.status) }}
                </span>
                <p-button
                  icon="fa-regular fa-xmark"
                  severity="secondary"
                  [text]="true"
                  size="small"
                  rounded
                  pTooltip="Fermer"
                  tooltipPosition="bottom"
                  (onClick)="expanded.set(null)"
                />
              </div>
              <div class="dl-panel-actions">
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
                @if (expanded()!.status !== 'ready') {
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
                <span class="dl-stat-value">{{ expanded()!.page_count ?? 0 }}</span>
                <span class="dl-stat-label">Pages</span>
              </div>
              <div class="dl-stat">
                <span class="dl-stat-value dl-stat-value--ok">{{ expanded()!.processed_count ?? 0 }}</span>
                <span class="dl-stat-label">Traitées</span>
              </div>
              <div class="dl-stat">
                <span class="dl-stat-value dl-stat-value--warn">
                  {{ (expanded()!.page_count ?? 0) - (expanded()!.processed_count ?? 0) }}
                </span>
                <span class="dl-stat-label">En attente</span>
              </div>
              <div class="dl-stat">
                <span class="dl-stat-value">{{ expanded()!.file_count ?? 0 }}</span>
                <span class="dl-stat-label">Fichier{{ (expanded()!.file_count ?? 0) > 1 ? 's' : '' }}</span>
              </div>
            </div>

            <!-- Pages section -->
            <div class="dl-pages-section">

              <div class="dl-pages-header">
                <span class="dl-pages-title">Pages</span>
                <span class="dl-pages-count">{{ pagesTotal() }} au total</span>
                <div class="dl-pages-controls">
                  <p-select
                    [options]="sortOptions"
                    optionLabel="label"
                    optionValue="value"
                    [ngModel]="sortField()"
                    (ngModelChange)="sortField.set($event)"
                    size="small"
                    appendTo="body"
                  />
                  <p-button
                    [icon]="sortDir() === 'asc' ? 'fa-regular fa-arrow-up' : 'fa-regular fa-arrow-down'"
                    severity="secondary"
                    size="small"
                    [text]="true"
                    [rounded]="true"
                    [pTooltip]="sortDir() === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'"
                    tooltipPosition="bottom"
                    (onClick)="toggleSortDir()"
                  />
                </div>
              </div>

              @if (loadingDetail()) {
                <div class="dl-spinner dl-spinner--sm"><i class="fa-solid fa-spinner fa-spin"></i></div>
              } @else if (pages().length === 0) {
                <div class="dl-pages-empty">
                  <i class="fa-regular fa-file-slash"></i>
                  <span>Aucune page dans ce dataset</span>
                </div>
              } @else {
                <ul class="dl-pages-list">
                  @for (p of sortedPages(); track p.id) {
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

                <app-paginator-bar
                  [first]="(currentPage() - 1) * pageLimit()"
                  [rows]="pageLimit()"
                  [totalRecords]="pagesTotal()"
                  [rowsPerPageOptions]="[5, 10, 15, 20]"
                  (pageChange)="onPageChange($event)"
                />
              }

            </div>
          </div>
        }

      </div>
    </div>
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
  readonly expanded      = signal<ApiDataset | null>(null);

  // ── Pages pagination ────────────────────────────────────────────────────────
  readonly pages       = signal<ApiPage[]>([]);
  readonly pagesTotal  = signal(0);
  readonly currentPage = signal(1);
  readonly pageLimit   = signal<number>(10);

  // ── Sort ────────────────────────────────────────────────────────────────────
  readonly sortField = signal<SortField>('default');
  readonly sortDir   = signal<'asc' | 'desc'>('asc');

  readonly sortOptions: { label: string; value: SortField }[] = [
    { label: 'Tri par défaut',  value: 'default'     },
    { label: 'Nom de fichier',  value: 'filename'    },
    { label: 'Numéro de page',  value: 'page_number' },
    { label: 'Statut',          value: 'status'      },
  ];


  readonly sortedPages = computed(() => {
    const list  = this.pages();
    const field = this.sortField();
    const dir   = this.sortDir();
    if (field === 'default') return list;
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (field === 'filename')    cmp = a.original_filename.localeCompare(b.original_filename);
      if (field === 'page_number') cmp = a.page_number - b.page_number;
      if (field === 'status')      cmp = Number(a.processed) - Number(b.processed);
      return dir === 'asc' ? cmp : -cmp;
    });
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

  async toggle(ds: ApiDataset): Promise<void> {
    if (this.expanded()?.id === ds.id) {
      this.expanded.set(null);
      return;
    }
    this.expanded.set(ds);
    this.currentPage.set(1);
    await this.loadPages(ds.id, 1);
  }

toggleSortDir(): void {
    this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
  }

  async onPageChange(state: PaginatorState): Promise<void> {
    const newLimit = state.rows ?? this.pageLimit();
    const newPage  = newLimit !== this.pageLimit() ? 1 : (state.page ?? 0) + 1;
    this.pageLimit.set(newLimit);
    this.currentPage.set(newPage);
    const ds = this.expanded();
    if (ds) await this.loadPages(ds.id, newPage);
  }

  private async loadPages(datasetId: string, page: number): Promise<void> {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.loadingDetail.set(true);
    try {
      const resp = await firstValueFrom(
        this.datasetService.listPages(orgId, datasetId, { page, limit: this.pageLimit() })
      );
      this.pages.set(resp.data);
      this.pagesTotal.set(resp.total);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les pages.' });
    } finally {
      this.loadingDetail.set(false);
    }
  }

  async onFileInputChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).filter((f) => f.name.endsWith('.pdf'));
    input.value = '';
    if (!files.length) return;

    const ds    = this.expanded();
    const orgId = this.contextSwitcher.selectedId();
    if (!ds || !orgId) return;

    this.importing.set(true);
    try {
      for (const file of files) {
        await firstValueFrom(this.datasetService.importFile(orgId, ds.id, file));
      }
      const updated = await firstValueFrom(this.datasetService.getDataset(orgId, ds.id));
      this.expanded.set(updated);
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

  openPage(pageId: string): void {
    const ds = this.expanded();
    if (!ds) return;
    this.openEditor.emit({ datasetId: ds.id, startPageId: pageId });
  }

  resumeDataset(): void {
    const ds = this.expanded();
    if (!ds) return;
    this.openEditor.emit({ datasetId: ds.id });
  }

  confirmDelete(): void {
    this.confirmationService.confirm({
      message: `Supprimer le dataset « ${this.expanded()!.name} » ? Cette action est irréversible.`,
      header: 'Confirmer la suppression',
      icon: 'fa-regular fa-triangle-exclamation',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteExpanded(),
    });
  }

  private async deleteExpanded(): Promise<void> {
    const ds    = this.expanded();
    const orgId = this.contextSwitcher.selectedId();
    if (!ds || !orgId) return;
    try {
      await firstValueFrom(this.datasetService.deleteDataset(orgId, ds.id));
      this.datasets.update((list) => list.filter((d) => d.id !== ds.id));
      this.expanded.set(null);
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

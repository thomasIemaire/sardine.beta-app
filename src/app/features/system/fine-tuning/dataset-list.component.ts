import { Component, ElementRef, inject, output, signal, computed, OnInit, viewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ContextMenu } from 'primeng/contextmenu';
import { MessageService, MenuItem } from 'primeng/api';
import { PaginatorState } from 'primeng/paginator';
import { firstValueFrom } from 'rxjs';
import { DatasetService, ApiDataset, ApiPage, DatasetStatus } from '../../../core/services/dataset.service';
import { ContextSwitcherService } from '../../../core/layout/context-switcher/context-switcher.service';
import { DataListComponent, ListColumn } from '../../../shared/components/data-list/data-list.component';
import { PaginatorBarComponent } from '../../../shared/components/paginator-bar/paginator-bar.component';
import { CreateDatasetDialogComponent } from './create-dataset-dialog.component';
import type { ActiveFilter, FilterDefinition, ActiveSort } from '../../../shared/components/toolbar/models/filter.models';
import type { ViewMode } from '../../../shared/components/toolbar/toolbar.component';

export interface DatasetOpenEvent {
  datasetId: string;
  startPageId?: string;
}

type PageSortField = 'default' | 'filename' | 'page_number' | 'status';

@Component({
  selector: 'app-dataset-list',
  imports: [DatePipe, FormsModule, ButtonModule, SelectModule, ToastModule, TooltipModule, DialogModule, InputTextModule, ContextMenu, DataListComponent, PaginatorBarComponent, CreateDatasetDialogComponent],
  providers: [MessageService],
  styleUrl: './dataset-list.component.scss',
  template: `
    <p-toast position="bottom-right" [life]="3500" />
    <p-contextmenu #dsCm />

    <!-- ── Delete confirmation ───────────────────────────────────────────── -->
    <p-dialog
      [(visible)]="deleteDialogVisible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [closable]="false"
      [style]="{ width: '420px' }"
    >
      <ng-template pTemplate="header">
        <div style="display:flex;align-items:center;gap:.5rem">
          <i class="fa-regular fa-trash" style="color:var(--p-red-400);font-size:.875rem"></i>
          <span style="font-size:.9375rem;font-weight:600">Supprimer le dataset</span>
        </div>
      </ng-template>
      <div style="display:flex;flex-direction:column;gap:.375rem;padding:.125rem 0 .5rem">
        <span style="font-weight:600;font-size:.9375rem">{{ deleteTarget?.name }}</span>
        <span style="font-size:.8125rem;color:var(--p-text-muted-color);line-height:1.5">
          Cette action est irréversible. Le dataset et toutes ses pages seront définitivement supprimés.
        </span>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" [text]="true" size="small" rounded (onClick)="deleteDialogVisible.set(false)" />
        <p-button label="Supprimer" severity="danger" size="small" rounded [loading]="deleting()" (onClick)="executeDelete()" />
      </ng-template>
    </p-dialog>

    <app-create-dataset-dialog [(visible)]="showCreateDialog" (created)="onDatasetCreated($event)" />

    <input #fileInput type="file" accept=".pdf" multiple hidden (change)="onFileInputChange($event)" />

    <div class="dl-wrapper">
      <div class="dl-layout">

        <!-- ── Left: dataset list ─────────────────────────────────────────── -->
        <div class="dl-main">
          <app-data-list
            searchPlaceholder="Rechercher un dataset..."
            [(search)]="search"
            [(sorts)]="sorts"
            [(filters)]="filters"
            [filterDefinitions]="filterDefinitions"
            [sortDefinitions]="sortDefinitions"
            [(viewMode)]="viewMode"
            [columns]="listColumns"
            [gridTemplate]="gridTpl"
            [listTemplate]="listTpl"
            emptyIcon="fa-regular fa-database"
            [emptyTitle]="hasActiveFilters() ? 'Aucun résultat' : 'Aucun dataset'"
            [emptySubtitle]="hasActiveFilters() ? 'Aucun dataset ne correspond à vos critères.' : 'Créez votre premier dataset pour commencer.'"
            [totalRecords]="filteredDatasets().length"
            [paginatorFirst]="dsFirst()"
            [paginatorRows]="dsRows()"
            [rowsPerPageOptions]="[6, 12, 24, 48]"
            (pageChange)="onDatasetsPageChange($event)"
          >
            <p-button
              label="Nouveau dataset"
              icon="fa-regular fa-plus"
              size="small"
              rounded
              toolbar-actions
              (onClick)="showCreateDialog.set(true)"
            />
          </app-data-list>
        </div>

        <!-- ── Right: detail panel ─────────────────────────────────────────── -->
        @if (expanded()) {
          <div class="dl-panel">

            <div class="dl-panel-header">
              <div class="dl-panel-title-row">
                @if (isRenaming()) {
                  <input
                    #renameInput
                    pInputText
                    pSize="small"
                    [(ngModel)]="renameName"
                    (keyup.enter)="submitRename()"
                    (keyup.escape)="cancelRename()"
                    class="dl-panel-name-input"
                  />
                  <p-button
                    icon="fa-regular fa-check"
                    severity="success"
                    [text]="true"
                    size="small"
                    rounded
                    pTooltip="Valider"
                    tooltipPosition="bottom"
                    [loading]="renaming()"
                    (onClick)="submitRename()"
                  />
                  <p-button
                    icon="fa-regular fa-xmark"
                    severity="secondary"
                    [text]="true"
                    size="small"
                    rounded
                    pTooltip="Annuler"
                    tooltipPosition="bottom"
                    (onClick)="cancelRename()"
                  />
                } @else {
                  <span class="dl-panel-name">{{ expanded()!.name }}</span>
                  <p-button
                    icon="fa-regular fa-pencil"
                    severity="secondary"
                    [text]="true"
                    size="small"
                    rounded
                    pTooltip="Renommer"
                    tooltipPosition="bottom"
                    (onClick)="startRename(expanded()!)"
                  />
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
                    (onClick)="closePanel()"
                  />
                }
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

            <div class="dl-pages-section">
              <div class="dl-pages-header">
                <span class="dl-pages-title">Pages</span>
                <span class="dl-pages-count">{{ pagesTotal() }} au total</span>
                <div class="dl-pages-controls">
                  <p-select
                    [options]="sortOptions"
                    optionLabel="label"
                    optionValue="value"
                    [ngModel]="pageSortField()"
                    (ngModelChange)="pageSortField.set($event)"
                    size="small"
                    appendTo="body"
                  />
                  <p-button
                    [icon]="pageSortDir() === 'asc' ? 'fa-regular fa-arrow-up' : 'fa-regular fa-arrow-down'"
                    severity="secondary"
                    size="small"
                    [text]="true"
                    [rounded]="true"
                    [pTooltip]="pageSortDir() === 'asc' ? 'Croissant' : 'Décroissant'"
                    tooltipPosition="bottom"
                    (onClick)="togglePageSortDir()"
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
                  @for (p of paginatedPages(); track p.id) {
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
                  [first]="pagesFirst()"
                  [rows]="pagesRows()"
                  [totalRecords]="pagesTotal()"
                  [rowsPerPageOptions]="[5, 10, 15, 20]"
                  (pageChange)="onPagesPageChange($event)"
                />
              }
            </div>

          </div>
        }

      </div>
    </div>

    <!-- ── Card template ──────────────────────────────────────────────────── -->
    <ng-template #gridTpl>
      @for (ds of paginatedDatasets(); track ds.id) {
        <div class="ds-card" [class.selected]="expanded()?.id === ds.id" (click)="toggle(ds)" (contextmenu)="onContextMenu($event, ds)">
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
    </ng-template>

    <!-- ── List row template ──────────────────────────────────────────────── -->
    <ng-template #listTpl>
      @for (ds of paginatedDatasets(); track ds.id) {
        <div class="ds-row" [class.selected]="expanded()?.id === ds.id" (click)="toggle(ds)" (contextmenu)="onContextMenu($event, ds)">
          <div class="ds-row-main">
            <div class="ds-row-name-group">
              <span class="ds-card-name">{{ ds.name }}</span>
              <span class="dl-status" [class]="'dl-status--' + ds.status">{{ statusLabel(ds.status) }}</span>
            </div>
            <span class="ds-row-meta">
              {{ ds.page_count ?? 0 }} page{{ (ds.page_count ?? 0) > 1 ? 's' : '' }}
              · {{ ds.file_count ?? 0 }} fichier{{ (ds.file_count ?? 0) > 1 ? 's' : '' }}
            </span>
          </div>
          <span class="ds-row-date col-date">{{ ds.created_at | date:'dd/MM/yyyy' }}</span>
        </div>
      }
    </ng-template>
  `,
})
export class DatasetListComponent implements OnInit {
  private readonly datasetService      = inject(DatasetService);
  private readonly contextSwitcher     = inject(ContextSwitcherService);
  private readonly messageService = inject(MessageService);
  private readonly router         = inject(Router);
  private readonly route               = inject(ActivatedRoute);

  readonly openEditor = output<DatasetOpenEvent>();

  // ── Context menu ────────────────────────────────────────────────────────────
  private readonly dsCm = viewChild<ContextMenu>('dsCm');

  onContextMenu(event: MouseEvent, ds: ApiDataset): void {
    const cm = this.dsCm();
    if (!cm) return;
    cm.model = [
      { label: 'Ouvrir', icon: 'fa-regular fa-arrow-up-right-from-square', command: () => this.toggle(ds) },
      { separator: true },
      { label: 'Renommer', icon: 'fa-regular fa-pencil', command: () => this.startRename(ds) },
      { label: 'Supprimer', icon: 'fa-regular fa-trash', styleClass: 'p-danger', command: () => this.confirmDelete(ds) },
    ] as MenuItem[];
    cm.show(event);
  }

  // ── Inline rename ────────────────────────────────────────────────────────────
  private readonly renameInputRef = viewChild<ElementRef<HTMLInputElement>>('renameInput');
  readonly isRenaming = signal(false);
  readonly renaming   = signal(false);
  renameName          = '';
  renameTarget: ApiDataset | null = null;

  async startRename(ds: ApiDataset): Promise<void> {
    if (this.expanded()?.id !== ds.id) {
      await this.toggle(ds);
    }
    // Wait for the panel to render, then enter edit mode
    setTimeout(() => {
      this.renameTarget = ds;
      this.renameName   = this.expanded()?.name ?? ds.name;
      this.isRenaming.set(true);
      // Wait for the input to render, then focus + select
      setTimeout(() => {
        const el = this.renameInputRef()?.nativeElement;
        if (el) { el.focus(); el.select(); }
      });
    });
  }

  cancelRename(): void {
    this.isRenaming.set(false);
    this.renameTarget = null;
  }

  async submitRename(): Promise<void> {
    const ds      = this.renameTarget ?? this.expanded();
    const newName = this.renameName.trim();
    if (!ds || !newName) return;
    if (newName === ds.name) { this.isRenaming.set(false); return; }
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.renaming.set(true);
    try {
      const updated = await firstValueFrom(this.datasetService.renameDataset(orgId, ds.id, newName));
      this.datasets.update(list => list.map(d => d.id === updated.id ? updated : d));
      if (this.expanded()?.id === updated.id) this.expanded.set(updated);
      this.isRenaming.set(false);
      this.renameTarget = null;
      this.messageService.add({ severity: 'success', summary: 'Renommé', detail: `Dataset renommé en « ${updated.name} ».` });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de renommer le dataset.' });
    } finally {
      this.renaming.set(false);
    }
  }

  // ── Create dialog ───────────────────────────────────────────────────────────
  readonly showCreateDialog = signal(false);

  onDatasetCreated(dataset: ApiDataset): void {
    this.datasets.update(list => [dataset, ...list]);
    this.toggle(dataset);
  }

  // ── Dataset list ────────────────────────────────────────────────────────────
  readonly loading  = signal(true);
  readonly datasets = signal<ApiDataset[]>([]);
  readonly expanded = signal<ApiDataset | null>(null);

  // DataList toolbar — getter/setter backed by signals for computed reactivity
  private readonly _search  = signal('');
  private readonly _sorts   = signal<ActiveSort[]>([]);
  private readonly _filters = signal<ActiveFilter[]>([]);

  get search(): string { return this._search(); }
  set search(v: string) { this._search.set(v); this.dsFirst.set(0); }

  get sorts(): ActiveSort[] { return this._sorts(); }
  set sorts(v: ActiveSort[]) { this._sorts.set(v); this.dsFirst.set(0); }

  get filters(): ActiveFilter[] { return this._filters(); }
  set filters(v: ActiveFilter[]) { this._filters.set(v); this.dsFirst.set(0); }

  private _viewMode: ViewMode = (localStorage.getItem('viewMode:datasets') as ViewMode) ?? 'grid';
  get viewMode(): ViewMode { return this._viewMode; }
  set viewMode(v: ViewMode) { this._viewMode = v; localStorage.setItem('viewMode:datasets', v); }

  readonly dsFirst = signal(0);
  readonly dsRows  = signal(12);

  readonly listColumns: ListColumn[] = [
    { label: 'Nom',     cssClass: 'col-flex' },
    { label: 'Créé le', cssClass: 'col-date' },
  ];

  readonly sortDefinitions = [
    { id: 'name',  label: 'Nom'              },
    { id: 'date',  label: 'Date de création' },
    { id: 'pages', label: 'Nombre de pages'  },
  ];

  readonly filterDefinitions: FilterDefinition[] = [
    {
      id: 'status', label: 'Statut', type: 'select',
      options: [
        { value: 'draft',       label: 'Brouillon' },
        { value: 'in_progress', label: 'En cours'  },
        { value: 'ready',       label: 'Prêt'      },
      ],
    },
  ];

  readonly filteredDatasets = computed(() => {
    let list = this.datasets();
    const q  = this._search().toLowerCase().trim();
    if (q) list = list.filter(ds => ds.name.toLowerCase().includes(q));
    for (const f of this._filters()) {
      if (f.definitionId === 'status') list = list.filter(ds => ds.status === f.value);
    }
    const sort = this._sorts()[0];
    if (sort) {
      list = [...list].sort((a, b) => {
        let cmp = 0;
        if (sort.definitionId === 'name')  cmp = a.name.localeCompare(b.name);
        if (sort.definitionId === 'date')  cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sort.definitionId === 'pages') cmp = (a.page_count ?? 0) - (b.page_count ?? 0);
        return sort.direction === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  });

  readonly paginatedDatasets = computed(() =>
    this.filteredDatasets().slice(this.dsFirst(), this.dsFirst() + this.dsRows())
  );

  hasActiveFilters(): boolean {
    return this._filters().length > 0 || this._search().length > 0;
  }

  onDatasetsPageChange(state: PaginatorState): void {
    this.dsFirst.set(state.first ?? 0);
    if (state.rows != null) this.dsRows.set(state.rows);
  }

  // ── Pages (detail panel) ────────────────────────────────────────────────────
  readonly loadingDetail = signal(false);
  readonly resuming      = signal(false);
  readonly importing     = signal(false);
  readonly pages         = signal<ApiPage[]>([]);
  readonly pagesFirst    = signal(0);
  readonly pagesRows     = signal(10);
  readonly pageSortField = signal<PageSortField>('default');
  readonly pageSortDir   = signal<'asc' | 'desc'>('asc');

  /** Total count derived from the full in-memory list */
  readonly pagesTotal = computed(() => this.pages().length);

  readonly sortOptions = [
    { label: 'Tri par défaut',  value: 'default'     as PageSortField },
    { label: 'Nom de fichier',  value: 'filename'    as PageSortField },
    { label: 'Numéro de page',  value: 'page_number' as PageSortField },
    { label: 'Statut',          value: 'status'      as PageSortField },
  ];

  /** Sort across the full page list */
  readonly sortedPages = computed(() => {
    const list  = this.pages();
    const field = this.pageSortField();
    const dir   = this.pageSortDir();
    if (field === 'default') return list;
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (field === 'filename')    cmp = a.original_filename.localeCompare(b.original_filename);
      if (field === 'page_number') cmp = a.page_number - b.page_number;
      if (field === 'status')      cmp = Number(a.processed) - Number(b.processed);
      return dir === 'asc' ? cmp : -cmp;
    });
  });

  /** Slice of the sorted list for the current paginator page */
  readonly paginatedPages = computed(() =>
    this.sortedPages().slice(this.pagesFirst(), this.pagesFirst() + this.pagesRows())
  );

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnInit(): void { this.loadDatasets(); }

  async loadDatasets(): Promise<void> {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.loading.set(true);
    try {
      const list = await firstValueFrom(this.datasetService.listDatasets(orgId));
      this.datasets.set(list);
      // Restore panel from URL
      const datasetId = this.route.snapshot.queryParamMap.get('dataset');
      if (datasetId) {
        const ds = list.find(d => d.id === datasetId);
        if (ds) await this.toggle(ds);
      }
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les datasets.' });
    } finally {
      this.loading.set(false);
    }
  }

  async toggle(ds: ApiDataset): Promise<void> {
    if (this.expanded()?.id === ds.id) {
      this.closePanel();
      return;
    }
    this.expanded.set(ds);
    this.isRenaming.set(false);
    this.setDatasetParam(ds.id);
    this.pagesFirst.set(0);
    await this.loadPages(ds.id);
  }

  closePanel(): void {
    this.expanded.set(null);
    this.isRenaming.set(false);
    this.setDatasetParam(null);
  }

  private setDatasetParam(id: string | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { dataset: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  togglePageSortDir(): void {
    this.pageSortDir.update(d => d === 'asc' ? 'desc' : 'asc');
  }

  onPagesPageChange(state: PaginatorState): void {
    this.pagesFirst.set(state.first ?? 0);
    if (state.rows != null) this.pagesRows.set(state.rows);
  }

  private async loadPages(datasetId: string): Promise<void> {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.loadingDetail.set(true);
    try {
      const all: ApiPage[] = [];
      const BATCH = 100;
      let apiPage = 1, fetched = 0, total = Infinity;
      while (fetched < total) {
        const resp = await firstValueFrom(
          this.datasetService.listPages(orgId, datasetId, { page: apiPage, limit: BATCH })
        );
        total = resp.total;
        all.push(...resp.data);
        fetched += resp.data.length;
        apiPage++;
        if (resp.data.length === 0) break;
      }
      this.pages.set(all);
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les pages.' });
    } finally {
      this.loadingDetail.set(false);
    }
  }

  async onFileInputChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).filter(f => f.name.endsWith('.pdf'));
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
      this.datasets.update(list => list.map(d => d.id === updated.id ? updated : d));
      this.pagesFirst.set(0);
      await this.loadPages(ds.id);
      this.messageService.add({ severity: 'success', summary: 'Import réussi', detail: `${files.length} fichier${files.length > 1 ? 's importés' : ' importé'}.` });
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

  // ── Delete dialog ────────────────────────────────────────────────────────────
  readonly deleteDialogVisible = signal(false);
  readonly deleting            = signal(false);
  deleteTarget: ApiDataset | null = null;

  confirmDelete(target?: ApiDataset): void {
    const ds = target ?? this.expanded();
    if (!ds) return;
    this.deleteTarget = ds;
    this.deleteDialogVisible.set(true);
  }

  async executeDelete(): Promise<void> {
    const ds    = this.deleteTarget;
    const orgId = this.contextSwitcher.selectedId();
    if (!ds || !orgId) return;
    this.deleting.set(true);
    try {
      await firstValueFrom(this.datasetService.deleteDataset(orgId, ds.id));
      this.datasets.update(list => list.filter(d => d.id !== ds.id));
      if (this.expanded()?.id === ds.id) { this.closePanel(); this.pages.set([]); }
      this.deleteDialogVisible.set(false);
      this.deleteTarget = null;
      this.messageService.add({ severity: 'success', summary: 'Supprimé', detail: `Dataset « ${ds.name} » supprimé.` });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer le dataset.' });
    } finally {
      this.deleting.set(false);
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

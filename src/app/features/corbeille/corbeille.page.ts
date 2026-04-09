import { Component, OnInit, inject, signal, computed, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ContextMenu } from 'primeng/contextmenu';
import { MessageService, MenuItem } from 'primeng/api';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { DataListComponent, ListColumn } from '../../shared/components/data-list/data-list.component';
import type { ViewMode } from '../../shared/components/toolbar/toolbar.component';
import type { ActiveSort, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import {
  DocumentService,
  fileTypeFromMime,
  formatFileSize,
  DocFileType,
} from '../../core/services/document.service';
import { FlowService } from '../../core/services/flow.service';
import { AgentService } from '../../core/services/agent.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

type TrashCategory = 'documents' | 'agents' | 'flows';

interface TrashItem {
  id: string;
  name: string;
  isFolder: boolean;
  type: DocFileType;
  size?: number;
  deletedAt: Date;
  expiresAt: Date;
}

interface SoftTrashItem {
  id: string;
  name: string;
  deletedAt: Date;
}

@Component({
  selector: 'app-corbeille',
  imports: [
    DatePipe, ButtonModule, TooltipModule, DialogModule, ToastModule, ContextMenu,
    PageComponent, HeaderPageComponent, DataListComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <p-contextmenu #cm />

    <app-page>
      <app-header-page
        title="Corbeille"
        subtitle="Éléments supprimés — conservés 30 jours"
        [facets]="facets"
        defaultFacetId="documents"
        (facetChange)="onCategoryChange($event)"
      />

      <div class="docs-body">

        <!-- ── Fichiers ── -->
        @if (activeCategory() === 'documents') {
          <app-data-list
            gridMinWidth="155px"
            gridGap="0.5rem"
            gridPadding="0.75rem 1rem 1rem"
            searchPlaceholder="Rechercher dans la corbeille..."
            [sortDefinitions]="fileSortDefs"
            [columns]="fileColumns"
            [(search)]="fileSearch"
            [(sorts)]="fileActiveSorts"
            [(viewMode)]="fileViewMode"
            emptyIcon="fa-regular fa-trash"
            emptyTitle="La corbeille est vide"
            emptySubtitle="Les éléments supprimés apparaîtront ici pendant 30 jours."
            [totalRecords]="displayedFileItems().length"
            [gridTemplate]="fileGridTpl"
            [listTemplate]="fileListTpl"
          >
            <p-button
              toolbar-actions
              label="Vider la corbeille"
              icon="fa-regular fa-trash"
              severity="danger"
              [rounded]="true"
              size="small"
              [disabled]="fileItems().length === 0 || fileLoading()"
              (onClick)="showEmptyConfirm = true"
            />
          </app-data-list>
        }

        <!-- ── Agents ── -->
        @if (activeCategory() === 'agents') {
          <app-data-list
            searchPlaceholder="Rechercher un agent..."
            [sortDefinitions]="agentSortDefs"
            [columns]="agentColumns"
            [(search)]="agentSearch"
            [(sorts)]="agentActiveSorts"
            [(viewMode)]="agentViewMode"
            emptyIcon="fa-regular fa-robot"
            emptyTitle="La corbeille des agents est vide"
            emptySubtitle="Les agents supprimés apparaîtront ici pendant 30 jours."
            [totalRecords]="displayedAgentItems().length"
            [gridTemplate]="agentGridTpl"
            [listTemplate]="agentListTpl"
          />
        }

        <!-- ── Flows ── -->
        @if (activeCategory() === 'flows') {
          <app-data-list
            searchPlaceholder="Rechercher un flow..."
            [sortDefinitions]="flowSortDefs"
            [columns]="flowColumns"
            [(search)]="flowSearch"
            [(sorts)]="flowActiveSorts"
            [(viewMode)]="flowViewMode"
            emptyIcon="fa-regular fa-chart-diagram"
            emptyTitle="La corbeille des flows est vide"
            emptySubtitle="Les flows supprimés apparaîtront ici pendant 30 jours."
            [totalRecords]="displayedFlowItems().length"
            [gridTemplate]="flowGridTpl"
            [listTemplate]="flowListTpl"
          />
        }

      </div>
    </app-page>

    <!-- ══ File grid template ══ -->
    <ng-template #fileGridTpl>
      @if (displayedFileFolders().length > 0) {
        @for (item of displayedFileFolders(); track item.id) {
          <div class="doc-card doc-card--folder" [class.is-expiring]="isExpiringSoon(item)"
               (contextmenu)="onFileContextMenu($event, item)">
            <i class="doc-card-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
            <div class="doc-card-info">
              <span class="doc-card-name" [title]="item.name">{{ item.name }}</span>
              <span class="doc-card-meta">
                Expire {{ item.expiresAt | date:'dd/MM/yy' }}
                @if (isExpiringSoon(item)) { <span class="expiring-dot"></span> }
              </span>
            </div>
            <div class="doc-card-action soft-actions">
              <p-button icon="fa-regular fa-rotate-left" pTooltip="Restaurer" tooltipPosition="left"
                severity="secondary" [text]="true" [rounded]="true" size="small" (onClick)="restoreFile(item)" />
              <p-button icon="fa-regular fa-trash" pTooltip="Supprimer définitivement" tooltipPosition="left"
                severity="danger" [text]="true" [rounded]="true" size="small" (onClick)="purgeFileItem(item)" />
            </div>
          </div>
        }
      }
      @if (displayedFileFiles().length > 0) {
        <div class="docs-section-header">
          <span class="docs-section-label">Fichiers</span>
          <span class="docs-section-count">{{ displayedFileFiles().length }}</span>
        </div>
        @for (item of displayedFileFiles(); track item.id) {
          <div class="doc-card" [class.is-expiring]="isExpiringSoon(item)"
               (contextmenu)="onFileContextMenu($event, item)">
            <i class="doc-card-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
            <div class="doc-card-info">
              <span class="doc-card-name" [title]="item.name">{{ item.name }}</span>
              <span class="doc-card-meta">
                {{ item.size ? sizeLabel(item.size) + ' · ' : '' }}Expire {{ item.expiresAt | date:'dd/MM/yy' }}
                @if (isExpiringSoon(item)) { <span class="expiring-dot"></span> }
              </span>
            </div>
            <div class="doc-card-action">
              <p-button icon="fa-regular fa-rotate-left" pTooltip="Restaurer" tooltipPosition="left"
                severity="secondary" [text]="true" [rounded]="true" size="small" (onClick)="restoreFile(item)" />
            </div>
          </div>
        }
      }
    </ng-template>

    <!-- ══ File list template ══ -->
    <ng-template #fileListTpl>
      @if (displayedFileFolders().length > 0) {
        @for (item of displayedFileFolders(); track item.id) {
          <div class="doc-row doc-row--folder" [class.is-expiring]="isExpiringSoon(item)"
               (contextmenu)="onFileContextMenu($event, item)">
            <div class="doc-row-main">
              <i class="doc-row-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
              <div class="doc-row-text">
                <span class="doc-row-name">{{ item.name }}</span>
                <span class="doc-row-meta">Dossier @if (isExpiringSoon(item)) { · <span class="expiring-badge">Expire bientôt</span> }</span>
              </div>
            </div>
            <span class="doc-row-date">{{ item.deletedAt | date:'dd/MM/yy' }}</span>
            <span class="doc-row-date" [class.doc-row-date--warn]="isExpiringSoon(item)">{{ item.expiresAt | date:'dd/MM/yy' }}</span>
            <div class="soft-actions">
              <p-button icon="fa-regular fa-rotate-left" pTooltip="Restaurer" tooltipPosition="left"
                severity="secondary" [text]="true" [rounded]="true" size="small" (onClick)="restoreFile(item)" />
              <p-button icon="fa-regular fa-trash" pTooltip="Supprimer définitivement" tooltipPosition="left"
                severity="danger" [text]="true" [rounded]="true" size="small" (onClick)="purgeFileItem(item)" />
            </div>
          </div>
        }
      }
      @if (displayedFileFiles().length > 0) {
        <div class="docs-section-row-header">
          <span class="docs-section-label">Fichiers</span>
          <span class="docs-section-count">{{ displayedFileFiles().length }}</span>
        </div>
        @for (item of displayedFileFiles(); track item.id) {
          <div class="doc-row" [class.is-expiring]="isExpiringSoon(item)"
               (contextmenu)="onFileContextMenu($event, item)">
            <div class="doc-row-main">
              <i class="doc-row-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
              <div class="doc-row-text">
                <span class="doc-row-name">{{ item.name }}</span>
                <span class="doc-row-meta">{{ item.size ? sizeLabel(item.size) : '' }} @if (isExpiringSoon(item)) { · <span class="expiring-badge">Expire bientôt</span> }</span>
              </div>
            </div>
            <span class="doc-row-date">{{ item.deletedAt | date:'dd/MM/yy' }}</span>
            <span class="doc-row-date" [class.doc-row-date--warn]="isExpiringSoon(item)">{{ item.expiresAt | date:'dd/MM/yy' }}</span>
            <p-button icon="fa-regular fa-rotate-left" pTooltip="Restaurer" tooltipPosition="left"
              severity="secondary" [text]="true" [rounded]="true" size="small" (onClick)="restoreFile(item)" />
          </div>
        }
      }
    </ng-template>

    <!-- ══ Agent grid template ══ -->
    <ng-template #agentGridTpl>
      @for (item of displayedAgentItems(); track item.id) {
        <div class="doc-card" (contextmenu)="onSoftContextMenu($event, item, 'agent')">
          <i class="doc-card-icon fa-regular fa-robot" data-type="agent"></i>
          <div class="doc-card-info">
            <span class="doc-card-name" [title]="item.name">{{ item.name }}</span>
            <span class="doc-card-meta">Supprimé le {{ item.deletedAt | date:'dd/MM/yy' }}</span>
          </div>
          <div class="doc-card-action soft-actions">
            <p-button icon="fa-regular fa-rotate-left" pTooltip="Restaurer" tooltipPosition="left"
              severity="secondary" [text]="true" [rounded]="true" size="small" (onClick)="restoreAgent(item)" />
            <p-button icon="fa-regular fa-trash" pTooltip="Supprimer définitivement" tooltipPosition="left"
              severity="danger" [text]="true" [rounded]="true" size="small" (onClick)="purgeAgent(item)" />
          </div>
        </div>
      }
    </ng-template>

    <!-- ══ Agent list template ══ -->
    <ng-template #agentListTpl>
      @for (item of displayedAgentItems(); track item.id) {
        <div class="doc-row" (contextmenu)="onSoftContextMenu($event, item, 'agent')">
          <div class="doc-row-main">
            <i class="doc-row-icon fa-regular fa-robot" data-type="agent"></i>
            <div class="doc-row-text">
              <span class="doc-row-name">{{ item.name }}</span>
            </div>
          </div>
          <span class="doc-row-date">{{ item.deletedAt | date:'dd/MM/yy' }}</span>
          <div class="soft-actions">
            <p-button icon="fa-regular fa-rotate-left" pTooltip="Restaurer" tooltipPosition="left"
              severity="secondary" [text]="true" [rounded]="true" size="small" (onClick)="restoreAgent(item)" />
            <p-button icon="fa-regular fa-trash" pTooltip="Supprimer définitivement" tooltipPosition="left"
              severity="danger" [text]="true" [rounded]="true" size="small" (onClick)="purgeAgent(item)" />
          </div>
        </div>
      }
    </ng-template>

    <!-- ══ Flow grid template ══ -->
    <ng-template #flowGridTpl>
      @for (item of displayedFlowItems(); track item.id) {
        <div class="doc-card" (contextmenu)="onSoftContextMenu($event, item, 'flow')">
          <i class="doc-card-icon fa-regular fa-chart-diagram" data-type="flow"></i>
          <div class="doc-card-info">
            <span class="doc-card-name" [title]="item.name">{{ item.name }}</span>
            <span class="doc-card-meta">Supprimé le {{ item.deletedAt | date:'dd/MM/yy' }}</span>
          </div>
          <div class="doc-card-action soft-actions">
            <p-button icon="fa-regular fa-rotate-left" pTooltip="Restaurer" tooltipPosition="left"
              severity="secondary" [text]="true" [rounded]="true" size="small" (onClick)="restoreFlow(item)" />
            <p-button icon="fa-regular fa-trash" pTooltip="Supprimer définitivement" tooltipPosition="left"
              severity="danger" [text]="true" [rounded]="true" size="small" (onClick)="purgeFlow(item)" />
          </div>
        </div>
      }
    </ng-template>

    <!-- ══ Flow list template ══ -->
    <ng-template #flowListTpl>
      @for (item of displayedFlowItems(); track item.id) {
        <div class="doc-row" (contextmenu)="onSoftContextMenu($event, item, 'flow')">
          <div class="doc-row-main">
            <i class="doc-row-icon fa-regular fa-chart-diagram" data-type="flow"></i>
            <div class="doc-row-text">
              <span class="doc-row-name">{{ item.name }}</span>
            </div>
          </div>
          <span class="doc-row-date">{{ item.deletedAt | date:'dd/MM/yy' }}</span>
          <div class="soft-actions">
            <p-button icon="fa-regular fa-rotate-left" pTooltip="Restaurer" tooltipPosition="left"
              severity="secondary" [text]="true" [rounded]="true" size="small" (onClick)="restoreFlow(item)" />
            <p-button icon="fa-regular fa-trash" pTooltip="Supprimer définitivement" tooltipPosition="left"
              severity="danger" [text]="true" [rounded]="true" size="small" (onClick)="purgeFlow(item)" />
          </div>
        </div>
      }
    </ng-template>

    <!-- ══ Empty trash confirm ══ -->
    <p-dialog
      [(visible)]="showEmptyConfirm"
      header="Vider la corbeille"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '380px' }"
    >
      <p style="margin: 0.25rem 0; font-size: 0.875rem; line-height: 1.6">
        Cette action est <strong>irréversible</strong>. Les
        {{ fileItems().length }} élément{{ fileItems().length > 1 ? 's' : '' }} seront supprimés définitivement.
      </p>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" size="small" [text]="true" rounded (onClick)="showEmptyConfirm = false" />
        <p-button label="Vider définitivement" severity="danger" size="small" rounded [loading]="emptying" (onClick)="emptyTrash()" />
      </ng-template>
    </p-dialog>
  `,
  styleUrl: '../documents/documents.page.scss',
  styles: [`
    .soft-actions {
      display: flex; align-items: center; gap: .125rem;
    }

    .doc-card.is-expiring,
    .doc-row.is-expiring {
      background: color-mix(in srgb, var(--p-orange-500, #f97316) 6%, transparent);
    }

    .expiring-dot {
      display: inline-block;
      width: .4rem; height: .4rem;
      border-radius: 999px;
      background: var(--p-orange-500, #f97316);
      vertical-align: middle;
      margin-left: .25rem;
    }

    .expiring-badge {
      font-size: 0.6rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--p-orange-500, #f97316);
      background: color-mix(in srgb, var(--p-orange-500, #f97316) 12%, transparent);
      padding: .1rem .35rem; border-radius: 99px;
    }

    .doc-row-date--warn {
      color: var(--p-orange-500, #f97316);
      font-weight: 600;
    }
  `],
})
export class CorbeillePage implements OnInit {
  private readonly docService = inject(DocumentService);
  private readonly flowService = inject(FlowService);
  private readonly agentService = inject(AgentService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly messageService = inject(MessageService);
  private readonly cm = viewChild<ContextMenu>('cm');

  readonly activeCategory = signal<TrashCategory>('documents');

  readonly facets: Facet[] = [
    { id: 'documents', label: 'Documents' },
    { id: 'agents', label: 'Agents' },
    { id: 'flows', label: 'Flows' },
  ];

  // ── Fichiers ──────────────────────────────────────────────────────────────

  readonly fileLoading = signal(false);
  readonly fileItems = signal<TrashItem[]>([]);

  fileSearch = '';
  showEmptyConfirm = false;
  emptying = false;

  private _fileViewMode: ViewMode = (localStorage.getItem('viewMode:corbeille') as ViewMode) ?? 'grid';
  get fileViewMode(): ViewMode { return this._fileViewMode; }
  set fileViewMode(v: ViewMode) { this._fileViewMode = v; localStorage.setItem('viewMode:corbeille', v); }

  fileActiveSorts: ActiveSort[] = [];

  readonly fileSortDefs: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'deletedAt', label: 'Supprimé le' },
    { id: 'expiresAt', label: 'Expire le' },
    { id: 'size', label: 'Taille' },
  ];

  readonly fileColumns: ListColumn[] = [
    { label: 'Nom', cssClass: 'col-flex' },
    { label: 'Supprimé le', cssClass: 'col-date' },
    { label: 'Expire le', cssClass: 'col-date' },
    { label: '', cssClass: 'col-actions' },
  ];

  readonly displayedFileItems = computed(() => this.applyFileFiltersAndSort(this.fileItems()));
  readonly displayedFileFolders = computed(() => this.displayedFileItems().filter(i => i.isFolder));
  readonly displayedFileFiles = computed(() => this.displayedFileItems().filter(i => !i.isFolder));

  // ── Agents ────────────────────────────────────────────────────────────────

  readonly agentLoading = signal(false);
  readonly agentItems = signal<SoftTrashItem[]>([]);

  agentSearch = '';

  private _agentViewMode: ViewMode = (localStorage.getItem('viewMode:corbeille-agents') as ViewMode) ?? 'list';
  get agentViewMode(): ViewMode { return this._agentViewMode; }
  set agentViewMode(v: ViewMode) { this._agentViewMode = v; localStorage.setItem('viewMode:corbeille-agents', v); }

  agentActiveSorts: ActiveSort[] = [];

  readonly agentSortDefs: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'deletedAt', label: 'Supprimé le' },
  ];

  readonly agentColumns: ListColumn[] = [
    { label: 'Nom', cssClass: 'col-flex' },
    { label: 'Supprimé le', cssClass: 'col-date' },
    { label: '', cssClass: 'col-actions' },
  ];

  readonly displayedAgentItems = computed(() => this.applySoftFiltersAndSort(this.agentItems(), this.agentSearch, this.agentActiveSorts));

  // ── Flows ─────────────────────────────────────────────────────────────────

  readonly flowLoading = signal(false);
  readonly flowItems = signal<SoftTrashItem[]>([]);

  flowSearch = '';

  private _flowViewMode: ViewMode = (localStorage.getItem('viewMode:corbeille-flows') as ViewMode) ?? 'list';
  get flowViewMode(): ViewMode { return this._flowViewMode; }
  set flowViewMode(v: ViewMode) { this._flowViewMode = v; localStorage.setItem('viewMode:corbeille-flows', v); }

  flowActiveSorts: ActiveSort[] = [];

  readonly flowSortDefs: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'deletedAt', label: 'Supprimé le' },
  ];

  readonly flowColumns: ListColumn[] = [
    { label: 'Nom', cssClass: 'col-flex' },
    { label: 'Supprimé le', cssClass: 'col-date' },
    { label: '', cssClass: 'col-actions' },
  ];

  readonly displayedFlowItems = computed(() => this.applySoftFiltersAndSort(this.flowItems(), this.flowSearch, this.flowActiveSorts));

  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadFiles();
  }

  onCategoryChange(facet: Facet): void {
    this.activeCategory.set(facet.id as TrashCategory);
    if (facet.id === 'documents' && this.fileItems().length === 0 && !this.fileLoading()) {
      this.loadFiles();
    }
    if (facet.id === 'agents' && this.agentItems().length === 0 && !this.agentLoading()) {
      this.loadAgents();
    }
    if (facet.id === 'flows' && this.flowItems().length === 0 && !this.flowLoading()) {
      this.loadFlows();
    }
  }

  // ── Context menus ─────────────────────────────────────────────────────────

  onFileContextMenu(event: MouseEvent, item: TrashItem): void {
    const menu = this.cm();
    if (!menu) return;
    const model: MenuItem[] = [
      { label: 'Restaurer', icon: 'fa-regular fa-rotate-left', command: () => this.restoreFile(item) },
    ];
    model.push(
      { separator: true },
      { label: 'Supprimer définitivement', icon: 'fa-regular fa-trash', styleClass: 'p-danger', command: () => this.purgeFileItem(item) },
    );
    menu.model = model;
    menu.show(event);
  }

  onSoftContextMenu(event: MouseEvent, item: SoftTrashItem, kind: 'agent' | 'flow'): void {
    const menu = this.cm();
    if (!menu) return;
    const restore = kind === 'agent' ? () => this.restoreAgent(item) : () => this.restoreFlow(item);
    const purge   = kind === 'agent' ? () => this.purgeAgent(item)   : () => this.purgeFlow(item);
    menu.model = [
      { label: 'Restaurer', icon: 'fa-regular fa-rotate-left', command: restore },
      { separator: true },
      { label: 'Supprimer définitivement', icon: 'fa-regular fa-trash', styleClass: 'p-danger', command: purge },
    ] as MenuItem[];
    menu.show(event);
  }

  // ── Fichiers methods ──────────────────────────────────────────────────────

  private loadFiles(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.fileLoading.set(true);

    forkJoin({
      folders: this.docService.getTrashFolders(orgId),
      files: this.docService.getTrashFiles(orgId),
    }).subscribe({
      next: ({ folders, files }) => {
        const folderItems: TrashItem[] = (folders ?? []).map(f => ({
          id: f.id,
          name: f.name,
          isFolder: true,
          type: 'folder' as DocFileType,
          deletedAt: new Date(f.deleted_at),
          expiresAt: new Date(f.expires_at),
        }));
        const fileItems: TrashItem[] = (files ?? []).map(f => ({
          id: f.id,
          name: f.name,
          isFolder: false,
          type: fileTypeFromMime(f.mime_type, f.name),
          size: f.size,
          deletedAt: new Date(f.deleted_at),
          expiresAt: new Date(f.expires_at),
        }));
        this.fileItems.set([...folderItems, ...fileItems]);
        this.fileLoading.set(false);
      },
      error: () => {
        this.fileLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la corbeille.' });
      },
    });
  }

  restoreFile(item: TrashItem): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    const obs = item.isFolder
      ? this.docService.restoreFolder(orgId, item.id)
      : this.docService.restoreFile(orgId, item.id);

    obs.subscribe({
      next: () => {
        this.fileItems.update(list => list.filter(i => i.id !== item.id));
        this.messageService.add({ severity: 'success', summary: 'Restauré', detail: item.name });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de restaurer.' }),
    });
  }

  purgeFileItem(item: TrashItem): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    const obs = item.isFolder
      ? this.docService.purgeFolder(orgId, item.id)
      : this.docService.purgeFile(orgId, item.id);
    obs.subscribe({
      next: () => {
        this.fileItems.update(list => list.filter(i => i.id !== item.id));
        const label = item.isFolder ? 'Dossier supprimé' : 'Fichier supprimé';
        this.messageService.add({ severity: 'success', summary: label, detail: `"${item.name}" a été supprimé définitivement.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer définitivement cet élément.' }),
    });
  }

  emptyTrash(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.emptying = true;
    this.docService.emptyTrash(orgId).subscribe({
      next: () => {
        this.fileItems.set([]);
        this.showEmptyConfirm = false;
        this.emptying = false;
        this.messageService.add({ severity: 'success', summary: 'Corbeille vidée' });
      },
      error: () => {
        this.emptying = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de vider la corbeille.' });
      },
    });
  }

  // ── Agents methods ────────────────────────────────────────────────────────

  private loadAgents(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.agentLoading.set(true);

    this.agentService.getTrashAgents(orgId).subscribe({
      next: (agents) => {
        this.agentItems.set(agents.map(a => ({
          id: a.id,
          name: a.name,
          deletedAt: a.deletedAt ? new Date(a.deletedAt) : new Date(),
        })));
        this.agentLoading.set(false);
      },
      error: () => {
        this.agentLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la corbeille des agents.' });
      },
    });
  }

  restoreAgent(item: SoftTrashItem): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.agentService.restoreAgent(orgId, item.id).subscribe({
      next: () => {
        this.agentItems.update(list => list.filter(a => a.id !== item.id));
        this.messageService.add({ severity: 'success', summary: 'Agent restauré', detail: `"${item.name}" a été restauré.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de restaurer cet agent.' }),
    });
  }

  purgeAgent(item: SoftTrashItem): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.agentService.purgeAgent(orgId, item.id).subscribe({
      next: () => {
        this.agentItems.update(list => list.filter(a => a.id !== item.id));
        this.messageService.add({ severity: 'success', summary: 'Agent supprimé', detail: `"${item.name}" a été supprimé définitivement.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer définitivement cet agent.' }),
    });
  }

  // ── Flows methods ─────────────────────────────────────────────────────────

  private loadFlows(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.flowLoading.set(true);

    this.flowService.getTrashFlows(orgId).subscribe({
      next: (flows) => {
        this.flowItems.set(flows.map(f => ({
          id: f.id,
          name: f.name,
          deletedAt: f.deletedAt ? new Date(f.deletedAt) : new Date(),
        })));
        this.flowLoading.set(false);
      },
      error: () => {
        this.flowLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la corbeille des flows.' });
      },
    });
  }

  restoreFlow(item: SoftTrashItem): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.flowService.restoreFlow(orgId, item.id).subscribe({
      next: () => {
        this.flowItems.update(list => list.filter(f => f.id !== item.id));
        this.messageService.add({ severity: 'success', summary: 'Flow restauré', detail: `"${item.name}" a été restauré.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de restaurer ce flow.' }),
    });
  }

  purgeFlow(item: SoftTrashItem): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.flowService.purgeFlow(orgId, item.id).subscribe({
      next: () => {
        this.flowItems.update(list => list.filter(f => f.id !== item.id));
        this.messageService.add({ severity: 'success', summary: 'Flow supprimé', detail: `"${item.name}" a été supprimé définitivement.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer définitivement ce flow.' }),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  isExpiringSoon(item: TrashItem): boolean {
    const daysLeft = (item.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 7;
  }

  sizeLabel(size: number): string {
    return formatFileSize(size);
  }

  iconClass(type: DocFileType): string {
    switch (type) {
      case 'folder': return 'fa-regular fa-folder';
      case 'pdf':    return 'fa-regular fa-file-pdf';
      case 'docx':   return 'fa-regular fa-file-word';
      case 'xlsx':   return 'fa-regular fa-file-excel';
      case 'png':
      case 'jpg':    return 'fa-regular fa-file-image';
      case 'txt':    return 'fa-regular fa-file-lines';
      case 'csv':    return 'fa-regular fa-file-csv';
      default:       return 'fa-regular fa-file';
    }
  }

  private applyFileFiltersAndSort(items: TrashItem[]): TrashItem[] {
    let result = [...items];

    if (this.fileSearch.trim()) {
      const q = this.fileSearch.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q));
    }

    for (const s of this.fileActiveSorts) {
      const dir = s.direction === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        switch (s.definitionId) {
          case 'name':      return dir * a.name.localeCompare(b.name);
          case 'deletedAt': return dir * (a.deletedAt.getTime() - b.deletedAt.getTime());
          case 'expiresAt': return dir * (a.expiresAt.getTime() - b.expiresAt.getTime());
          case 'size':      return dir * ((a.size ?? 0) - (b.size ?? 0));
          default:          return 0;
        }
      });
    }

    if (!this.fileActiveSorts.length) {
      result.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
    }

    return result;
  }

  private applySoftFiltersAndSort(items: SoftTrashItem[], search: string, sorts: ActiveSort[]): SoftTrashItem[] {
    let result = [...items];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q));
    }

    for (const s of sorts) {
      const dir = s.direction === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        switch (s.definitionId) {
          case 'name':      return dir * a.name.localeCompare(b.name);
          case 'deletedAt': return dir * (a.deletedAt.getTime() - b.deletedAt.getTime());
          default:          return 0;
        }
      });
    }

    if (!sorts.length) {
      result.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
    }

    return result;
  }
}

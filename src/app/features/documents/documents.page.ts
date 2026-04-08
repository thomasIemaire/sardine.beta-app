import { Component, OnInit, OnDestroy, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription, Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService, MenuItem } from 'primeng/api';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent } from '../../shared/components/header-page/header-page.component';
import { DataListComponent, ListColumn } from '../../shared/components/data-list/data-list.component';
import type { ActiveSort, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import type { ViewMode } from '../../shared/components/toolbar/toolbar.component';
import {
  DocumentService, ApiFolder, ApiFile,
  fileTypeFromMime, formatFileSize, DocFileType,
} from '../../core/services/document.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';
import { FolderPermissionsDialogComponent } from './folder-permissions-dialog.component';

interface DocItem {
  id: string;
  name: string;
  isFolder: boolean;
  type: DocFileType;
  size?: number;
  mimeType?: string;
  createdAt: Date;
}

@Component({
  selector: 'app-documents',
  imports: [
    DatePipe, FormsModule,
    ButtonModule, TooltipModule, DialogModule, InputTextModule,
    ContextMenuModule, ToastModule, ProgressBarModule,
    PageComponent, HeaderPageComponent, DataListComponent,
    FolderPermissionsDialogComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <p-contextmenu #cm [model]="ctxMenuItems" appendTo="body" (onHide)="contextItem = null" />

    <app-page>
      <app-header-page title="Documents" subtitle="Gérez vos documents et dossiers" />

      <!-- Breadcrumb -->
      <div class="documents-breadcrumb">
        <button class="bc-link" (click)="navigateToRoot()" [class.bc-current]="breadcrumb().length === 0">
          Documents
        </button>
        @for (seg of breadcrumb(); track seg.id; let i = $index; let last = $last) {
          <span class="bc-sep">/</span>
          <button class="bc-link" (click)="navigateToBreadcrumb(i)" [class.bc-current]="last">{{ seg.name }}</button>
        }
      </div>

      <!-- Body -->
      <div
        class="docs-body"
        [class.is-dragging]="isDragging"
        (click)="clearSelection()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        @if (uploadProgress() !== null) {
          <div class="docs-upload-progress">
            <span class="docs-upload-label">
              <i class="fa-regular fa-cloud-arrow-up"></i>
              Upload en cours...
            </span>
            <p-progressbar [value]="uploadProgress()!" [showValue]="false" styleClass="docs-progressbar" />
          </div>
        }

        <app-data-list
          gridMinWidth="155px"
          gridGap="0.5rem"
          gridPadding="0.75rem 1rem 1rem"
          searchPlaceholder="Rechercher un document..."
          [sortDefinitions]="sortDefs"
          [columns]="columns"
          [(search)]="search"
          [(sorts)]="activeSorts"
          [(viewMode)]="viewMode"
          emptyIcon="fa-regular fa-folder-open"
          emptyTitle="Dossier vide"
          emptySubtitle="Importez un fichier ou créez un sous-dossier."
          [totalRecords]="currentItems().length"
          [gridTemplate]="gridTpl"
          [listTemplate]="listTpl"
        >
          <div class="doc-actions-slot" toolbar-actions>
            <p-button
              label="Nouveau dossier"
              icon="fa-regular fa-folder-plus"
              severity="secondary"
              [rounded]="true"
              size="small"
              (onClick)="openCreateFolder()"
            />
            <p-button
              label="Importer"
              icon="fa-regular fa-cloud-arrow-up"
              [rounded]="true"
              size="small"
              [disabled]="!currentFolderId()"
              (onClick)="fileInput.click()"
            />
          </div>
        </app-data-list>

        @if (selectedIds.size > 0) {
          <div class="docs-selection-bar">
            <span class="dsb-count">
              <i class="fa-regular fa-check-circle"></i>
              {{ selectedIds.size }} sélectionné{{ selectedIds.size > 1 ? 's' : '' }}
            </span>
            <div class="dsb-divider"></div>
            <p-button icon="fa-regular fa-folder-arrow-up" label="Déplacer" [text]="true" severity="secondary" size="small" [rounded]="true" [disabled]="true" />
            <p-button icon="fa-regular fa-trash" label="Supprimer" [text]="true" severity="danger" size="small" [rounded]="true" (onClick)="bulkDeleteSelected()" />
            <div class="dsb-divider"></div>
            <p-button icon="fa-regular fa-xmark" pTooltip="Désélectionner" [text]="true" severity="secondary" size="small" [rounded]="true" (onClick)="clearSelection()" />
          </div>
        }

        <!-- Hidden file input -->
        <input #fileInput type="file" multiple style="display:none" (change)="onFileSelect($event)" />

        <!-- Drag-drop overlay -->
        @if (isDragging) {
          <div class="docs-drag-overlay">
            <i class="fa-regular fa-cloud-arrow-up docs-drag-icon"></i>
            <span>Déposez vos fichiers ici</span>
          </div>
        }
      </div>
    </app-page>

    <!-- Grid template -->
    <ng-template #gridTpl>
      @if (currentFolders().length > 0) {
        @for (item of currentFolders(); track item.id) {
          <div
            class="doc-card doc-card--folder"
            [class.is-selected]="selectedIds.has(item.id)"
            (click)="onCardClick($event, item)"
            (dblclick)="openItem(item)"
            (contextmenu)="onContextMenu($event, item, cm)"
          >
            <i class="doc-card-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
            <div class="doc-card-info">
              <span class="doc-card-name" [title]="item.name">{{ item.name }}</span>
              <span class="doc-card-meta">{{ folderMeta(item) }}</span>
            </div>
            <div class="doc-card-action">
              <p-button
                icon="fa-regular fa-ellipsis-vertical"
                severity="secondary"
                [text]="true"
                [rounded]="true"
                size="small"
                (click)="$event.stopPropagation(); onContextMenu($event, item, cm)"
              />
            </div>
          </div>
        }
      }
      @if (currentFiles().length > 0) {
        <div class="docs-section-header">
          <span class="docs-section-label">Fichiers</span>
          <span class="docs-section-count">{{ currentFiles().length }}</span>
        </div>
        @for (item of currentFiles(); track item.id) {
          <div
            class="doc-card"
            [class.is-selected]="selectedIds.has(item.id)"
            (click)="onCardClick($event, item)"
            (dblclick)="openItem(item)"
            (contextmenu)="onContextMenu($event, item, cm)"
          >
            <i class="doc-card-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
            <div class="doc-card-info">
              <span class="doc-card-name" [title]="item.name">{{ item.name }}</span>
              <span class="doc-card-meta">{{ item.size ? sizeLabel(item.size) : '' }}</span>
            </div>
            <div class="doc-card-action">
              <p-button
                icon="fa-regular fa-ellipsis-vertical"
                severity="secondary"
                [text]="true"
                [rounded]="true"
                size="small"
                (click)="$event.stopPropagation(); onContextMenu($event, item, cm)"
              />
            </div>
          </div>
        }
      }
    </ng-template>

    <!-- List template -->
    <ng-template #listTpl>
      @if (currentFolders().length > 0) {
        @for (item of currentFolders(); track item.id) {
          <div
            class="doc-row doc-row--folder"
            [class.is-selected]="selectedIds.has(item.id)"
            (click)="onCardClick($event, item)"
            (dblclick)="openItem(item)"
            (contextmenu)="onContextMenu($event, item, cm)"
          >
            <div class="doc-row-main">
              <i class="doc-row-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
              <div class="doc-row-text">
                <span class="doc-row-name">{{ item.name }}</span>
                <span class="doc-row-meta">{{ folderMeta(item) }}</span>
              </div>
            </div>
            <span class="doc-row-date">{{ item.createdAt | date:'dd/MM/yy' }}</span>
            <p-button
              icon="fa-regular fa-ellipsis-vertical"
              severity="secondary"
              [text]="true"
              [rounded]="true"
              size="small"
              (click)="$event.stopPropagation(); onContextMenu($event, item, cm)"
            />
          </div>
        }
      }
      @if (currentFiles().length > 0) {
        <div class="docs-section-row-header">
          <span class="docs-section-label">Fichiers</span>
          <span class="docs-section-count">{{ currentFiles().length }}</span>
        </div>
        @for (item of currentFiles(); track item.id) {
          <div
            class="doc-row"
            [class.is-selected]="selectedIds.has(item.id)"
            (click)="onCardClick($event, item)"
            (dblclick)="openItem(item)"
            (contextmenu)="onContextMenu($event, item, cm)"
          >
            <div class="doc-row-main">
              <i class="doc-row-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
              <div class="doc-row-text">
                <span class="doc-row-name">{{ item.name }}</span>
                <span class="doc-row-meta">{{ item.size ? sizeLabel(item.size) : '' }}</span>
              </div>
            </div>
            <span class="doc-row-date">{{ item.createdAt | date:'dd/MM/yy' }}</span>
            <p-button
              icon="fa-regular fa-ellipsis-vertical"
              severity="secondary"
              [text]="true"
              [rounded]="true"
              size="small"
              (click)="$event.stopPropagation(); onContextMenu($event, item, cm)"
            />
          </div>
        }
      }
    </ng-template>

    <!-- Create folder dialog -->
    <p-dialog
      [(visible)]="showCreateFolder"
      header="Nouveau dossier"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '360px' }"
      (onHide)="newFolderName = ''"
    >
      <div style="padding: 0.25rem 0">
        <input
          pInputText
          [(ngModel)]="newFolderName"
          placeholder="Nom du dossier"
          style="width: 100%"
          (keyup.enter)="createFolder()"
          autofocus
          pSize="small"
        />
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" size="small" [text]="true" rounded (onClick)="showCreateFolder = false" />
        <p-button label="Créer" size="small" rounded [disabled]="!newFolderName.trim()" [loading]="creatingFolder" (onClick)="createFolder()" />
      </ng-template>
    </p-dialog>

    <!-- Rename dialog -->
    <p-dialog
      [(visible)]="showRenameDialog"
      header="Renommer"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '360px' }"
      (onHide)="renameValue = ''"
    >
      <div style="padding: 0.25rem 0">
        <input
          pInputText
          [(ngModel)]="renameValue"
          placeholder="Nouveau nom"
          style="width: 100%"
          (keyup.enter)="confirmRename()"
          pSize="small"
        />
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" size="small" [text]="true" rounded (onClick)="showRenameDialog = false" />
        <p-button label="Renommer" size="small" rounded [disabled]="!renameValue.trim()" [loading]="renaming" (onClick)="confirmRename()" />
      </ng-template>
    </p-dialog>

    <!-- Delete confirm dialog -->
    <p-dialog
      [(visible)]="showDeleteDialog"
      header="Supprimer"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '360px' }"
    >
      <p style="margin: 0.25rem 0; font-size: 0.875rem">
        Déplacer <strong>{{ deleteTarget?.name }}</strong> dans la corbeille ?
      </p>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" size="small" [text]="true" rounded (onClick)="showDeleteDialog = false" />
        <p-button label="Supprimer" severity="danger" size="small" rounded [loading]="deleting" (onClick)="confirmDelete()" />
      </ng-template>
    </p-dialog>

    <!-- Folder permissions dialog -->
    @if (permissionsTarget) {
      <app-folder-permissions-dialog
        [(visible)]="showPermissionsDialog"
        [folderId]="permissionsTarget.id"
        [folderName]="permissionsTarget.name"
      />
    }
  `,
  styleUrl: './documents.page.scss',
})
export class DocumentsPage implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly docService = inject(DocumentService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  // ── State ──────────────────────────────────────────────────────────────────

  readonly currentFolderId = signal<string | null>(null);
  /** Dossiers top-level accessibles (résultat de /folders/accessible). */
  readonly topLevelFolders = signal<ApiFolder[]>([]);
  readonly breadcrumb = signal<{ id: string; name: string }[]>([]);
  readonly subfolders = signal<ApiFolder[]>([]);
  readonly rawFiles = signal<ApiFile[]>([]);
  readonly loading = signal(false);
  readonly uploadProgress = signal<number | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────

  readonly currentFolders = computed<DocItem[]>(() =>
    this.applyFiltersAndSort(
      this.subfolders().map(f => ({
        id: f.id,
        name: f.name,
        isFolder: true,
        type: 'folder' as DocFileType,
        createdAt: new Date(f.created_at),
      }))
    )
  );

  readonly currentFiles = computed<DocItem[]>(() =>
    this.applyFiltersAndSort(
      this.rawFiles().map(f => ({
        id: f.id,
        name: f.name,
        isFolder: false,
        type: fileTypeFromMime(f.mime_type, f.name),
        size: f.size,
        mimeType: f.mime_type,
        createdAt: new Date(f.created_at),
      }))
    )
  );

  readonly currentItems = computed(() => [...this.currentFolders(), ...this.currentFiles()]);

  // ── View state ─────────────────────────────────────────────────────────────

  search = '';
  private _viewMode: ViewMode = (localStorage.getItem('viewMode:documents') as ViewMode) ?? 'grid';
  get viewMode(): ViewMode { return this._viewMode; }
  set viewMode(v: ViewMode) { this._viewMode = v; localStorage.setItem('viewMode:documents', v); }
  activeSorts: ActiveSort[] = [];

  readonly sortDefs: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'createdAt', label: 'Date' },
    { id: 'size', label: 'Taille' },
  ];

  readonly columns: ListColumn[] = [
    { label: 'Nom', cssClass: 'col-flex' },
    { label: 'Date', cssClass: 'col-date' },
    { label: '', cssClass: 'col-actions' },
  ];

  // ── Selection ──────────────────────────────────────────────────────────────

  selectedIds = new Set<string>();
  private lastSelectedId: string | null = null;

  // ── Dialogs ────────────────────────────────────────────────────────────────

  showCreateFolder = false;
  newFolderName = '';
  creatingFolder = false;

  showRenameDialog = false;
  renameValue = '';
  renameTarget: DocItem | null = null;
  renaming = false;

  showDeleteDialog = false;
  deleteTarget: DocItem | null = null;
  deleting = false;

  showPermissionsDialog = false;
  permissionsTarget: DocItem | null = null;

  // ── Context menu ───────────────────────────────────────────────────────────

  contextItem: DocItem | null = null;
  ctxMenuItems: MenuItem[] = [];

  // ── Drag & drop ────────────────────────────────────────────────────────────

  isDragging = false;
  private dragCounter = 0;

  // ── Private ────────────────────────────────────────────────────────────────

  private sub?: Subscription;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    // Toujours charger les top-level accessibles (nécessaire pour le retour au top).
    this.loadTopLevel(orgId);

    const folderId = this.route.snapshot.queryParamMap.get('folder');
    if (folderId) {
      this.currentFolderId.set(folderId);
      this.docService.getBreadcrumb(orgId, folderId).subscribe({
        next: (crumbs) => this.breadcrumb.set(crumbs),
      });
      this.loadFolder(orgId, folderId);
    }
  }

  private loadTopLevel(orgId: string): void {
    const atTop = this.currentFolderId() === null;
    if (atTop) this.loading.set(true);
    this.docService.getAccessibleFolders(orgId).subscribe({
      next: (folders) => {
        this.topLevelFolders.set(folders);
        if (this.currentFolderId() === null) {
          this.subfolders.set(folders);
          this.rawFiles.set([]);
          this.breadcrumb.set([]);
          this.loading.set(false);
        }
      },
      error: () => {
        if (this.currentFolderId() === null) this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger vos dossiers.' });
      },
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  private loadFolder(orgId: string, folderId: string): void {
    this.loading.set(true);
    this.subfolders.set([]);
    this.rawFiles.set([]);

    this.sub = forkJoin({
      folders: this.docService.getFolderContents(orgId, folderId),
      files: this.docService.getFiles(orgId, folderId),
    }).subscribe({
      next: ({ folders, files }) => {
        this.subfolders.set(folders);
        this.rawFiles.set(files.items ?? (files as any));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger le contenu du dossier.' });
      },
    });
  }

  navigateToRoot(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.breadcrumb.set([]);
    this.currentFolderId.set(null);
    this.subfolders.set(this.topLevelFolders());
    this.rawFiles.set([]);
    this.clearSelection();
    this.updateUrl(null);
    // Rafraîchir les top-level en arrière-plan (au cas où).
    this.loadTopLevel(orgId);
  }

  navigateToBreadcrumb(index: number): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    const crumbs = this.breadcrumb();
    const newCrumbs = crumbs.slice(0, index + 1);
    const folderId = newCrumbs[newCrumbs.length - 1].id;
    this.breadcrumb.set(newCrumbs);
    this.currentFolderId.set(folderId);
    this.clearSelection();
    this.updateUrl(folderId);
    this.loadFolder(orgId, folderId);
  }

  openItem(item: DocItem): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    if (item.isFolder) {
      this.breadcrumb.update(crumbs => [...crumbs, { id: item.id, name: item.name }]);
      this.currentFolderId.set(item.id);
      this.clearSelection();
      this.updateUrl(item.id);
      this.loadFolder(orgId, item.id);
      return;
    }

    // Fichier → ouvrir le viewer en transmettant la donnée complète via state.
    const file = this.rawFiles().find(f => f.id === item.id);
    const folderId = this.currentFolderId();
    this.router.navigate(['/documents/files', item.id], {
      queryParams: folderId ? { folder: folderId } : {},
      state: file ? { file } : undefined,
    });
  }

  private updateUrl(folderId: string | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { folder: folderId ?? null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // ── Create folder ──────────────────────────────────────────────────────────

  openCreateFolder(): void {
    this.newFolderName = '';
    this.showCreateFolder = true;
  }

  createFolder(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId || !this.newFolderName.trim()) return;
    // parent_id null = créer au top niveau.
    const parentId = this.currentFolderId();
    this.creatingFolder = true;
    this.docService.createFolder(orgId, this.newFolderName.trim(), parentId).subscribe({
      next: (folder) => {
        this.subfolders.update(list => [...list, folder]);
        if (parentId === null) {
          this.topLevelFolders.update(list => [...list, folder]);
        }
        this.showCreateFolder = false;
        this.creatingFolder = false;
        this.messageService.add({ severity: 'success', summary: 'Dossier créé', detail: folder.name });
      },
      error: () => {
        this.creatingFolder = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de créer le dossier.' });
      },
    });
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  onFileSelect(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (files.length) this.uploadFiles(files);
    (event.target as HTMLInputElement).value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter++;
    this.isDragging = true;
  }

  onDragLeave(_event: DragEvent): void {
    this.dragCounter--;
    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      this.isDragging = false;
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    this.dragCounter = 0;
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length) this.uploadFiles(files);
  }

  private uploadFiles(files: File[]): void {
    const orgId = this.contextSwitcher.selectedId();
    const folderId = this.currentFolderId();
    if (!orgId || !folderId) return;

    if (files.length === 1) {
      this.uploadProgress.set(0);
      this.docService.uploadFile(orgId, folderId, files[0]).subscribe({
        next: (progress) => {
          this.uploadProgress.set(progress.progress);
          if (progress.done && progress.result) {
            this.rawFiles.update(list => [...list, progress.result!]);
            this.uploadProgress.set(null);
            this.messageService.add({ severity: 'success', summary: 'Fichier importé', detail: progress.result.name });
          }
        },
        error: () => {
          this.uploadProgress.set(null);
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'importer le fichier." });
        },
      });
    } else {
      this.uploadProgress.set(0);
      this.docService.uploadFiles(orgId, folderId, files).subscribe({
        next: (result) => {
          this.rawFiles.update(list => [...list, ...result.success]);
          this.uploadProgress.set(null);
          const count = result.success.length;
          const errCount = result.errors.length;
          if (count > 0) this.messageService.add({ severity: 'success', summary: `${count} fichier${count > 1 ? 's' : ''} importé${count > 1 ? 's' : ''}` });
          if (errCount > 0) this.messageService.add({ severity: 'warn', summary: `${errCount} fichier${errCount > 1 ? 's' : ''} ignoré${errCount > 1 ? 's' : ''}` });
        },
        error: () => {
          this.uploadProgress.set(null);
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'importer les fichiers." });
        },
      });
    }
  }

  // ── Download ───────────────────────────────────────────────────────────────

  downloadItem(item: DocItem): void {
    if (item.isFolder) return;
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.docService.downloadFile(orgId, item.id, item.name);
  }

  // ── Rename ─────────────────────────────────────────────────────────────────

  startRename(item: DocItem): void {
    this.renameTarget = item;
    this.renameValue = item.name;
    this.showRenameDialog = true;
  }

  confirmRename(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId || !this.renameTarget || !this.renameValue.trim()) return;
    const item = this.renameTarget;
    const newName = this.renameValue.trim();
    this.renaming = true;

    const obs: Observable<unknown> = item.isFolder
      ? this.docService.renameFolder(orgId, item.id, newName)
      : this.docService.renameFile(orgId, item.id, newName);

    obs.subscribe({
      next: () => {
        if (item.isFolder) {
          this.subfolders.update(list => list.map(f => f.id === item.id ? { ...f, name: newName } : f));
        } else {
          this.rawFiles.update(list => list.map(f => f.id === item.id ? { ...f, name: newName } : f));
        }
        this.showRenameDialog = false;
        this.renaming = false;
        this.messageService.add({ severity: 'success', summary: 'Renommé', detail: newName });
      },
      error: () => {
        this.renaming = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de renommer.' });
      },
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  openPermissions(item: DocItem): void {
    this.permissionsTarget = item;
    this.showPermissionsDialog = true;
  }

  showDeleteConfirm(item: DocItem): void {
    this.deleteTarget = item;
    this.showDeleteDialog = true;
  }

  confirmDelete(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId || !this.deleteTarget) return;
    const item = this.deleteTarget;
    this.deleting = true;

    const obs = item.isFolder
      ? this.docService.deleteFolder(orgId, item.id)
      : this.docService.deleteFile(orgId, item.id);

    obs.subscribe({
      next: () => {
        if (item.isFolder) {
          this.subfolders.update(list => list.filter(f => f.id !== item.id));
          this.topLevelFolders.update(list => list.filter(f => f.id !== item.id));
        } else {
          this.rawFiles.update(list => list.filter(f => f.id !== item.id));
        }
        this.selectedIds.delete(item.id);
        this.selectedIds = new Set(this.selectedIds);
        this.showDeleteDialog = false;
        this.deleting = false;
        this.messageService.add({ severity: 'success', summary: 'Déplacé dans la corbeille', detail: item.name });
      },
      error: () => {
        this.deleting = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer.' });
      },
    });
  }

  // ── Bulk delete ────────────────────────────────────────────────────────────

  bulkDeleteSelected(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId || this.selectedIds.size === 0) return;

    const fileIds = this.rawFiles().filter(f => this.selectedIds.has(f.id)).map(f => f.id);
    const folderIds = this.subfolders().filter(f => this.selectedIds.has(f.id)).map(f => f.id);

    this.docService.bulkDelete(orgId, fileIds, folderIds).subscribe({
      next: (result) => {
        this.rawFiles.update(list => list.filter(f => !fileIds.includes(f.id)));
        this.subfolders.update(list => list.filter(f => !folderIds.includes(f.id)));
        this.topLevelFolders.update(list => list.filter(f => !folderIds.includes(f.id)));
        this.clearSelection();
        const total = result.files_deleted + result.folders_deleted;
        this.messageService.add({ severity: 'success', summary: `${total} élément${total > 1 ? 's' : ''} déplacé${total > 1 ? 's' : ''} dans la corbeille` });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer les éléments.' });
      },
    });
  }

  // ── Context menu ───────────────────────────────────────────────────────────

  onContextMenu(event: MouseEvent, item: DocItem, cm: ContextMenu): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextItem = item;
    this.ctxMenuItems = [
      {
        label: 'Renommer',
        icon: 'fa-regular fa-pen',
        command: () => this.startRename(item),
      },
      ...(!item.isFolder ? [{
        label: 'Télécharger',
        icon: 'fa-regular fa-download',
        command: () => this.downloadItem(item),
      }] : []),
      ...(item.isFolder ? [{
        label: 'Gérer les permissions',
        icon: 'fa-regular fa-lock',
        command: () => this.openPermissions(item),
      }] : []),
      { separator: true },
      {
        label: 'Supprimer',
        icon: 'fa-regular fa-trash',
        styleClass: 'p-menuitem-danger',
        command: () => this.showDeleteConfirm(item),
      },
    ];
    cm.show(event);
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  onCardClick(event: MouseEvent, item: DocItem): void {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
      if (this.selectedIds.has(item.id)) {
        this.selectedIds.delete(item.id);
      } else {
        this.selectedIds.add(item.id);
      }
      this.selectedIds = new Set(this.selectedIds);
      this.lastSelectedId = item.id;
    } else if (event.shiftKey && this.lastSelectedId) {
      const items = this.currentItems();
      const from = items.findIndex(d => d.id === this.lastSelectedId);
      const to = items.findIndex(d => d.id === item.id);
      const [lo, hi] = from < to ? [from, to] : [to, from];
      this.selectedIds = new Set(items.slice(lo, hi + 1).map(d => d.id));
    } else {
      this.selectedIds = new Set([item.id]);
      this.lastSelectedId = item.id;
    }
  }

  clearSelection(): void {
    this.selectedIds = new Set();
    this.lastSelectedId = null;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private applyFiltersAndSort(items: DocItem[]): DocItem[] {
    let result = [...items];
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(q));
    }
    for (const s of this.activeSorts) {
      const dir = s.direction === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        if (s.definitionId === 'name') return dir * a.name.localeCompare(b.name);
        if (s.definitionId === 'createdAt') return dir * (a.createdAt.getTime() - b.createdAt.getTime());
        if (s.definitionId === 'size') return dir * ((a.size ?? 0) - (b.size ?? 0));
        return 0;
      });
    }
    if (!this.activeSorts.length) {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }

  folderMeta(_item: DocItem): string {
    // Plus de comptage local : parent_id des dossiers retournés par /accessible
    // ne reflète pas forcément un parent accessible (cf. API dossiers v2).
    return 'Dossier';
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
}

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent } from '../../shared/components/header-page/header-page.component';
import { DataListComponent, ListColumn } from '../../shared/components/data-list/data-list.component';
import type { ViewMode } from '../../shared/components/toolbar/toolbar.component';
import type { ActiveSort, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import {
  DocumentService,
  fileTypeFromMime,
  formatFileSize,
  DocFileType,
} from '../../core/services/document.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

interface TrashItem {
  id: string;
  name: string;
  isFolder: boolean;
  type: DocFileType;
  size?: number;
  deletedAt: Date;
  expiresAt: Date;
}

@Component({
  selector: 'app-corbeille',
  imports: [
    DatePipe, ButtonModule, TooltipModule, DialogModule, ToastModule,
    PageComponent, HeaderPageComponent, DataListComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <app-page>
      <app-header-page title="Corbeille" subtitle="Éléments supprimés — conservés 30 jours" />

      <div class="docs-body">
        <app-data-list
          gridMinWidth="155px"
          gridGap="0.5rem"
          gridPadding="0.75rem 1rem 1rem"
          searchPlaceholder="Rechercher dans la corbeille..."
          [sortDefinitions]="sortDefs"
          [columns]="columns"
          [(search)]="search"
          [(sorts)]="activeSorts"
          [(viewMode)]="viewMode"
          emptyIcon="fa-regular fa-trash"
          emptyTitle="La corbeille est vide"
          emptySubtitle="Les éléments supprimés apparaîtront ici pendant 30 jours."
          [totalRecords]="displayedItems().length"
          [gridTemplate]="gridTpl"
          [listTemplate]="listTpl"
        >
          <p-button
            toolbar-actions
            label="Vider la corbeille"
            icon="fa-regular fa-trash"
            severity="danger"
            [rounded]="true"
            size="small"
            [disabled]="items().length === 0 || loading()"
            (onClick)="showEmptyConfirm = true"
          />
        </app-data-list>
      </div>
    </app-page>

    <!-- Grid template -->
    <ng-template #gridTpl>
      @if (displayedFolders().length > 0) {
        @for (item of displayedFolders(); track item.id) {
          <div
            class="doc-card doc-card--folder"
            [class.is-expiring]="isExpiringSoon(item)"
          >
            <i class="doc-card-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
            <div class="doc-card-info">
              <span class="doc-card-name" [title]="item.name">{{ item.name }}</span>
              <span class="doc-card-meta">
                Expire {{ item.expiresAt | date:'dd/MM/yy' }}
                @if (isExpiringSoon(item)) { <span class="expiring-dot"></span> }
              </span>
            </div>
            <div class="doc-card-action">
              <p-button
                icon="fa-regular fa-rotate-left"
                pTooltip="Restaurer"
                tooltipPosition="left"
                severity="secondary"
                [text]="true"
                [rounded]="true"
                size="small"
                (onClick)="restore(item)"
              />
            </div>
          </div>
        }
      }
      @if (displayedFiles().length > 0) {
        <div class="docs-section-header">
          <span class="docs-section-label">Fichiers</span>
          <span class="docs-section-count">{{ displayedFiles().length }}</span>
        </div>
        @for (item of displayedFiles(); track item.id) {
          <div class="doc-card" [class.is-expiring]="isExpiringSoon(item)">
            <i class="doc-card-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
            <div class="doc-card-info">
              <span class="doc-card-name" [title]="item.name">{{ item.name }}</span>
              <span class="doc-card-meta">
                {{ item.size ? sizeLabel(item.size) + ' · ' : '' }}Expire {{ item.expiresAt | date:'dd/MM/yy' }}
                @if (isExpiringSoon(item)) { <span class="expiring-dot"></span> }
              </span>
            </div>
            <div class="doc-card-action">
              <p-button
                icon="fa-regular fa-rotate-left"
                pTooltip="Restaurer"
                tooltipPosition="left"
                severity="secondary"
                [text]="true"
                [rounded]="true"
                size="small"
                (onClick)="restore(item)"
              />
            </div>
          </div>
        }
      }
    </ng-template>

    <!-- List template -->
    <ng-template #listTpl>
      @if (displayedFolders().length > 0) {
        @for (item of displayedFolders(); track item.id) {
          <div class="doc-row doc-row--folder" [class.is-expiring]="isExpiringSoon(item)">
            <div class="doc-row-main">
              <i class="doc-row-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
              <div class="doc-row-text">
                <span class="doc-row-name">{{ item.name }}</span>
                <span class="doc-row-meta">
                  Dossier
                  @if (isExpiringSoon(item)) { · <span class="expiring-badge">Expire bientôt</span> }
                </span>
              </div>
            </div>
            <span class="doc-row-date">{{ item.deletedAt | date:'dd/MM/yy' }}</span>
            <span class="doc-row-date" [class.doc-row-date--warn]="isExpiringSoon(item)">
              {{ item.expiresAt | date:'dd/MM/yy' }}
            </span>
            <p-button
              icon="fa-regular fa-rotate-left"
              pTooltip="Restaurer"
              tooltipPosition="left"
              severity="secondary"
              [text]="true"
              [rounded]="true"
              size="small"
              (onClick)="restore(item)"
            />
          </div>
        }
      }
      @if (displayedFiles().length > 0) {
        <div class="docs-section-row-header">
          <span class="docs-section-label">Fichiers</span>
          <span class="docs-section-count">{{ displayedFiles().length }}</span>
        </div>
        @for (item of displayedFiles(); track item.id) {
          <div class="doc-row" [class.is-expiring]="isExpiringSoon(item)">
            <div class="doc-row-main">
              <i class="doc-row-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
              <div class="doc-row-text">
                <span class="doc-row-name">{{ item.name }}</span>
                <span class="doc-row-meta">
                  {{ item.size ? sizeLabel(item.size) : '' }}
                  @if (isExpiringSoon(item)) { · <span class="expiring-badge">Expire bientôt</span> }
                </span>
              </div>
            </div>
            <span class="doc-row-date">{{ item.deletedAt | date:'dd/MM/yy' }}</span>
            <span class="doc-row-date" [class.doc-row-date--warn]="isExpiringSoon(item)">
              {{ item.expiresAt | date:'dd/MM/yy' }}
            </span>
            <p-button
              icon="fa-regular fa-rotate-left"
              pTooltip="Restaurer"
              tooltipPosition="left"
              severity="secondary"
              [text]="true"
              [rounded]="true"
              size="small"
              (onClick)="restore(item)"
            />
          </div>
        }
      }
    </ng-template>

    <!-- Empty trash confirm -->
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
        {{ items().length }} élément{{ items().length > 1 ? 's' : '' }} seront supprimés définitivement.
      </p>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" size="small" [text]="true" rounded (onClick)="showEmptyConfirm = false" />
        <p-button label="Vider définitivement" severity="danger" size="small" rounded [loading]="emptying" (onClick)="emptyTrash()" />
      </ng-template>
    </p-dialog>
  `,
  // Réutilise les styles de la page Documents pour obtenir exactement la
  // même apparence (cartes, lignes, sections, icônes typées…).
  styleUrl: '../documents/documents.page.scss',
  styles: [`
    /* ── Surcharges spécifiques corbeille ─────────────────────────────── */

    .doc-card.is-expiring,
    .doc-row.is-expiring {
      background: color-mix(in srgb, var(--p-orange-500, #f97316) 6%, transparent);
    }

    .expiring-dot {
      display: inline-block;
      width: .4rem;
      height: .4rem;
      border-radius: 999px;
      background: var(--p-orange-500, #f97316);
      vertical-align: middle;
      margin-left: .25rem;
    }

    .expiring-badge {
      font-size: 0.6rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--p-orange-500, #f97316);
      background: color-mix(in srgb, var(--p-orange-500, #f97316) 12%, transparent);
      padding: .1rem .35rem;
      border-radius: 99px;
    }

    .doc-row-date--warn {
      color: var(--p-orange-500, #f97316);
      font-weight: 600;
    }
  `],
})
export class CorbeillePage implements OnInit {
  private readonly docService = inject(DocumentService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly items = signal<TrashItem[]>([]);

  search = '';
  showEmptyConfirm = false;
  emptying = false;

  private _viewMode: ViewMode = (localStorage.getItem('viewMode:corbeille') as ViewMode) ?? 'grid';
  get viewMode(): ViewMode { return this._viewMode; }
  set viewMode(v: ViewMode) { this._viewMode = v; localStorage.setItem('viewMode:corbeille', v); }

  activeSorts: ActiveSort[] = [];

  readonly sortDefs: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'deletedAt', label: 'Supprimé le' },
    { id: 'expiresAt', label: 'Expire le' },
    { id: 'size', label: 'Taille' },
  ];

  readonly columns: ListColumn[] = [
    { label: 'Nom', cssClass: 'col-flex' },
    { label: 'Supprimé le', cssClass: 'col-date' },
    { label: 'Expire le', cssClass: 'col-date' },
    { label: '', cssClass: 'col-actions' },
  ];

  readonly displayedItems = computed(() => this.applyFiltersAndSort(this.items()));

  readonly displayedFolders = computed(() => this.displayedItems().filter(i => i.isFolder));
  readonly displayedFiles = computed(() => this.displayedItems().filter(i => !i.isFolder));

  ngOnInit(): void {
    this.loadTrash();
  }

  private loadTrash(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.loading.set(true);

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
        this.items.set([...folderItems, ...fileItems]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la corbeille.' });
      },
    });
  }

  restore(item: TrashItem): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    const obs = item.isFolder
      ? this.docService.restoreFolder(orgId, item.id)
      : this.docService.restoreFile(orgId, item.id);

    obs.subscribe({
      next: () => {
        this.items.update(list => list.filter(i => i.id !== item.id));
        this.messageService.add({ severity: 'success', summary: 'Restauré', detail: item.name });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de restaurer.' });
      },
    });
  }

  emptyTrash(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.emptying = true;
    this.docService.emptyTrash(orgId).subscribe({
      next: () => {
        this.items.set([]);
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

  private applyFiltersAndSort(items: TrashItem[]): TrashItem[] {
    let result = [...items];

    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q));
    }

    for (const s of this.activeSorts) {
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

    if (!this.activeSorts.length) {
      // Tri par défaut : expiration la plus proche en premier.
      result.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
    }

    return result;
  }
}

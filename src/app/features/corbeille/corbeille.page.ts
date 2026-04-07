import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent } from '../../shared/components/header-page/header-page.component';
import { ToolbarComponent } from '../../shared/components/toolbar/toolbar.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { DocumentService, ApiTrashFolder, ApiTrashFile, fileTypeFromMime, formatFileSize, DocFileType } from '../../core/services/document.service';
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
    PageComponent, HeaderPageComponent, ToolbarComponent, EmptyStateComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <app-page>
      <app-header-page title="Corbeille" subtitle="Éléments supprimés — conservés 30 jours" />

      <div class="corbeille-toolbar">
        <app-toolbar
          searchPlaceholder="Rechercher dans la corbeille..."
          [(search)]="search"
        >
          <p-button
            label="Vider la corbeille"
            icon="fa-regular fa-trash"
            severity="danger"
            rounded
            size="small"
            [disabled]="items().length === 0 || loading()"
            (onClick)="showEmptyConfirm = true"
          />
        </app-toolbar>
      </div>

      @if (loading()) {
        <div class="corbeille-loading">
          <i class="fa-regular fa-spinner fa-spin"></i>
        </div>
      } @else if (filteredItems().length === 0) {
        <app-empty-state
          icon="fa-regular fa-trash"
          title="La corbeille est vide"
          subtitle="Les éléments supprimés apparaîtront ici pendant 30 jours."
        />
      } @else {
        <div class="corbeille-list">
          <!-- Header -->
          <div class="corbeille-row corbeille-row--header">
            <span class="cr-name">Nom</span>
            <span class="cr-date">Supprimé le</span>
            <span class="cr-date">Expire le</span>
            <span class="cr-actions"></span>
          </div>

          @for (item of filteredItems(); track item.id) {
            <div class="corbeille-row" [class.corbeille-row--expiring]="isExpiringSoon(item)">
              <div class="cr-name">
                <i class="cr-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
                <div class="cr-info">
                  <span class="cr-item-name">{{ item.name }}</span>
                  @if (!item.isFolder && item.size) {
                    <span class="cr-meta">{{ sizeLabel(item.size) }}</span>
                  }
                  @if (isExpiringSoon(item)) {
                    <span class="cr-expiring-badge">Expire bientôt</span>
                  }
                </div>
              </div>
              <span class="cr-date">{{ item.deletedAt | date:'dd/MM/yy HH:mm' }}</span>
              <span class="cr-date" [class.cr-date--warn]="isExpiringSoon(item)">
                {{ item.expiresAt | date:'dd/MM/yy' }}
              </span>
              <div class="cr-actions">
                <p-button
                  icon="fa-regular fa-rotate-left"
                  pTooltip="Restaurer"
                  tooltipPosition="left"
                  [text]="true"
                  severity="secondary"
                  size="small"
                  rounded
                  (onClick)="restore(item)"
                />
              </div>
            </div>
          }
        </div>
      }
    </app-page>

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
  styles: `
    .corbeille-toolbar {
      padding: 1rem 1rem 0;
    }

    .corbeille-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      font-size: 1.5rem;
      color: var(--p-text-muted-color);
    }

    .corbeille-list {
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
    }

    .corbeille-row {
      display: grid;
      grid-template-columns: 1fr 9rem 9rem 3rem;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      border-radius: 6px;
      transition: background 0.1s;

      &:hover:not(&--header) { background: var(--background-color-50); }

      &--header {
        padding: 0.375rem 0.75rem;
        margin-bottom: 0.25rem;
        border-bottom: 1px solid var(--surface-border);
        border-radius: 0;
      }

      &--expiring { background: color-mix(in srgb, var(--p-orange-500, #f97316) 5%, transparent); }
    }

    .cr-name {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-width: 0;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--p-text-muted-color);

      .corbeille-row:not(.corbeille-row--header) & {
        font-size: 0.8125rem;
        font-weight: normal;
        text-transform: none;
        letter-spacing: normal;
        color: var(--p-text-color);
      }
    }

    .cr-icon {
      font-size: 1rem;
      width: 1.25rem;
      text-align: center;
      flex-shrink: 0;

      &[data-type='folder'] { color: var(--yellow-color-500, #f59e0b); }
      &[data-type='pdf']    { color: #e74c3c; }
      &[data-type='docx']   { color: #2980b9; }
      &[data-type='xlsx']   { color: #27ae60; }
      &[data-type='png'],
      &[data-type='jpg']    { color: #8e44ad; }
      &[data-type='txt']    { color: var(--p-text-muted-color); }
      &[data-type='csv']    { color: #16a085; }
    }

    .cr-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 0.1rem;
    }

    .cr-item-name {
      font-size: 0.8125rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cr-meta {
      font-size: 0.6875rem;
      color: var(--p-text-muted-color);
    }

    .cr-expiring-badge {
      font-size: 0.6rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--p-orange-500, #f97316);
      background: color-mix(in srgb, var(--p-orange-500, #f97316) 12%, transparent);
      padding: 0.1rem 0.35rem;
      border-radius: 99px;
      width: fit-content;
    }

    .cr-date {
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
      white-space: nowrap;

      &--warn { color: var(--p-orange-500, #f97316); font-weight: 600; }

      .corbeille-row--header & {
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
    }

    .cr-actions {
      display: flex;
      justify-content: flex-end;
    }
  `,
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

  readonly filteredItems = computed(() => {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter(i => i.name.toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.loadTrash();
  }

  private loadTrash(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    this.loading.set(true);

    // Load both trash lists in parallel
    Promise.all([
      this.docService.getTrashFolders(orgId).toPromise(),
      this.docService.getTrashFiles(orgId).toPromise(),
    ]).then(([folders, files]) => {
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
      this.items.set([...folderItems, ...fileItems].sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime()));
      this.loading.set(false);
    }).catch(() => {
      this.loading.set(false);
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger la corbeille.' });
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
}

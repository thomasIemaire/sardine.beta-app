import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent } from '../../shared/components/header-page/header-page.component';
import { DataListComponent, ListColumn } from '../../shared/components/data-list/data-list.component';
import type { ActiveSort, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import type { ViewMode } from '../../shared/components/toolbar/toolbar.component';

type DocType = 'folder' | 'pdf' | 'docx' | 'xlsx' | 'png' | 'jpg' | 'txt' | 'csv';

interface DocItem {
  id: string;
  name: string;
  type: DocType;
  parentId: string | null;
  size?: string;
  createdAt: Date;
  creator: { initials: string; name: string };
}

const DOCS: DocItem[] = [
  // Root
  { id: 'f1',  name: 'Projets',                    type: 'folder', parentId: null,  createdAt: new Date('2024-01-15'), creator: { initials: 'TL', name: 'Thomas Lemaire'  } },
  { id: 'f2',  name: 'Marketing',                  type: 'folder', parentId: null,  createdAt: new Date('2024-02-20'), creator: { initials: 'MD', name: 'Marie Dupont'    } },
  { id: 'f3',  name: 'Ressources',                 type: 'folder', parentId: null,  createdAt: new Date('2024-03-05'), creator: { initials: 'LM', name: 'Lucas Martin'    } },
  { id: 'd1',  name: 'Rapport annuel 2024.pdf',    type: 'pdf',    parentId: null,  size: '2.4 Mo',  createdAt: new Date('2024-12-01'), creator: { initials: 'TL', name: 'Thomas Lemaire'  } },
  { id: 'd2',  name: 'Budget Q1.xlsx',             type: 'xlsx',   parentId: null,  size: '840 Ko',  createdAt: new Date('2025-01-10'), creator: { initials: 'CB', name: 'Camille Bernard' } },
  // Projets
  { id: 'f1-1', name: 'Sardine Beta',              type: 'folder', parentId: 'f1',  createdAt: new Date('2024-04-10'), creator: { initials: 'TL', name: 'Thomas Lemaire'  } },
  { id: 'f1-2', name: 'V2 Roadmap',               type: 'folder', parentId: 'f1',  createdAt: new Date('2024-06-01'), creator: { initials: 'JM', name: 'Julie Moreau'    } },
  { id: 'd3',  name: 'Spécifications techniques.docx', type: 'docx', parentId: 'f1', size: '1.1 Mo', createdAt: new Date('2024-09-15'), creator: { initials: 'LM', name: 'Lucas Martin'    } },
  { id: 'd4',  name: 'Notes de réunion.txt',       type: 'txt',    parentId: 'f1',  size: '12 Ko',   createdAt: new Date('2025-02-03'), creator: { initials: 'MD', name: 'Marie Dupont'    } },
  // Marketing
  { id: 'd5',  name: 'Charte graphique.png',       type: 'png',    parentId: 'f2',  size: '4.7 Mo',  createdAt: new Date('2024-07-20'), creator: { initials: 'CB', name: 'Camille Bernard' } },
  { id: 'd6',  name: 'Campagne été 2024.pdf',      type: 'pdf',    parentId: 'f2',  size: '3.2 Mo',  createdAt: new Date('2024-08-05'), creator: { initials: 'MD', name: 'Marie Dupont'    } },
  { id: 'd7',  name: 'Données clients.csv',        type: 'csv',    parentId: 'f2',  size: '520 Ko',  createdAt: new Date('2024-11-12'), creator: { initials: 'TL', name: 'Thomas Lemaire'  } },
  // Ressources
  { id: 'd8',  name: 'Logo officiel.jpg',          type: 'jpg',    parentId: 'f3',  size: '890 Ko',  createdAt: new Date('2024-03-20'), creator: { initials: 'JM', name: 'Julie Moreau'    } },
  { id: 'd9',  name: 'Politique RH.docx',          type: 'docx',   parentId: 'f3',  size: '650 Ko',  createdAt: new Date('2024-05-15'), creator: { initials: 'TL', name: 'Thomas Lemaire'  } },
  { id: 'd10', name: 'Glossaire.txt',              type: 'txt',    parentId: 'f3',  size: '34 Ko',   createdAt: new Date('2024-10-08'), creator: { initials: 'LM', name: 'Lucas Martin'    } },
  // Sardine Beta
  { id: 'd11', name: 'PRD v1.docx',               type: 'docx',   parentId: 'f1-1', size: '780 Ko', createdAt: new Date('2024-04-15'), creator: { initials: 'TL', name: 'Thomas Lemaire'  } },
  { id: 'd12', name: 'Wireframes.png',             type: 'png',    parentId: 'f1-1', size: '5.1 Mo', createdAt: new Date('2024-05-02'), creator: { initials: 'CB', name: 'Camille Bernard' } },
  // V2 Roadmap
  { id: 'd13', name: 'Roadmap 2025.xlsx',          type: 'xlsx',   parentId: 'f1-2', size: '230 Ko', createdAt: new Date('2024-06-10'), creator: { initials: 'JM', name: 'Julie Moreau'    } },
];

@Component({
  selector: 'app-documents',
  imports: [DatePipe, ButtonModule, TooltipModule, PageComponent, HeaderPageComponent, DataListComponent],
  template: `
    <app-page>
      <app-header-page title="Documents" subtitle="Gérez vos documents et dossiers" />

      <div class="documents-breadcrumb">
        <button class="bc-link" (click)="navigateTo(-1)" [class.bc-current]="currentPath.length === 0">Documents</button>
        @for (seg of currentPath; track seg.id; let i = $index; let last = $last) {
          <span class="bc-sep">/</span>
          <button class="bc-link" (click)="navigateTo(i)" [class.bc-current]="last">{{ seg.name }}</button>
        }
      </div>

      <div class="docs-body" (click)="clearSelection()">
        <app-data-list
          searchPlaceholder="Rechercher un document..."
          [sortDefinitions]="sortDefs"
          [columns]="columns"
          [(search)]="search"
          [(sorts)]="activeSorts"
          [(viewMode)]="viewMode"
          emptyIcon="fa-regular fa-folder-open"
          emptyTitle="Dossier vide"
          emptySubtitle="Importez un fichier ou créez un sous-dossier."
          [totalRecords]="currentItems.length"
          [gridTemplate]="gridTpl"
          [listTemplate]="listTpl"
        >
          <div class="doc-actions-slot" toolbar-actions>
            <p-button label="Nouveau dossier" icon="fa-regular fa-folder-plus" severity="secondary" [rounded]="true" size="small" />
            <p-button label="Importer" icon="fa-regular fa-cloud-arrow-up" [rounded]="true" size="small" />
          </div>
        </app-data-list>

        @if (selectedIds.size > 0) {
          <div class="docs-selection-bar">
            <span class="dsb-count">
              <i class="fa-regular fa-check-circle"></i>
              {{ selectedIds.size }} sélectionné{{ selectedIds.size > 1 ? 's' : '' }}
            </span>
            <div class="dsb-divider"></div>
            <p-button icon="fa-regular fa-download" label="Télécharger" [text]="true" severity="secondary" size="small" [rounded]="true" />
            <p-button icon="fa-regular fa-folder-arrow-up" label="Déplacer" [text]="true" severity="secondary" size="small" [rounded]="true" />
            <p-button icon="fa-regular fa-trash" label="Supprimer" [text]="true" severity="danger" size="small" [rounded]="true" />
            <div class="dsb-divider"></div>
            <p-button icon="fa-regular fa-xmark" pTooltip="Désélectionner" [text]="true" severity="secondary" size="small" [rounded]="true" (onClick)="clearSelection()" />
          </div>
        }
      </div>

    </app-page>

    <ng-template #gridTpl>
      @if (currentFolders.length > 0) {
        @for (item of currentFolders; track item.id) {
          <div class="doc-card doc-card--folder" [class.is-selected]="selectedIds.has(item.id)"
               (click)="onCardClick($event, item)" (dblclick)="onItemOpen(item)">
            <i class="doc-card-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
            <div class="doc-card-info">
              <span class="doc-card-name" [title]="item.name">{{ item.name }}</span>
              <span class="doc-card-meta">{{ itemMeta(item) }}</span>
            </div>
            <div class="doc-card-action">
              <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" [rounded]="true" size="small" (click)="$event.stopPropagation()" />
            </div>
          </div>
        }
      }
      @if (currentFiles.length > 0) {
        <div class="docs-section-header">
          <span class="docs-section-label">Fichiers</span>
          <span class="docs-section-count">{{ currentFiles.length }}</span>
        </div>
        @for (item of currentFiles; track item.id) {
          <div class="doc-card" [class.is-selected]="selectedIds.has(item.id)"
               (click)="onCardClick($event, item)" (dblclick)="onItemOpen(item)">
            <i class="doc-card-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
            <div class="doc-card-info">
              <span class="doc-card-name" [title]="item.name">{{ item.name }}</span>
              <span class="doc-card-meta">{{ itemMeta(item) }}</span>
            </div>
            <div class="doc-card-action">
              <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" [rounded]="true" size="small" (click)="$event.stopPropagation()" />
            </div>
          </div>
        }
      }
    </ng-template>

    <ng-template #listTpl>
      @if (currentFolders.length > 0) {
        @for (item of currentFolders; track item.id) {
          <div class="doc-row doc-row--folder" [class.is-selected]="selectedIds.has(item.id)"
               (click)="onCardClick($event, item)" (dblclick)="onItemOpen(item)">
            <div class="doc-row-main">
              <i class="doc-row-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
              <div class="doc-row-text">
                <span class="doc-row-name">{{ item.name }}</span>
                <span class="doc-row-meta">{{ itemMeta(item) }}</span>
              </div>
            </div>
            <span class="doc-row-date">{{ item.createdAt | date:'dd/MM/yy' }}</span>
            <div class="doc-row-creator">
              <span class="doc-row-avatar">{{ item.creator.initials }}</span>
              <span class="doc-row-creator-name">{{ item.creator.name }}</span>
            </div>
            <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" [rounded]="true" size="small" (click)="$event.stopPropagation()" />
          </div>
        }
      }
      @if (currentFiles.length > 0) {
        <div class="docs-section-row-header">
          <span class="docs-section-label">Fichiers</span>
          <span class="docs-section-count">{{ currentFiles.length }}</span>
        </div>
        @for (item of currentFiles; track item.id) {
          <div class="doc-row" [class.is-selected]="selectedIds.has(item.id)"
               (click)="onCardClick($event, item)" (dblclick)="onItemOpen(item)">
            <div class="doc-row-main">
              <i class="doc-row-icon {{ iconClass(item.type) }}" [attr.data-type]="item.type"></i>
              <div class="doc-row-text">
                <span class="doc-row-name">{{ item.name }}</span>
                <span class="doc-row-meta">{{ itemMeta(item) }}</span>
              </div>
            </div>
            <span class="doc-row-date">{{ item.createdAt | date:'dd/MM/yy' }}</span>
            <div class="doc-row-creator">
              <span class="doc-row-avatar">{{ item.creator.initials }}</span>
              <span class="doc-row-creator-name">{{ item.creator.name }}</span>
            </div>
            <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" [rounded]="true" size="small" (click)="$event.stopPropagation()" />
          </div>
        }
      }
    </ng-template>
  `,
  styleUrl: './documents.page.scss',
})
export class DocumentsPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  currentPath: { id: string; name: string }[] = [];

  ngOnInit(): void {
    const folderId = this.route.snapshot.queryParamMap.get('folder');
    if (folderId) {
      this.currentPath = this.buildPathFromId(folderId);
    }
  }

  private buildPathFromId(folderId: string): { id: string; name: string }[] {
    const path: { id: string; name: string }[] = [];
    let id: string | null = folderId;
    while (id) {
      const item = DOCS.find(d => d.id === id);
      if (!item) break;
      path.unshift({ id: item.id, name: item.name });
      id = item.parentId;
    }
    return path;
  }

  private updateUrl(folderId: string | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { folder: folderId ?? null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  search = '';
  private _viewMode: ViewMode = (localStorage.getItem('viewMode:documents') as ViewMode) ?? 'grid';
  get viewMode(): ViewMode { return this._viewMode; }
  set viewMode(v: ViewMode) { this._viewMode = v; localStorage.setItem('viewMode:documents', v); }
  activeSorts: ActiveSort[] = [];

  readonly sortDefs: SortDefinition[] = [
    { id: 'name',      label: 'Nom'           },
    { id: 'createdAt', label: 'Date'          },
  ];

  readonly columns: ListColumn[] = [
    { label: 'Nom',      cssClass: 'col-flex'    },
    { label: 'Date',     cssClass: 'col-date'    },
    { label: 'Créateur', cssClass: 'col-creator' },
    { label: '',         cssClass: 'col-actions' },
  ];

get currentFolders(): DocItem[] {
    return this.currentItems.filter(d => d.type === 'folder');
  }

  get currentFiles(): DocItem[] {
    return this.currentItems.filter(d => d.type !== 'folder');
  }

  get currentFolderId(): string | null {
    return this.currentPath.length > 0 ? this.currentPath[this.currentPath.length - 1].id : null;
  }

  get currentItems(): DocItem[] {
    let items = DOCS.filter(d => d.parentId === this.currentFolderId);

    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      items = items.filter(d => d.name.toLowerCase().includes(q));
    }

    items = [...items].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;

      for (const s of this.activeSorts) {
        const dir = s.direction === 'asc' ? 1 : -1;
        if (s.definitionId === 'name') return dir * a.name.localeCompare(b.name);
        if (s.definitionId === 'createdAt') return dir * (a.createdAt.getTime() - b.createdAt.getTime());
      }

      return a.name.localeCompare(b.name);
    });

    return items;
  }

  selectedIds = new Set<string>();
  private lastSelectedId: string | null = null;

  private get allItems(): DocItem[] {
    return [...this.currentFolders, ...this.currentFiles];
  }

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
      const items = this.allItems;
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

  onItemOpen(item: DocItem): void {
    this.selectedIds = new Set();
    this.lastSelectedId = null;
    if (item.type === 'folder') {
      this.currentPath = [...this.currentPath, { id: item.id, name: item.name }];
      this.updateUrl(item.id);
    }
  }

  navigateTo(index: number): void {
    this.selectedIds = new Set();
    this.lastSelectedId = null;
    this.currentPath = index < 0 ? [] : this.currentPath.slice(0, index + 1);
    this.updateUrl(this.currentPath.at(-1)?.id ?? null);
  }

  iconClass(type: DocType): string {
    switch (type) {
      case 'folder': return 'fa-regular fa-folder';
      case 'pdf':    return 'fa-regular fa-file-pdf';
      case 'docx':   return 'fa-regular fa-file-word';
      case 'xlsx':   return 'fa-regular fa-file-excel';
      case 'png':
      case 'jpg':    return 'fa-regular fa-file-image';
      case 'txt':    return 'fa-regular fa-file-lines';
      case 'csv':    return 'fa-regular fa-file-csv';
    }
  }

  itemMeta(item: DocItem): string {
    if (item.type === 'folder') {
      const count = DOCS.filter(d => d.parentId === item.id).length;
      return count === 0 ? 'Vide' : count === 1 ? '1 élément' : `${count} éléments`;
    }
    return item.size ?? '';
  }
}

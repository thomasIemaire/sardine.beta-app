import { Component, EventEmitter, inject, input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { GFlowNode, RangerConfig } from '../core/gflow.types';
import { FoldersService, UserService } from '../core/gflow-stubs';
import { FolderResponse } from '../core/gflow-stubs';

interface FolderTreeNode {
    id: string;
    name: string;
    path: string;
    children: FolderTreeNode[];
    expanded: boolean;
    loaded: boolean;
}

const OPERATIONS = [
    { label: 'Ranger dans un dossier', value: 'archive', icon: 'fa-solid fa-folder-arrow-down' },
    { label: 'Déplacer vers un dossier', value: 'move',    icon: 'fa-solid fa-folder-open' },
    { label: 'Supprimer le document',   value: 'delete',  icon: 'fa-solid fa-trash' },
] as const;

const NODE_ICON: Record<string, string> = {
    archive: 'fa-solid fa-file-arrow-down',
    move:    'fa-solid fa-file-export',
    delete:  'fa-solid fa-file-slash',
};

const DEFAULT_NODE_NAME: Record<string, string> = {
    archive: 'Fichier',
    move:    'Fichier',
    delete:  'Supprimer',
};

@Component({
    selector: 'app-config-ranger',
    imports: [CommonModule, FormsModule, ButtonModule, SelectModule],
    template: `
        <div class="config-fields">

            <div class="config-field">
                <label class="config-label">Opération</label>
                <p-select
                    [options]="operationOptions"
                    [(ngModel)]="operation"
                    optionLabel="label"
                    optionValue="value"
                    size="small"
                    appendTo="body"
                    (onChange)="onOperationChange()" />
            </div>

            @if (operation === 'delete') {
                <div class="delete-warning">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Le document sera définitivement supprimé. Cette action est irréversible.</span>
                </div>
            } @else {
                <div class="config-field">
                    <label class="config-label">{{ operation === 'move' ? 'Dossier de destination' : 'Dossier de rangement' }}</label>

                    @if (selectedPath) {
                        <div class="selected-folder">
                            <i class="fa-solid fa-folder"></i>
                            <span>{{ selectedPath }}</span>
                            <p-button
                                icon="fa-solid fa-xmark"
                                severity="secondary"
                                text
                                rounded
                                size="small"
                                (onClick)="clearSelection()" />
                        </div>
                    }

                    <div class="folder-tree">
                        <div class="folder-tree__item folder-tree__item--root"
                             [class.selected]="selectedId === ''"
                             (click)="selectFolder('', '/', '/')">
                            <i class="fa-solid fa-house"></i>
                            <span>Racine</span>
                        </div>
                        @for (folder of rootFolders; track folder.id) {
                            <ng-container *ngTemplateOutlet="folderNode; context: { $implicit: folder, depth: 1 }"></ng-container>
                        }
                    </div>

                    <ng-template #folderNode let-folder let-depth="depth">
                        <div class="folder-tree__item"
                             [style.paddingLeft.px]="depth * 20"
                             [class.selected]="selectedId === folder.id"
                             (click)="selectFolder(folder.id, folder.name, folder.path)">
                            <button class="folder-tree__toggle"
                                    (click)="$event.stopPropagation(); toggleFolder(folder)">
                                <i [class]="folder.expanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"></i>
                            </button>
                            <i class="fa-solid fa-folder"></i>
                            <span>{{ folder.name }}</span>
                        </div>
                        @if (folder.expanded) {
                            @for (child of folder.children; track child.id) {
                                <ng-container *ngTemplateOutlet="folderNode; context: { $implicit: child, depth: depth + 1 }"></ng-container>
                            }
                        }
                    </ng-template>

                    <small class="config-hint">
                        {{ operation === 'move' ? 'Sélectionnez le dossier vers lequel déplacer le document.' : 'Sélectionnez le dossier dans lequel ranger le document.' }}
                    </small>
                </div>
            }
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .config-hint { font-size: .6875rem; color: var(--p-text-muted-color); }
        .delete-warning {
            display: flex; align-items: flex-start; gap: .625rem; padding: .75rem;
            background: color-mix(in srgb, var(--p-red-500) 10%, transparent);
            border: 1px solid color-mix(in srgb, var(--p-red-500) 30%, transparent);
            border-radius: .375rem; font-size: .8125rem;
            color: var(--p-red-600);
        }
        .delete-warning i { margin-top: 2px; flex-shrink: 0; }
        .selected-folder {
            display: flex; align-items: center; gap: .5rem; padding: .375rem .625rem;
            background: var(--background-color-400); border: 1px solid var(--background-color-200);
            border-radius: .375rem; font-size: .8125rem; color: var(--background-color-800);
        }
        .selected-folder span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .folder-tree {
            max-height: 220px; overflow-y: auto;
            border: 1px solid var(--background-color-200); border-radius: .375rem; padding: .25rem;
        }
        .folder-tree__item {
            display: flex; align-items: center; gap: .375rem; padding: .375rem .5rem;
            border-radius: .25rem; cursor: pointer; font-size: .8125rem; user-select: none;
        }
        .folder-tree__item:hover { background: var(--background-color-100); }
        .folder-tree__item.selected { background: var(--background-color-400); color: var(--background-color-800); }
        .folder-tree__toggle {
            display: flex; align-items: center; justify-content: center;
            width: 16px; height: 16px; border: none; background: none; cursor: pointer;
            padding: 0; color: var(--p-text-muted-color); font-size: .625rem;
        }
    `]
})
export class ConfigRangerComponent implements OnInit {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    private foldersService = inject(FoldersService);
    private userService = inject(UserService);

    operationOptions = OPERATIONS as unknown as { label: string; value: string }[];
    rootFolders: FolderTreeNode[] = [];

    get config(): RangerConfig { return this.node().config as RangerConfig; }
    get operation(): string { return this.config.operation || 'archive'; }
    set operation(value: string) { this.config.operation = value as RangerConfig['operation']; }
    get selectedId(): string { return this.config.folderId || ''; }
    get selectedPath(): string { return this.config.folderPath || ''; }

    ngOnInit(): void { this.loadRootFolders(); }

    onOperationChange(): void {
        const node = this.node();
        node.icon = { icon: NODE_ICON[this.operation] || NODE_ICON['archive'] };
        if (this.operation === 'delete') {
            this.config.folderId = '';
            this.config.folderName = '';
            this.config.folderPath = '';
            node.name = 'Supprimer';
            node.configured = true;
        } else {
            node.name = DEFAULT_NODE_NAME[this.operation];
            node.configured = false;
        }
        this.configChange.emit();
    }

    selectFolder(id: string, name: string, path: string): void {
        this.config.folderId = id;
        this.config.folderName = name;
        this.config.folderPath = path;
        this.node().name = name;
        this.node().configured = true;
        this.configChange.emit();
    }

    clearSelection(): void {
        this.config.folderId = '';
        this.config.folderName = '';
        this.config.folderPath = '';
        this.node().name = DEFAULT_NODE_NAME[this.operation] || 'Fichier';
        this.node().configured = false;
        this.configChange.emit();
    }

    toggleFolder(folder: FolderTreeNode): void {
        if (!folder.loaded) {
            this.loadSubfolders(folder);
        } else {
            folder.expanded = !folder.expanded;
        }
    }

    private loadRootFolders(): void {
        const orgId = this.userService.getCurrentOrgId();
        if (!orgId) return;
        this.foldersService.listRoot(orgId).subscribe(folders => {
            this.rootFolders = folders.map(f => this.toTreeNode(f));
        });
    }

    private loadSubfolders(parent: FolderTreeNode): void {
        const orgId = this.userService.getCurrentOrgId();
        if (!orgId) return;
        this.foldersService.getContents(orgId, parent.id).subscribe(contents => {
            parent.children = contents.subfolders.map((f: FolderResponse) => this.toTreeNode(f));
            parent.loaded = true;
            parent.expanded = true;
        });
    }

    private toTreeNode(f: FolderResponse): FolderTreeNode {
        return { id: f.id, name: f.name, path: f.path, children: [], expanded: false, loaded: false };
    }
}

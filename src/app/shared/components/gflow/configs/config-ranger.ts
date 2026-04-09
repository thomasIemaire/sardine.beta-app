import { Component, EventEmitter, inject, input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { Observable, catchError, of, switchMap, tap } from 'rxjs';
import { GFlowNode, RangerConfig } from '../core/gflow.types';
import { DocumentService, ApiFolder } from '../../../../core/services/document.service';
import { ContextSwitcherService } from '../../../../core/layout/context-switcher/context-switcher.service';

const OPERATIONS = [
    { label: 'Ranger dans un dossier', value: 'archive' },
    { label: 'Déplacer vers un dossier', value: 'move' },
    { label: 'Supprimer le document',   value: 'delete' },
] as const;

const NODE_ICON: Record<string, string> = {
    archive: 'fa-solid fa-file-arrow-down',
    move:    'fa-solid fa-file-export',
    delete:  'fa-solid fa-file-slash',
};

@Component({
    selector: 'app-config-ranger',
    imports: [FormsModule, SelectModule, AutoCompleteModule],
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
                    <label class="config-label">
                        {{ operation === 'move' ? 'Dossier de destination' : 'Dossier de rangement' }}
                    </label>

                    <p-autocomplete
                        [(ngModel)]="path"
                        [suggestions]="suggestions"
                        (completeMethod)="onSearch($event)"
                        (onSelect)="onPathConfirm()"
                        (onBlur)="onPathConfirm()"
                        [placeholder]="'/dossier/sous-dossier/'"
                        size="small"
                        appendTo="body"
                        [forceSelection]="false"
                        styleClass="w-full path-input"
                    />

                    <div class="config-hint">
                        <i class="fa-regular fa-circle-info"></i>
                        Les dossiers absents seront créés automatiquement.
                    </div>
                </div>
            }
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }

        .config-hint {
            display: flex; align-items: center; gap: .375rem;
            font-size: .6875rem; color: var(--p-text-muted-color);
            i { font-size: .625rem; }
        }

        .delete-warning {
            display: flex; align-items: flex-start; gap: .625rem; padding: .75rem;
            background: color-mix(in srgb, var(--p-red-500) 10%, transparent);
            border: 1px solid color-mix(in srgb, var(--p-red-500) 30%, transparent);
            border-radius: .375rem; font-size: .8125rem; color: var(--p-red-600);
            i { margin-top: 2px; flex-shrink: 0; }
        }

        :host ::ng-deep .path-input {
            width: 100%;

            input {
                width: 100%;
                font-family: var(--font-mono, ui-monospace, monospace);
                font-size: .8125rem;
                letter-spacing: -.01em;
            }
        }

        :host ::ng-deep .p-autocomplete-overlay .p-autocomplete-option {
            font-family: var(--font-mono, ui-monospace, monospace);
            font-size: .8125rem;
        }
    `]
})
export class ConfigRangerComponent implements OnInit {
    node = input.required<GFlowNode>();
    @Output() configChange = new EventEmitter<void>();

    private readonly docService = inject(DocumentService);
    private readonly contextSwitcher = inject(ContextSwitcherService);

    operationOptions = OPERATIONS as unknown as { label: string; value: string }[];
    suggestions: string[] = [];

    // Cache null = racine, string = id du dossier parent
    private readonly childrenCache = new Map<string | null, ApiFolder[]>();

    get config(): RangerConfig { return this.node().config as RangerConfig; }

    get operation(): string { return this.config.operation || 'archive'; }
    set operation(v: string) { this.config.operation = v as RangerConfig['operation']; }

    get path(): string { return this.config.path || ''; }
    set path(v: string) { this.config.path = v; }

    ngOnInit(): void {
        // Préchargement des dossiers racines pour des suggestions instantanées
        this.loadChildren(null).subscribe();
    }

    onOperationChange(): void {
        const node = this.node();
        node.icon = { icon: NODE_ICON[this.operation] ?? NODE_ICON['archive'] };
        if (this.operation === 'delete') {
            this.config.path = '';
            node.name = 'Supprimer';
            node.configured = true;
        } else {
            this.syncNodeState();
        }
        this.configChange.emit();
    }

    onSearch(event: { query: string }): void {
        this.buildSuggestions(event.query).subscribe(s => this.suggestions = s);
    }

    onPathConfirm(): void {
        this.syncNodeState();
        if (this.config.path) this.configChange.emit();
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private syncNodeState(): void {
        const node = this.node();
        const p = this.config.path ?? '';
        const segments = p.split('/').filter(s => s.length > 0);
        if (segments.length > 0) {
            node.name = segments[segments.length - 1];
            node.configured = true;
        } else {
            node.name = 'Fichier';
            node.configured = false;
        }
    }

    private buildSuggestions(input: string) {
        // Normalise : ajoute un / en début si absent
        const normalized = input.startsWith('/') ? input : '/' + input;

        // Détermine le préfixe parent et le filtre courant
        const endsWithSlash = normalized.endsWith('/') || normalized === '/';
        const parts = normalized.split('/').filter(s => s.length > 0);
        const parentSegments = endsWithSlash ? parts : parts.slice(0, -1);
        const filter = endsWithSlash ? '' : (parts.at(-1) ?? '');
        const parentPrefix = parentSegments.length === 0
            ? '/'
            : '/' + parentSegments.join('/') + '/';

        return this.resolveFolderId(parentSegments).pipe(
            switchMap(parentId => this.loadChildren(parentId)),
            switchMap(children => {
                const matched = filter
                    ? children.filter(f => f.name.toLowerCase().startsWith(filter.toLowerCase()))
                    : children;
                return of(matched.map(f => parentPrefix + f.name + '/'));
            }),
            catchError(() => of([])),
        );
    }

    /** Résout l'id du dossier correspondant à un tableau de segments de chemin. */
    private resolveFolderId(segments: string[]) {
        if (segments.length === 0) return of<string | null>(null);
        return this.loadChildren(null).pipe(
            switchMap(roots => this.walkTree(roots, segments))
        );
    }

    private walkTree(folders: ApiFolder[], segments: string[]): Observable<string | null> {
        const match = folders.find(f => f.name.toLowerCase() === segments[0].toLowerCase());
        if (!match) return of(null);
        if (segments.length === 1) return of(match.id);
        return this.loadChildren(match.id).pipe(
            switchMap(children => this.walkTree(children, segments.slice(1)))
        );
    }

    private loadChildren(folderId: string | null): Observable<ApiFolder[]> {
        const cached = this.childrenCache.get(folderId);
        if (cached !== undefined) return of(cached);

        const orgId = this.contextSwitcher.selectedId();
        if (!orgId) return of<ApiFolder[]>([]);

        const call = folderId === null
            ? this.docService.getAccessibleFolders(orgId)
            : this.docService.getFolderContents(orgId, folderId);

        return call.pipe(
            tap(folders => this.childrenCache.set(folderId, folders)),
            catchError(() => of<ApiFolder[]>([])),
        );
    }
}

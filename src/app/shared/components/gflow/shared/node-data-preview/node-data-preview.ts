import { Component, computed, input, signal } from '@angular/core';
import { JsonValue } from '../../core/gflow.types';

type ValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

interface FlatNode {
    key: string;
    path: string;
    depth: number;
    type: ValueType;
    value: JsonValue;
    isCollapsible: boolean;
    childCount: number;
}

function getType(value: JsonValue): ValueType {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return typeof value as ValueType;
}

function flattenJson(
    obj: JsonValue,
    collapsedPaths: Set<string>,
    parentPath = '',
    depth = 0,
): FlatNode[] {
    if (typeof obj !== 'object' || obj === null) return [];

    const result: FlatNode[] = [];
    const isArray = Array.isArray(obj);
    const entries: [string, JsonValue][] = isArray
        ? (obj as JsonValue[]).map((v, i) => [String(i), v])
        : Object.entries(obj as Record<string, JsonValue>);

    for (const [key, value] of entries) {
        const path = parentPath ? `${parentPath}.${key}` : key;
        const type = getType(value);
        const isCollapsible = type === 'object' || type === 'array';
        const childCount = isCollapsible
            ? Array.isArray(value)
                ? (value as JsonValue[]).length
                : Object.keys(value as object).length
            : 0;

        result.push({ key, path, depth, type, value, isCollapsible, childCount });

        if (isCollapsible && !collapsedPaths.has(path)) {
            result.push(...flattenJson(value, collapsedPaths, path, depth + 1));
        }
    }

    return result;
}

@Component({
    selector: 'app-node-data-preview',
    template: `
        <div class="preview">
            <button class="preview-header" (click)="toggleExpanded()">
                <i class="fa-regular" [class.fa-chevron-right]="!expanded()" [class.fa-chevron-down]="expanded()"></i>
                <span class="preview-title">Données entrantes</span>
                @if (keyCount() > 0) {
                    <span class="preview-badge">{{ keyCount() }}</span>
                }
            </button>

            @if (expanded()) {
                <div class="preview-body">
                    @if (isEmpty()) {
                        <span class="preview-empty">Aucune donnée — connectez un nœud en amont</span>
                    } @else {
                        <div class="preview-tree">
                            @for (node of visibleNodes(); track node.path) {
                                <div
                                    class="tree-row"
                                    [style.padding-left.rem]="node.depth * 0.75 + 0.5"
                                    (mouseenter)="hoveredPath.set(node.path)"
                                    (mouseleave)="hoveredPath.set(null)">

                                    @if (node.isCollapsible) {
                                        <button class="tree-toggle" (click)="toggle(node.path)">
                                            <i class="fa-regular" [class.fa-chevron-right]="collapsedPaths().has(node.path)" [class.fa-chevron-down]="!collapsedPaths().has(node.path)"></i>
                                        </button>
                                    } @else {
                                        <span class="tree-indent"></span>
                                    }

                                    <span class="tree-key">{{ node.key }}</span>
                                    <span class="tree-colon">:</span>

                                    @if (node.isCollapsible && collapsedPaths().has(node.path)) {
                                        <span class="tree-collapsed-hint">
                                            {{ node.type === 'array' ? '[' + node.childCount + ']' : '{' + node.childCount + '}' }}
                                        </span>
                                    } @else if (!node.isCollapsible) {
                                        <span class="tree-value" [attr.data-type]="node.type">{{ formatValue(node) }}</span>
                                    }

                                    @if (hoveredPath() === node.path) {
                                        <button class="tree-copy" (click)="copyPath(node.path)" title="Copier le chemin">
                                            <i class="fa-regular fa-copy"></i>
                                        </button>
                                    }
                                </div>
                            }
                        </div>
                    }
                </div>
            }
        </div>
    `,
    styles: `
        .preview {
            border: 1px solid var(--surface-border);
            border-radius: 0.5rem;
            overflow: hidden;
            flex-shrink: 0;
        }

        .preview-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            width: 100%;
            padding: 0.5rem 0.625rem;
            background: var(--background-color-100);
            border: none;
            cursor: pointer;
            font-family: inherit;
            text-align: left;
            transition: background 0.1s;

            &:hover { background: var(--background-color-200); }

            i { font-size: 0.6rem; color: var(--p-text-muted-color); flex-shrink: 0; }
        }

        .preview-title {
            font-size: 0.6875rem;
            font-weight: 600;
            color: var(--p-text-muted-color);
            text-transform: uppercase;
            letter-spacing: 0.03em;
            flex: 1;
        }

        .preview-badge {
            font-size: 0.625rem;
            font-weight: 600;
            padding: 0.1rem 0.4rem;
            border-radius: 2rem;
            background: var(--background-color-300);
            color: var(--p-text-muted-color);
        }

        .preview-body {
            max-height: 240px;
            overflow-y: auto;
            background: var(--background-color-50);
        }

        .preview-empty {
            display: block;
            padding: 0.75rem;
            font-size: 0.75rem;
            color: var(--p-text-muted-color);
            font-style: italic;
        }

        .preview-tree {
            padding: 0.375rem 0;
        }

        .tree-row {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            min-height: 1.5rem;
            padding-right: 0.375rem;
            position: relative;
            border-radius: 0.25rem;
            margin: 0 0.25rem;

            &:hover { background: var(--background-color-100); }
        }

        .tree-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 1rem;
            height: 1rem;
            border: none;
            background: transparent;
            cursor: pointer;
            flex-shrink: 0;
            border-radius: 0.25rem;
            padding: 0;

            i { font-size: 0.5rem; color: var(--p-text-muted-color); }
            &:hover { background: var(--background-color-200); }
        }

        .tree-indent {
            width: 1rem;
            flex-shrink: 0;
        }

        .tree-key {
            font-size: 0.6875rem;
            font-weight: 600;
            color: var(--p-text-color);
            white-space: nowrap;
            flex-shrink: 0;
        }

        .tree-colon {
            font-size: 0.6875rem;
            color: var(--p-text-muted-color);
            flex-shrink: 0;
        }

        .tree-value {
            font-size: 0.6875rem;
            font-family: 'Courier New', monospace;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 140px;

            &[data-type='string']  { color: var(--green-color-600, #16a34a); }
            &[data-type='number']  { color: var(--p-blue-500, #3b82f6); }
            &[data-type='boolean'] { color: var(--p-orange-500, #f97316); }
            &[data-type='null']    { color: var(--p-text-muted-color); font-style: italic; }
        }

        .tree-collapsed-hint {
            font-size: 0.6875rem;
            color: var(--p-text-muted-color);
            font-family: 'Courier New', monospace;
        }

        .tree-copy {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 1.25rem;
            height: 1.25rem;
            border: none;
            background: var(--background-color-200);
            border-radius: 0.25rem;
            cursor: pointer;
            padding: 0;
            margin-left: auto;
            flex-shrink: 0;

            i { font-size: 0.6rem; color: var(--p-text-muted-color); }
            &:hover { background: var(--background-color-300); }
        }
    `,
})
export class NodeDataPreviewComponent {
    inputMap = input<JsonValue>(null);

    expanded = signal(true);
    hoveredPath = signal<string | null>(null);
    private _collapsedPaths = signal<Set<string>>(new Set());
    collapsedPaths = this._collapsedPaths.asReadonly();

    isEmpty = computed(() => {
        const map = this.inputMap();
        if (!map || typeof map !== 'object') return true;
        return Object.keys(map).length === 0;
    });

    keyCount = computed(() => {
        const map = this.inputMap();
        if (!map || typeof map !== 'object') return 0;
        return Object.keys(map).length;
    });

    visibleNodes = computed(() => {
        const map = this.inputMap();
        if (!map || typeof map !== 'object') return [];
        return flattenJson(map, this._collapsedPaths());
    });

    toggleExpanded(): void {
        this.expanded.update(v => !v);
    }

    toggle(path: string): void {
        this._collapsedPaths.update(set => {
            const next = new Set(set);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }

    formatValue(node: FlatNode): string {
        if (node.type === 'null') return 'null';
        if (node.type === 'string') return `"${node.value}"`;
        return String(node.value);
    }

    copyPath(path: string): void {
        navigator.clipboard.writeText(path);
    }
}

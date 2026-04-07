import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { FieldComponent } from '../field/field';
import { TextFieldComponent } from '../text-field/text-field';
import { SelectFieldComponent } from '../select-field/select-field';
import { RequirementsEditorComponent, SchemaRequirement } from './requirements-editor';

export type NodeValueType = 'string' | 'number' | 'boolean' | 'date' | 'list';

export class MapperNode {
    type: NodeValueType = 'string';
    itemType: NodeValueType = 'string';
    containerType: 'object' | 'list' = 'object';
    description: string = '';
    requirements: SchemaRequirement[] = [];

    constructor(
        public parent: MapperNode | null,
        public label: string = '',
        public children: MapperNode[] = [],
        public root: string = '',
    ) {}

    get key(): string {
        return (`${(this.parent?.key ?? this.root)}_${this.label}`).toUpperCase();
    }
}

type JsonObj = Record<string, unknown>;

function isPlainObject(v: unknown): v is JsonObj {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function buildJson(nodes: MapperNode[]): JsonObj {
    return nodes.reduce<JsonObj>((acc, node) => {
        const key = (node.label ?? '').trim();
        if (!key) return acc;

        const children = node.children ?? [];
        let value: unknown;
        if (children.length) {
            const childJson = buildJson(children);
            value = node.containerType === 'list' ? { _list: true, ...childJson } : childJson;
        } else {
            value = {
                _key: node.key,
                _type: node.type || 'string',
                ...(node.type === 'list' ? { _item_type: node.itemType || 'string' } : {}),
                _description: node.description || '',
                _requirements: node.requirements.length > 0 ? [...node.requirements] : [],
            };
        }

        if (key in acc && isPlainObject(acc[key]) && isPlainObject(value)) {
            acc[key] = { ...(acc[key] as JsonObj), ...(value as JsonObj) };
        } else {
            acc[key] = value;
        }
        return acc;
    }, {});
}

@Component({
    selector: 'app-mapper',
    imports: [CommonModule, FormsModule, ButtonModule, TooltipModule, FieldComponent, TextFieldComponent, SelectFieldComponent, RequirementsEditorComponent],
    templateUrl: './mapper.html',
    styleUrls: ['./mapper.scss'],
})
export class MapperComponent implements OnInit, OnChanges {
    @Input() label: string = 'Schéma';
    @Input() required: boolean = false;
    @Input() root: string = 'SCHEMA';

    private rootNode: MapperNode = new MapperNode(null, '', [], this.root);

    @Input() mapper: MapperNode[] = [this.rootNode];
    @Input() json?: Record<string, unknown>;
    @Input() isRoot: boolean = false;
    @Input() usingKeys: string[] = [];
    @Input() readonly: boolean = false;

    @Output() jsonChange = new EventEmitter<Record<string, unknown>>();
    @Output() keysChange = new EventEmitter<{ label: string; value: string }[]>();

    typeOptions = [
        { label: 'Texte', value: 'string' },
        { label: 'Nombre', value: 'number' },
        { label: 'Booléen', value: 'boolean' },
        { label: 'Date', value: 'date' },
        { label: 'Liste', value: 'list' },
    ];

    itemTypeOptions = [
        { label: 'Texte', value: 'string' },
        { label: 'Nombre', value: 'number' },
        { label: 'Booléen', value: 'boolean' },
        { label: 'Date', value: 'date' },
    ];

    objectTypeOptions = [
        { label: 'Objet', value: 'object' },
        { label: 'Liste', value: 'list' },
    ];

    private readonly messageService = inject(MessageService);

    ngOnInit(): void {
        this.reloadJson();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['root']) {
            this.mapper.forEach(node => {
                if (node.parent === null) node.root = this.root;
            });
        }
        this.reloadJson();
        if (changes['json']) {
            this.keysChange.emit(this.getLeafKeys());
        }
    }

    private reloadJson(): void {
        if (this.json) {
            if (Object.keys(this.json).length) {
                this.mapper = this.buildMapper(this.json);
            } else if (this.isRoot) {
                this.mapper = [this.rootNode];
            }
        }
    }

    private isLeafValue(value: unknown): value is JsonObj {
        return isPlainObject(value) && '_key' in value && '_type' in value;
    }

    private buildMapper(obj: Record<string, unknown>, parent: MapperNode | null = null): MapperNode[] {
        return Object.entries(obj).map(([key, value]) => {
            const node = new MapperNode(parent, key, [], this.root);
            if (this.isLeafValue(value)) {
                node.type = (value['_type'] as NodeValueType) || 'string';
                if (node.type === 'list') node.itemType = (value['_item_type'] as NodeValueType) || 'string';
                node.description = (value['_description'] as string) || '';
                const rawReqs = value['_requirements'];
                if (Array.isArray(rawReqs)) {
                    node.requirements = rawReqs as SchemaRequirement[];
                } else {
                    node.requirements = [];
                }
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                const obj = value as Record<string, unknown>;
                if (obj['_list'] === true) {
                    node.containerType = 'list';
                    const { _list, ...rest } = obj;
                    node.children = this.buildMapper(rest as Record<string, unknown>, node);
                } else {
                    node.children = this.buildMapper(obj, node);
                }
            }
            return node;
        });
    }

    addNode(parent: MapperNode | null): void {
        const node = new MapperNode(parent);
        this.mapper.push(node);
        if (parent === null) node.root = this.root;
    }

    addChild(node: MapperNode): void {
        (node.children ??= []).push(new MapperNode(node));
    }

    copyNode(node: MapperNode): void {
        window.navigator.clipboard.writeText(node.key);
        this.messageService.add({ severity: 'success', summary: 'Clé copiée', detail: `${node.key} a été copié dans le presse-papier.` });
    }

    removeNodeIfEmpty(node: MapperNode): void {
        if ((node.label ?? '').trim() === '' && !(this.isRoot && this.isFirstNode(node))) {
            const i = this.mapper.indexOf(node);
            if (i > -1) this.mapper.splice(i, 1);
            this.emitJson();
        } else if ((node.label ?? '').trim() === '' && this.isRoot && this.isFirstNode(node)) {
            node.children = [];
        }
    }

    hasNoChildren(node: MapperNode): boolean {
        return !node.children || node.children.length === 0;
    }

    keyIsUsed(node: MapperNode): boolean {
        return this.usingKeys.includes(node.key);
    }

    isLastNode(node: MapperNode): boolean {
        return node === this.mapper[this.mapper.length - 1];
    }

    isFirstNode(node: MapperNode): boolean {
        return node === this.mapper[0];
    }

    emitJson(): void {
        this.jsonChange.emit(buildJson(this.mapper));
        this.keysChange.emit(this.getLeafKeys());
    }

    getLeafKeys(): { label: string; value: string }[] {
        const keys: { label: string; value: string }[] = [];
        const traverse = (nodes: MapperNode[]) => {
            for (const node of nodes) {
                if (node.children && node.children.length > 0) {
                    traverse(node.children);
                } else {
                    keys.push({ label: node.label, value: node.key });
                }
            }
        };
        traverse(this.mapper);
        return keys;
    }

    onChildJsonChange(): void {
        this.emitJson();
    }

    trackByIndex = (_: number, __: MapperNode) => _;
}

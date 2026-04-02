import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';

export type RequirementType = 'required' | 'regex' | 'gte' | 'lte' | 'min_length' | 'max_length' | 'enum';

export interface SchemaRequirement {
    type: RequirementType;
    value?: string | number;
}

interface RequirementTypeDef {
    label: string;
    short: string;
    value: RequirementType;
    hasValue: boolean;
    valueType?: 'string' | 'number';
    placeholder?: string;
    description?: string;
    icon: string;
}

const REQUIREMENT_TYPE_DEFS: RequirementTypeDef[] = [
    { label: 'Requis',                value: 'required',   hasValue: false, icon: 'fa-regular fa-asterisk',       short: 'req',     description: 'Le champ est obligatoire' },
    { label: 'Expression régulière',  value: 'regex',      hasValue: true,  icon: 'fa-regular fa-code',           short: 'regex',   valueType: 'string', placeholder: '^[a-zA-Z]+$', description: 'Doit correspondre au pattern' },
    { label: 'Min (≥)',               value: 'gte',        hasValue: true,  icon: 'fa-regular fa-greater-than-equal', short: 'min≥', valueType: 'number', placeholder: '0',            description: 'Valeur minimale incluse' },
    { label: 'Max (≤)',               value: 'lte',        hasValue: true,  icon: 'fa-regular fa-less-than-equal',   short: 'max≤', valueType: 'number', placeholder: '100',          description: 'Valeur maximale incluse' },
    { label: 'Longueur min',          value: 'min_length', hasValue: true,  icon: 'fa-regular fa-text-size',      short: 'len≥',    valueType: 'number', placeholder: '1',            description: 'Nombre minimum de caractères' },
    { label: 'Longueur max',          value: 'max_length', hasValue: true,  icon: 'fa-regular fa-text-size',      short: 'len≤',    valueType: 'number', placeholder: '255',          description: 'Nombre maximum de caractères' },
    { label: 'Valeurs autorisées',    value: 'enum',       hasValue: true,  icon: 'fa-regular fa-list-check',     short: 'enum',    valueType: 'string', placeholder: 'val1, val2',   description: 'Liste séparée par des virgules' },
];

@Component({
    selector: 'app-requirements-editor',
    imports: [FormsModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule, CheckboxModule],
    template: `
        <!-- Trigger — looks like an input -->
        <button type="button" class="req-trigger" (click)="openDialog()">
            @if (requirements.length === 0) {
                <span class="req-placeholder">Contraintes</span>
            } @else {
                <span class="req-chips">
                    @for (r of requirements; track r.type) {
                        <span class="req-chip">
                            <i [class]="defOf(r.type)?.icon"></i>
                            {{ defOf(r.type)?.short }}{{ r.value != null ? ':' + r.value : '' }}
                        </span>
                    }
                </span>
            }
            <i class="fa-regular fa-sliders req-icon"></i>
        </button>

        <p-dialog
            header="Contraintes du champ"
            [(visible)]="dialogVisible"
            [modal]="true"
            [style]="{ width: '460px' }"
            appendTo="body"
            [draggable]="false"
            [resizable]="false"
        >
            <div class="req-dialog-body">
                @for (def of typeDefs; track def.value) {
                    <div class="req-item" [class.req-item--on]="dialogTypes[def.value]">
                        <div class="req-item__header" (click)="toggleType(def.value)">
                            <div class="req-item__icon-wrap">
                                <i [class]="def.icon"></i>
                            </div>
                            <div class="req-item__text">
                                <span class="req-item__label">{{ def.label }}</span>
                                <span class="req-item__desc">{{ def.description }}</span>
                            </div>
                            <p-checkbox
                                [binary]="true"
                                [ngModel]="dialogTypes[def.value]"
                                (ngModelChange)="dialogTypes[def.value] = $event"
                                [ngModelOptions]="{ standalone: true }"
                            />
                        </div>

                        @if (dialogTypes[def.value] && def.hasValue) {
                            <div class="req-item__input">
                                @if (def.valueType === 'number') {
                                    <p-inputnumber
                                        [ngModel]="asNumber(dialogValues[def.value])"
                                        (ngModelChange)="dialogValues[def.value] = $event"
                                        [ngModelOptions]="{ standalone: true }"
                                        [placeholder]="def.placeholder ?? ''"
                                        [showButtons]="false"
                                        size="small"
                                        fluid
                                    />
                                } @else {
                                    <input
                                        pInputText
                                        pSize="small"
                                        [ngModel]="dialogValues[def.value]"
                                        (ngModelChange)="dialogValues[def.value] = $event"
                                        [ngModelOptions]="{ standalone: true }"
                                        [placeholder]="def.placeholder ?? ''"
                                        style="width:100%"
                                    />
                                }
                            </div>
                        }
                    </div>
                }
            </div>

            <ng-template #footer>
                <p-button label="Annuler" severity="secondary" [text]="true" size="small" (onClick)="cancelDialog()" />
                <p-button label="Appliquer" icon="fa-regular fa-check" size="small" (onClick)="confirmDialog()" />
            </ng-template>
        </p-dialog>
    `,
    styles: [`
        /* ── Trigger ─────────────────────────────────────────── */
        .req-trigger {
            display: flex;
            align-items: center;
            gap: .375rem;
            width: 100%;
            padding-block: var(--p-inputtext-sm-padding-y);
            padding-inline: var(--p-inputtext-sm-padding-x);
            border: 1px solid var(--p-form-field-border-color);
            border-radius: .6875rem;
            background: var(--p-form-field-background);
            font-size: var(--p-inputtext-sm-font-size);
            cursor: pointer;
            transition: border-color 0.15s, box-shadow 0.15s;
            text-align: left;

            &:hover { border-color: var(--p-form-field-hover-border-color); }
            &:focus-visible {
                outline: none;
                border-color: var(--p-primary-color);
                box-shadow: 0 0 0 2px color-mix(in srgb, var(--p-primary-color) 20%, transparent);
            }
        }

        .req-placeholder {
            flex: 1;
            color: var(--p-form-field-placeholder-color);
        }

        .req-chips {
            flex: 1;
            display: flex;
            flex-wrap: wrap;
            gap: .25rem;
        }

        .req-chip {
            display: inline-flex;
            align-items: center;
            gap: .25rem;
            font-size: .625rem;
            font-weight: 600;
            color: var(--p-primary-color);
            background: color-mix(in srgb, var(--p-primary-color) 10%, transparent);
            border: 1px solid color-mix(in srgb, var(--p-primary-color) 25%, transparent);
            border-radius: 99px;
            padding: .125rem .4rem;
            white-space: nowrap;

            i { font-size: .55rem; }
        }

        .req-icon {
            font-size: var(--p-inputtext-sm-font-size);
            color: var(--p-text-muted-color);
            opacity: .6;
            flex-shrink: 0;
        }

        /* ── Dialog body ─────────────────────────────────────── */
        .req-dialog-body {
            display: flex;
            flex-direction: column;
            gap: .375rem;
        }

        .req-item {
            border: 1px solid var(--p-content-border-color);
            border-radius: .6875rem;
            overflow: hidden;
            transition: border-color 0.15s, background 0.12s;

            &:hover { background: var(--p-content-hover-background); }

            &--on {
                border-color: var(--p-primary-color);
                background: color-mix(in srgb, var(--p-primary-color) 6%, transparent);

                &:hover { background: color-mix(in srgb, var(--p-primary-color) 12%, transparent); }
            }
        }

        .req-item__header {
            display: flex;
            align-items: center;
            gap: .75rem;
            padding: .625rem .75rem;
            cursor: pointer;
        }

        .req-item__icon-wrap {
            width: 1.75rem;
            height: 1.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: var(--p-border-radius-sm);
            background: var(--p-content-hover-background);
            flex-shrink: 0;

            i { font-size: .75rem; color: var(--p-text-muted-color); }
        }

        .req-item--on .req-item__icon-wrap {
            background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
            i { color: var(--p-primary-color); }
        }

        .req-item__text {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: .0625rem;
            min-width: 0;
        }

        .req-item__label {
            font-size: .8125rem;
            font-weight: 500;
            color: var(--p-text-color);
        }

        .req-item__desc {
            font-size: .6875rem;
            color: var(--p-text-muted-color);
        }

        .req-item__input {
            padding: 0 .75rem .625rem 3.25rem;
        }
    `],
})
export class RequirementsEditorComponent {
    @Input() requirements: SchemaRequirement[] = [];
    @Output() requirementsChange = new EventEmitter<void>();

    typeDefs = REQUIREMENT_TYPE_DEFS;

    dialogVisible = false;
    dialogTypes: Record<string, boolean> = {};
    dialogValues: Record<string, string | number> = {};

    defOf(type: RequirementType): RequirementTypeDef | undefined {
        return REQUIREMENT_TYPE_DEFS.find(d => d.value === type);
    }

    asNumber(v: string | number | undefined): number | null {
        const n = Number(v);
        return isNaN(n) ? null : n;
    }

    openDialog(): void {
        this.dialogTypes = {};
        this.dialogValues = {};
        for (const def of REQUIREMENT_TYPE_DEFS) {
            const existing = this.requirements.find(r => r.type === def.value);
            this.dialogTypes[def.value] = !!existing;
            this.dialogValues[def.value] = existing?.value ?? '';
        }
        this.dialogVisible = true;
    }

    toggleType(type: string): void {
        this.dialogTypes[type] = !this.dialogTypes[type];
    }

    confirmDialog(): void {
        this.requirements.length = 0;
        for (const def of REQUIREMENT_TYPE_DEFS) {
            if (!this.dialogTypes[def.value]) continue;
            const req: SchemaRequirement = { type: def.value };
            if (def.hasValue) {
                req.value = def.valueType === 'number'
                    ? Number(this.dialogValues[def.value]) || 0
                    : String(this.dialogValues[def.value] || '');
            }
            this.requirements.push(req);
        }
        this.requirementsChange.emit();
        this.dialogVisible = false;
    }

    cancelDialog(): void {
        this.dialogVisible = false;
    }
}

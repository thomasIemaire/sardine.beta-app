import { Component, EventEmitter, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { EditConfig, EditOperation, GFlowNode } from '../core/gflow.types';

@Component({
    selector: 'app-config-edit',
    imports: [FormsModule, InputTextModule, SelectModule, ButtonModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Opérations</label>
                <div class="operations-list">
                    @for (op of operations; track $index) {
                        <div class="operation-item">
                            <p-select [options]="operationTypes" [(ngModel)]="op.type" optionLabel="label" optionValue="value" placeholder="Type" size="small" class="op-type" appendTo="body" (onChange)="onChange()" />
                            <input pInputText [(ngModel)]="op.path" placeholder="Chemin (ex: data.name)" pSize="small" class="op-path" (ngModelChange)="onChange()" />
                            @if (op.type === 'set') {
                                <input pInputText [(ngModel)]="op.value" placeholder="Valeur" pSize="small" class="op-value" (ngModelChange)="onChange()" />
                            }
                            @if (op.type === 'rename') {
                                <input pInputText [(ngModel)]="op.newPath" placeholder="Nouveau chemin" pSize="small" class="op-value" (ngModelChange)="onChange()" />
                            }
                            <p-button icon="fa-jelly-fill fa-solid fa-trash" severity="danger" text size="small" (onClick)="removeOperation($index)" />
                        </div>
                    }
                </div>
                <p-button label="Ajouter une opération" icon="fa-solid fa-plus" size="small" text (onClick)="addOperation()" />
            </div>
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .operations-list { display: flex; flex-direction: column; gap: .5rem; }
        .operation-item { display: flex; align-items: center; gap: .5rem; }
        .op-type { min-width: 100px; }
        .op-path, .op-value { flex: 1; }
    `]
})
export class ConfigEditComponent {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    operationTypes = [
        { label: 'Définir', value: 'set' },
        { label: 'Supprimer', value: 'delete' },
        { label: 'Renommer', value: 'rename' }
    ];

    get config(): EditConfig {
        const cfg = this.node().config as EditConfig;
        if (!cfg.operations) { cfg.operations = []; }
        return cfg;
    }

    get operations(): EditOperation[] { return this.config.operations; }

    onChange(): void { this.configChange.emit(); }

    addOperation(): void {
        this.operations.push({ type: 'set', path: '', value: '' });
        this.onChange();
    }

    removeOperation(index: number): void {
        this.operations.splice(index, 1);
        this.onChange();
    }
}

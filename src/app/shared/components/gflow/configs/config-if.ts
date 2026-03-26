import { Component, EventEmitter, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { GFlowNode, IfConfig } from '../core/gflow.types';

@Component({
    selector: 'app-config-if',
    imports: [FormsModule, InputTextModule, SelectModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Champ à évaluer</label>
                <input pInputText [(ngModel)]="field" placeholder="ex: data.status" pSize="small" (ngModelChange)="onChange()" />
            </div>
            <div class="config-field">
                <label class="config-label">Opérateur</label>
                <p-select [options]="operatorOptions" [(ngModel)]="operator" optionLabel="label" optionValue="value" size="small" appendTo="body" (onChange)="onChange()" />
            </div>
            <div class="config-field">
                <label class="config-label">Valeur</label>
                <input pInputText [(ngModel)]="value" placeholder="Valeur à comparer" pSize="small" (ngModelChange)="onChange()" />
            </div>
            <div class="config-field">
                <label class="config-label">Expression (avancé)</label>
                <input pInputText [(ngModel)]="condition" placeholder="ex: data.count > 10" pSize="small" (ngModelChange)="onChange()" />
            </div>
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
    `]
})
export class ConfigIfComponent {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    operatorOptions = [
        { label: 'Est égal à', value: 'equals' },
        { label: 'Contient', value: 'contains' },
        { label: 'Supérieur à', value: 'greater' },
        { label: 'Inférieur à', value: 'less' }
    ];

    get config(): IfConfig { return this.node().config as IfConfig; }

    get field(): string { return this.config.field || ''; }
    set field(value: string) { this.config.field = value; }

    get operator(): string { return this.config.operator || 'equals'; }
    set operator(value: string) { this.config.operator = value as IfConfig['operator']; }

    get value(): string { return this.config.value || ''; }
    set value(val: string) { this.config.value = val; }

    get condition(): string { return this.config.condition || ''; }
    set condition(value: string) { this.config.condition = value; }

    onChange(): void { this.configChange.emit(); }
}

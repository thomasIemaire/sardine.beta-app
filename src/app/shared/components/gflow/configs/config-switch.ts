import { Component, EventEmitter, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { GFlowNode, SwitchCase, SwitchConfig } from '../core/gflow.types';

@Component({
    selector: 'app-config-switch',
    imports: [FormsModule, ButtonModule, InputTextModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Champ à évaluer</label>
                <input pInputText [(ngModel)]="field" placeholder="ex: data.type" pSize="small" (ngModelChange)="onChange()" />
            </div>

            <div class="config-field">
                <label class="config-label">Cases</label>
                <div class="cases-list">
                    @for (caseItem of cases; track $index) {
                        <div class="case-item">
                            <input pInputText [(ngModel)]="caseItem.label" placeholder="Label" pSize="small" class="case-input" (ngModelChange)="onCaseChange($index)" />
                            <input pInputText [(ngModel)]="caseItem.value" placeholder="Valeur" pSize="small" class="case-input" (ngModelChange)="onCaseChange($index)" />
                            <p-button icon="fa-jelly-fill fa-solid fa-trash" severity="danger" text size="small" [disabled]="cases.length <= 1" (onClick)="removeCase($index)" />
                        </div>
                    }
                </div>
                <p-button label="Ajouter un case" icon="fa-solid fa-plus" size="small" text (onClick)="addCase()" />
            </div>
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .cases-list { display: flex; flex-direction: column; gap: .5rem; }
        .case-item { display: flex; align-items: center; gap: .5rem; }
        .case-input { flex: 1; }
    `]
})
export class ConfigSwitchComponent {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<{ type: string; config: SwitchConfig }>();

    get config(): SwitchConfig { return this.node().config as SwitchConfig; }

    get field(): string { return this.config.field || ''; }
    set field(value: string) { this.config.field = value; }

    get cases(): SwitchCase[] {
        if (!this.config.cases) { this.config.cases = [{ label: 'Case 1', value: '' }]; }
        return this.config.cases;
    }

    onChange(): void { this.configChange.emit({ type: 'config-updated', config: this.config }); }

    onCaseChange(_index: number): void {
        this.updateNodeOutputs();
        this.configChange.emit({ type: 'cases-changed', config: this.config });
    }

    addCase(): void {
        const newIndex = this.cases.length + 1;
        this.cases.push({ label: `Case ${newIndex}`, value: '' });
        this.updateNodeOutputs();
        this.configChange.emit({ type: 'cases-changed', config: this.config });
    }

    removeCase(index: number): void {
        if (this.cases.length > 1) {
            this.cases.splice(index, 1);
            this.updateNodeOutputs();
            this.configChange.emit({ type: 'cases-changed', config: this.config });
        }
    }

    private updateNodeOutputs(): void {
        const node = this.node();
        node.outputs = this.cases.map(c => ({ name: c.label }));
    }
}

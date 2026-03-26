import { Component, EventEmitter, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { GFlowNode, ForConfig } from '../core/gflow.types';

@Component({
    selector: 'app-config-for',
    imports: [FormsModule, InputTextModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Champ itérable</label>
                <small class="config-hint">Le chemin du champ contenant la liste à parcourir</small>
                <input pInputText [(ngModel)]="iterableField" placeholder="ex: data.items" pSize="small" (ngModelChange)="onChange()" />
            </div>
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .config-hint { font-size: .6875rem; color: var(--p-text-muted-color); }
    `]
})
export class ConfigForComponent {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    get config(): ForConfig { return this.node().config as ForConfig; }

    get iterableField(): string { return this.config.iterableField || ''; }
    set iterableField(value: string) { this.config.iterableField = value; }

    onChange(): void { this.configChange.emit(); }
}

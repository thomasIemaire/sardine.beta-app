import { Component, EventEmitter, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { GFlowNode, DoWhileConfig } from '../core/gflow.types';

@Component({
    selector: 'app-config-do-while',
    imports: [FormsModule, InputTextModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Condition</label>
                <small class="config-hint">Le contenu est exécuté une première fois, puis répété tant que cette condition est vraie</small>
                <input pInputText [(ngModel)]="condition" placeholder="ex: data.retries < 3" pSize="small" (ngModelChange)="onChange()" />
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
export class ConfigDoWhileComponent {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    get config(): DoWhileConfig { return this.node().config as DoWhileConfig; }

    get condition(): string { return this.config.condition || ''; }
    set condition(value: string) { this.config.condition = value; }

    onChange(): void { this.configChange.emit(); }
}

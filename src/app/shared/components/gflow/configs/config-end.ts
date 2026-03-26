import { Component, EventEmitter, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { EndConfig, GFlowNode } from '../core/gflow.types';

export interface SelectOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-config-end',
    imports: [FormsModule, SelectModule, Textarea],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Statut de fin</label>
                <p-select
                    [options]="statusOptions"
                    [(ngModel)]="status"
                    optionLabel="label"
                    optionValue="value"
                    size="small"
                    appendTo="body"
                    (onChange)="onStatusChange()" />
            </div>

            @if (status === 'failed') {
            <div class="config-field">
                <label class="config-label">Message d'erreur</label>
                <textarea pTextarea
                    [(ngModel)]="errorMessage"
                    placeholder="Décrivez l'erreur..."
                    [rows]="3"
                    (ngModelChange)="onChange()"></textarea>
            </div>
            }
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
    `]
})
export class ConfigEndComponent {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    statusOptions: SelectOption[] = [
        { label: 'Terminé', value: 'completed' },
        { label: 'Échoué', value: 'failed' },
        { label: 'Annulé', value: 'cancelled' }
    ];

    get status(): string {
        return (this.node().config as EndConfig)?.status || 'completed';
    }

    set status(value: string) {
        (this.node().config as EndConfig).status = value as EndConfig['status'];
    }

    get errorMessage(): string {
        return (this.node().config as EndConfig)?.error_message || '';
    }

    set errorMessage(value: string) {
        (this.node().config as EndConfig).error_message = value || undefined;
    }

    onStatusChange(): void {
        this.configChange.emit();
    }

    onChange(): void {
        this.configChange.emit();
    }
}

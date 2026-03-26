import { Component, EventEmitter, input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { ClassificationConfig, GFlowNode } from '../core/gflow.types';

interface DocumentClassOption {
    label: string;
    value: string;
}

const DOCUMENT_CLASS_OPTIONS: DocumentClassOption[] = [
    { label: 'Facture', value: 'facture' },
    { label: 'Bulletin de paie', value: 'bulletin-de-paie' },
    { label: 'Contrat', value: 'contrat' },
    { label: 'Devis', value: 'devis' },
    { label: 'Bon de commande', value: 'bon-de-commande' },
    { label: 'Avoir', value: 'avoir' },
    { label: 'Relevé bancaire', value: 'releve-bancaire' },
    { label: 'Attestation', value: 'attestation' },
];

@Component({
    selector: 'app-config-classification',
    imports: [FormsModule, MultiSelectModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Classes de document acceptées</label>
                <p-multiselect
                    [options]="documentClassOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Sélectionner les classes..."
                    [(ngModel)]="selectedClasses"
                    size="small"
                    appendTo="body"
                    (onChange)="onClassesChange()" />
            </div>
            <div class="config-hint">
                Les documents correspondant aux classes sélectionnées sortiront par "Valide", les autres par "Invalide".
            </div>
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .config-hint { font-size: .75rem; color: var(--p-text-muted-color); line-height: 1.4; }
    `]
})
export class ConfigClassificationComponent implements OnInit {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    documentClassOptions = DOCUMENT_CLASS_OPTIONS;
    selectedClasses: string[] = [];

    ngOnInit(): void {
        const config = this.node().config as ClassificationConfig;
        this.selectedClasses = config.documentClasses ?? [];
    }

    get config(): ClassificationConfig { return this.node().config as ClassificationConfig; }

    onClassesChange(): void {
        this.config.documentClasses = [...this.selectedClasses];
        this.node().configured = this.selectedClasses.length > 0;
        this.configChange.emit();
    }
}

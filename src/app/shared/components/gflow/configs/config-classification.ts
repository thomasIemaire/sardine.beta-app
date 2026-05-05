import { Component, EventEmitter, inject, input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { catchError, of } from 'rxjs';
import { ClassificationConfig, GFlowNode } from '../core/gflow.types';
import { ClassifierService, ClassifierVersion } from '../../../../core/services/classifier.service';

interface DocumentClassOption {
    label: string;
    value: string;
}

interface VersionOption {
    label: string;
    value: string;
}

const CLASS_LABELS: Record<string, string> = {
    invoice: 'Facture',
    payslip: 'Bulletin de paie',
    contract: 'Contrat',
    quote: 'Devis',
    purchase_order: 'Bon de commande',
    credit_note: 'Avoir',
    bank_statement: 'Relevé bancaire',
    certificate: 'Attestation',
    identity_document: 'Pièce d\'identité',
    tax_notice: 'Avis d\'imposition',
    insurance: 'Assurance',
    lease: 'Bail',
    receipt: 'Reçu',
    other: 'Autre',
};

function classLabel(cls: string): string {
    return CLASS_LABELS[cls] ?? cls;
}

@Component({
    selector: 'app-config-classification',
    imports: [FormsModule, MultiSelectModule, SelectModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Version du modèle</label>
                <p-select
                    [options]="versionOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Sélectionner une version..."
                    [(ngModel)]="selectedModelVersion"
                    size="small"
                    appendTo="body"
                    [loading]="loading"
                    (onChange)="onVersionChange()" />
            </div>
            @if (selectedModelVersion) {
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
            }
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

    private readonly classifierService = inject(ClassifierService);

    loading = false;
    versions: ClassifierVersion[] = [];
    versionOptions: VersionOption[] = [];
    documentClassOptions: DocumentClassOption[] = [];

    selectedModelVersion = '';
    selectedClasses: string[] = [];

    get config(): ClassificationConfig { return this.node().config as ClassificationConfig; }

    ngOnInit(): void {
        this.selectedModelVersion = this.config.modelVersion ?? '';
        this.selectedClasses = this.config.documentClasses ?? [];
        this.loadVersions();
    }

    onVersionChange(): void {
        this.selectedClasses = [];
        this.config.modelVersion = this.selectedModelVersion;
        this.config.documentClasses = [];
        this.node().configured = false;
        this.updateClassOptions();
        this.configChange.emit();
    }

    onClassesChange(): void {
        this.config.documentClasses = [...this.selectedClasses];
        this.node().configured = !!this.selectedModelVersion && this.selectedClasses.length > 0;
        this.configChange.emit();
    }

    private loadVersions(): void {
        this.loading = true;
        this.classifierService.getVersions()
            .pipe(catchError(() => of([] as ClassifierVersion[])))
            .subscribe((versions) => {
                this.versions = versions;
                this.versionOptions = versions.map((v) => ({
                    label: v.version,
                    value: v.version,
                }));
                this.loading = false;
                this.updateClassOptions();
            });
    }

    private updateClassOptions(): void {
        const found = this.versions.find((v) => v.version === this.selectedModelVersion);
        this.documentClassOptions = found
            ? found.classes.map((cls) => ({ label: classLabel(cls), value: cls }))
            : [];
    }
}

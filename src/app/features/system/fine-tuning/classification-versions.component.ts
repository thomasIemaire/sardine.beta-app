import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { catchError, of, firstValueFrom } from 'rxjs';
import { ClassifierService, ClassifierVersion } from '../../../core/services/classifier.service';
import { DatasetService, ApiDataset } from '../../../core/services/dataset.service';
import { ContextSwitcherService } from '../../../core/layout/context-switcher/context-switcher.service';

const CLASS_LABELS: Record<string, string> = {
    invoice:           'Facture',
    invoice_next:      'Facture (suite)',
    payslip:           'Bulletin de paie',
    contract:          'Contrat',
    quote:             'Devis',
    purchase_order:    'Bon de commande',
    credit_note:       'Avoir',
    bank_statement:    'Relevé bancaire',
    certificate:       'Attestation',
    terms_of_service:  'CGU',
    terms_of_sale:     'CGV',
    identity_document: 'Pièce d\'identité',
    tax_notice:        'Avis d\'imposition',
    insurance:         'Assurance',
    lease:             'Bail',
    receipt:           'Reçu',
};

function classLabel(cls: string): string {
    return CLASS_LABELS[cls] ?? cls;
}

@Component({
    selector: 'app-classification-versions',
    imports: [DatePipe, FormsModule, ButtonModule, SelectModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast position="bottom-right" [life]="3500" />

        <div class="cv-layout">

            <!-- ── Left: version list ─────────────────────────────────── -->
            <div class="cv-sidebar">
                <div class="cv-sidebar-header">
                    <span class="cv-sidebar-title">Versions</span>
                </div>

                @if (loading()) {
                    <div class="cv-sidebar-loading">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                    </div>
                } @else {
                    <div class="cv-version-list">
                        @for (v of versions(); track v.version; let i = $index) {
                            <button
                                class="cv-version-item"
                                [class.cv-version-item--active]="selected()?.version === v.version"
                                (click)="select(v)"
                            >
                                <div class="cv-version-item-main">
                                    <span class="cv-version-tag">{{ v.version }}</span>
                                    @if (i === 0) { <span class="cv-latest">latest</span> }
                                </div>
                                <span class="cv-version-count">{{ v.classes.length }}</span>
                            </button>
                        }
                    </div>
                }
            </div>

            <!-- ── Right: detail panel ────────────────────────────────── -->
            <div class="cv-detail">
                @if (!selected()) {
                    <div class="cv-detail-empty">
                        <i class="fa-regular fa-arrow-left cv-detail-empty-icon"></i>
                        <span>Sélectionnez une version</span>
                    </div>
                } @else {
                    <div class="cv-detail-content">

                        <!-- Header -->
                        <div class="cv-detail-header">
                            <div class="cv-detail-title-row">
                                <span class="cv-detail-version">{{ selected()!.version }}</span>
                                @if (isLatest()) {
                                    <span class="cv-latest-badge">Dernière version</span>
                                }
                            </div>
                            <div class="cv-detail-meta">
                                <span class="cv-detail-model">{{ selected()!.model }}</span>
                                @if (selected()!.published_at) {
                                    <span class="cv-detail-sep">·</span>
                                    <span class="cv-detail-date">
                                        <i class="fa-regular fa-calendar"></i>
                                        {{ selected()!.published_at | date:'dd/MM/yyyy' }}
                                    </span>
                                }
                            </div>
                        </div>

                        <!-- Classes -->
                        <div class="cv-detail-section">
                            <span class="cv-section-label">
                                Classes supportées
                                <span class="cv-section-count">{{ selected()!.classes.length }}</span>
                            </span>
                            <div class="cv-chips">
                                @for (cls of selected()!.classes; track cls) {
                                    <span class="cv-chip">{{ classLabel(cls) }}</span>
                                }
                            </div>
                        </div>

                        <!-- Training -->
                        <div class="cv-detail-section">
                            <span class="cv-section-label">
                                Entraînement
                            </span>
                            <div class="cv-training-card">
                                <div class="cv-training-card-header">
                                    <div class="cv-training-card-icon">
                                        <i class="fa-regular fa-microchip-ai"></i>
                                    </div>
                                    <div class="cv-training-card-title-block">
                                        <span class="cv-training-card-title">Fine-tuner {{ selected()!.version }}</span>
                                        <span class="cv-training-card-subtitle">Entraîner le modèle sur un dataset annoté et prêt.</span>
                                    </div>
                                </div>

                                <div class="cv-training-card-body">
                                    <p-select
                                        [options]="readyDatasets()"
                                        optionLabel="name"
                                        optionValue="id"
                                        placeholder="Sélectionner un dataset…"
                                        appendTo="body"
                                        [loading]="loadingDatasets()"
                                        [ngModel]="selectedDatasetId()" (ngModelChange)="selectedDatasetId.set($event)"
                                        emptyMessage="Aucun dataset prêt disponible"
                                        (onShow)="loadReadyDatasets()"
                                        size="small"
                                        />

                                    @if (selectedDataset()) {
                                        <div class="cv-training-dataset-info">
                                            <div class="cv-training-stat">
                                                <i class="fa-regular fa-file-lines"></i>
                                                <span>{{ selectedDataset()!.page_count ?? '—' }} pages</span>
                                            </div>
                                            <div class="cv-training-stat">
                                                <i class="fa-regular fa-circle-check"></i>
                                                <span>{{ selectedDataset()!.processed_count ?? '—' }} annotées</span>
                                            </div>
                                        </div>
                                    }
                                </div>

                                <div class="cv-training-card-footer">
                                    <p-button
                                        label="Lancer l'entraînement"
                                        icon="fa-regular fa-play"
                                        size="small"
                                        [disabled]="!selectedDatasetId()"
                                        [loading]="launching()"
                                        (onClick)="launchTraining()"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                }
            </div>

        </div>
    `,
    styles: [`
        :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

        .cv-layout {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        /* ── Sidebar ─────────────────────────────────────────────────── */

        .cv-sidebar {
            display: flex;
            flex-direction: column;
            width: 200px;
            flex-shrink: 0;
            border-right: 1px solid var(--surface-border);
            overflow: hidden;
        }

        .cv-sidebar-header {
            padding: 1rem 1rem .625rem;
            flex-shrink: 0;
        }

        .cv-sidebar-title {
            font-size: .6875rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .06em;
            color: var(--p-text-muted-color);
        }

        .cv-sidebar-loading {
            display: flex;
            justify-content: center;
            padding: 1.5rem;
            color: var(--p-text-muted-color);
        }

        .cv-version-list {
            flex: 1;
            overflow-y: auto;
            padding: 0 .5rem .5rem;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .cv-version-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: .5rem;
            padding: .5rem .625rem;
            border: none;
            border-radius: .5rem;
            background: transparent;
            cursor: pointer;
            text-align: left;
            color: var(--p-text-color);
            transition: background .12s;

            &:hover { background: var(--p-surface-hover); }

            &.cv-version-item--active {
                background: color-mix(in srgb, var(--p-primary-500) 10%, transparent);
                .cv-version-tag { color: var(--p-primary-500); font-weight: 700; }
                .cv-version-count { background: color-mix(in srgb, var(--p-primary-500) 15%, transparent); color: var(--p-primary-500); }
            }
        }

        .cv-version-item-main {
            display: flex;
            align-items: center;
            gap: .375rem;
        }

        .cv-version-tag {
            font-family: monospace;
            font-size: .8125rem;
            font-weight: 600;
        }

        .cv-latest {
            font-size: .5625rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .04em;
            padding: .1rem .3rem;
            border-radius: 4px;
            background: color-mix(in srgb, #10b981 15%, transparent);
            color: #059669;
        }

        .cv-version-count {
            font-size: .6875rem;
            font-weight: 600;
            padding: .1rem .375rem;
            border-radius: 999px;
            background: var(--p-surface-hover);
            color: var(--p-text-muted-color);
        }

        /* ── Detail ──────────────────────────────────────────────────── */

        .cv-detail {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .cv-detail-empty {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: .75rem;
            color: var(--p-text-muted-color);
            font-size: .875rem;
        }

        .cv-detail-empty-icon { font-size: 1.5rem; }

        .cv-detail-content {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 2rem;
            padding: 2rem 2.5rem;
        }

        .cv-detail-header {
            display: flex;
            flex-direction: column;
            gap: .25rem;
        }

        .cv-detail-title-row {
            display: flex;
            align-items: center;
            gap: .625rem;
        }

        .cv-detail-version {
            font-size: 1.375rem;
            font-weight: 700;
            font-family: monospace;
        }

        .cv-latest-badge {
            font-size: .625rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .04em;
            padding: .2rem .5rem;
            border-radius: 999px;
            background: color-mix(in srgb, var(--p-primary-500) 12%, transparent);
            color: var(--p-primary-500);
        }

        .cv-detail-meta {
            display: flex;
            align-items: center;
            gap: .5rem;
        }

        .cv-detail-model {
            font-size: .8125rem;
            color: var(--p-text-muted-color);
        }

        .cv-detail-sep {
            font-size: .8125rem;
            color: var(--p-text-muted-color);
            opacity: .4;
        }

        .cv-detail-date {
            display: flex;
            align-items: center;
            gap: .3rem;
            font-size: .8125rem;
            color: var(--p-text-muted-color);

            i { font-size: .75rem; }
        }

        /* ── Sections ────────────────────────────────────────────────── */

        .cv-detail-section {
            display: flex;
            flex-direction: column;
            gap: .875rem;
            padding-top: 2rem;
            border-top: 1px solid var(--surface-border);
        }

        .cv-section-label {
            display: flex;
            align-items: center;
            gap: .5rem;
            font-size: .6875rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .07em;
            color: var(--p-text-muted-color);
        }

        .cv-section-count {
            font-size: .6875rem;
            padding: .1rem .4rem;
            border-radius: 999px;
            background: var(--p-surface-hover);
            color: var(--p-text-muted-color);
            font-weight: 600;
            text-transform: none;
            letter-spacing: 0;
        }

        /* ── Chips ───────────────────────────────────────────────────── */

        .cv-chips {
            display: flex;
            flex-wrap: wrap;
            gap: .375rem;
        }

        .cv-chip {
            font-size: .8125rem;
            padding: .3rem .75rem;
            border-radius: .375rem;
            background: var(--p-surface-hover);
            color: var(--p-text-color);
            border: 1px solid var(--surface-border);
        }

        /* ── Training card ───────────────────────────────────────────── */

        .cv-training-card {
            display: flex;
            flex-direction: column;
            border: 1px solid var(--surface-border);
            border-radius: .75rem;
            overflow: hidden;
        }

        .cv-training-card-header {
            display: flex;
            align-items: center;
            gap: .875rem;
            padding: 1rem 1.25rem;
            background: var(--p-surface-hover);
            border-bottom: 1px solid var(--surface-border);
        }

        .cv-training-card-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 2.25rem;
            height: 2.25rem;
            border-radius: .5rem;
            background: color-mix(in srgb, var(--p-primary-500) 12%, transparent);
            color: var(--p-primary-500);
            font-size: 1rem;
            flex-shrink: 0;
        }

        .cv-training-card-title-block {
            display: flex;
            flex-direction: column;
            gap: .125rem;
        }

        .cv-training-card-title {
            font-size: .875rem;
            font-weight: 600;
        }

        .cv-training-card-subtitle {
            font-size: .75rem;
            color: var(--p-text-muted-color);
        }

        .cv-training-card-body {
            display: flex;
            flex-direction: column;
            gap: .75rem;
            padding: 1.25rem;
        }

        .cv-training-card-body p-select { width: 100%; }

        .cv-training-dataset-info {
            display: flex;
            gap: 1rem;
        }

        .cv-training-stat {
            display: flex;
            align-items: center;
            gap: .375rem;
            font-size: .8125rem;
            color: var(--p-text-muted-color);

            i { font-size: .75rem; }
        }

        .cv-training-card-footer {
            display: flex;
            justify-content: flex-end;
            padding: .875rem 1.25rem;
            border-top: 1px solid var(--surface-border);
            background: var(--p-surface-hover);
        }
    `],
})
export class ClassificationVersionsComponent implements OnInit {
    private readonly classifierService = inject(ClassifierService);
    private readonly datasetService    = inject(DatasetService);
    private readonly contextSwitcher   = inject(ContextSwitcherService);
    private readonly messageService    = inject(MessageService);

    readonly loading         = signal(true);
    readonly loadingDatasets = signal(false);
    readonly launching       = signal(false);
    readonly versions        = signal<ClassifierVersion[]>([]);
    readonly readyDatasets   = signal<ApiDataset[]>([]);
    readonly selected        = signal<ClassifierVersion | null>(null);

    readonly selectedDatasetId = signal<string | null>(null);

    readonly selectedDataset = computed(() =>
        this.readyDatasets().find((d) => d.id === this.selectedDatasetId()) ?? null
    );

    readonly classLabel = classLabel;

    isLatest(): boolean {
        return this.selected()?.version === this.versions()[0]?.version;
    }

    ngOnInit(): void {
        const MOCK: ClassifierVersion[] = [
            { model: 'Sendoc/sard-cls', version: 'v3.2.0', published_at: '2026-04-10T09:15:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement', 'certificate', 'terms_of_service', 'terms_of_sale', 'identity_document', 'tax_notice', 'insurance', 'lease', 'receipt'] },
            { model: 'Sendoc/sard-cls', version: 'v3.1.1', published_at: '2026-03-22T14:00:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement', 'certificate', 'terms_of_service', 'terms_of_sale', 'identity_document', 'tax_notice', 'insurance', 'lease'] },
            { model: 'Sendoc/sard-cls', version: 'v3.1.0', published_at: '2026-03-01T11:30:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement', 'certificate', 'terms_of_service', 'terms_of_sale', 'identity_document', 'tax_notice', 'insurance'] },
            { model: 'Sendoc/sard-cls', version: 'v3.0.2', published_at: '2026-02-14T08:45:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement', 'certificate', 'terms_of_service', 'terms_of_sale', 'identity_document', 'tax_notice'] },
            { model: 'Sendoc/sard-cls', version: 'v3.0.1', published_at: '2026-01-28T16:20:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement', 'certificate', 'terms_of_service', 'terms_of_sale', 'identity_document'] },
            { model: 'Sendoc/sard-cls', version: 'v3.0.0', published_at: '2026-01-10T10:00:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement', 'certificate', 'terms_of_service', 'terms_of_sale'] },
            { model: 'Sendoc/sard-cls', version: 'v2.5.3', published_at: '2025-12-05T13:10:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement', 'certificate', 'terms_of_service'] },
            { model: 'Sendoc/sard-cls', version: 'v2.5.2', published_at: '2025-11-18T09:00:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement', 'certificate'] },
            { model: 'Sendoc/sard-cls', version: 'v2.5.0', published_at: '2025-11-03T14:22:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement'] },
            { model: 'Sendoc/sard-cls', version: 'v2.4.1', published_at: '2025-10-15T11:00:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note'] },
            { model: 'Sendoc/sard-cls', version: 'v2.4.0', published_at: '2025-09-30T08:30:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract', 'quote', 'purchase_order'] },
            { model: 'Sendoc/sard-cls', version: 'v2.3.0', published_at: '2025-09-01T10:15:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract', 'quote'] },
            { model: 'Sendoc/sard-cls', version: 'v2.2.1', published_at: '2025-08-12T14:45:00.000Z', classes: ['invoice', 'invoice_next', 'payslip', 'contract'] },
            { model: 'Sendoc/sard-cls', version: 'v2.2.0', published_at: '2025-07-28T09:00:00.000Z', classes: ['invoice', 'invoice_next', 'payslip'] },
            { model: 'Sendoc/sard-cls', version: 'v2.1.0', published_at: '2025-07-01T11:30:00.000Z', classes: ['invoice', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement', 'certificate', 'identity_document', 'tax_notice'] },
            { model: 'Sendoc/sard-cls', version: 'v2.0.1', published_at: '2025-06-10T08:00:00.000Z', classes: ['invoice', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement', 'certificate', 'identity_document'] },
            { model: 'Sendoc/sard-cls', version: 'v2.0.0', published_at: '2025-05-20T10:00:00.000Z', classes: ['invoice', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement', 'certificate'] },
            { model: 'Sendoc/sard-cls', version: 'v1.3.2', published_at: '2025-04-15T14:00:00.000Z', classes: ['invoice', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note', 'bank_statement'] },
            { model: 'Sendoc/sard-cls', version: 'v1.3.1', published_at: '2025-03-28T09:30:00.000Z', classes: ['invoice', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note'] },
            { model: 'Sendoc/sard-cls', version: 'v1.3.0', published_at: '2025-03-10T11:00:00.000Z', classes: ['invoice', 'payslip', 'contract', 'quote', 'purchase_order', 'credit_note'] },
            { model: 'Sendoc/sard-cls', version: 'v1.2.1', published_at: '2025-02-18T08:45:00.000Z', classes: ['invoice', 'payslip', 'contract', 'quote', 'purchase_order'] },
            { model: 'Sendoc/sard-cls', version: 'v1.2.0', published_at: '2025-01-30T10:15:00.000Z', classes: ['invoice', 'payslip', 'contract', 'quote', 'purchase_order'] },
            { model: 'Sendoc/sard-cls', version: 'v1.1.0', published_at: '2025-01-08T09:00:00.000Z', classes: ['invoice', 'payslip', 'contract', 'quote'] },
            { model: 'Sendoc/sard-cls', version: 'v1.0.1', published_at: '2024-12-12T14:30:00.000Z', classes: ['invoice', 'payslip', 'contract'] },
            { model: 'Sendoc/sard-cls', version: 'v1.0.0', published_at: '2024-11-20T10:00:00.000Z', classes: ['invoice', 'payslip'] },
        ];
        this.versions.set(MOCK);
        this.selected.set(MOCK[0]);
        this.loading.set(false);
    }

    select(v: ClassifierVersion): void {
        this.selected.set(v);
        this.selectedDatasetId.set(null);
    }

    async launchTraining(): Promise<void> {
        if (!this.selectedDatasetId()) return;
        const dataset = this.selectedDataset();
        const version = this.selected()?.version;

        this.launching.set(true);
        await new Promise((r) => setTimeout(r, 1200));
        this.launching.set(false);
        this.selectedDatasetId.set(null);

        this.messageService.add({
            severity: 'success',
            summary: 'Entraînement lancé',
            detail: `Fine-tuning ${version} sur "${dataset?.name}" démarré.`,
        });
    }

    async loadReadyDatasets(): Promise<void> {
        if (this.readyDatasets().length > 0) return;
        const orgId = this.contextSwitcher.selectedId();
        if (!orgId) return;

        this.loadingDatasets.set(true);
        try {
            const all = await firstValueFrom(
                this.datasetService.listDatasets(orgId).pipe(catchError(() => of([] as ApiDataset[])))
            );
            this.readyDatasets.set(all.filter((d) => d.status === 'ready'));
        } finally {
            this.loadingDatasets.set(false);
        }
    }
}

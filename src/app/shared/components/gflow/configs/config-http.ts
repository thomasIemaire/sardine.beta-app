import { Component, EventEmitter, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { GFlowNode, HttpConfig, HttpHeader } from '../core/gflow.types';

@Component({
    selector: 'app-config-http',
    imports: [FormsModule, InputTextModule, SelectModule, ButtonModule, InputNumberModule, Textarea],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Méthode</label>
                <p-select [options]="methodOptions" [(ngModel)]="method" optionLabel="label" optionValue="value" size="small" appendTo="body" (onChange)="onChange()" />
            </div>

            <div class="config-field">
                <label class="config-label">URL</label>
                <input pInputText [(ngModel)]="url" placeholder="https://api.example.com/endpoint" pSize="small" (ngModelChange)="onChange()" />
            </div>

            <div class="config-field">
                <label class="config-label">Headers</label>
                <div class="headers-list">
                    @for (header of headers; track $index) {
                        <div class="header-item">
                            <input pInputText [(ngModel)]="header.key" placeholder="Clé" pSize="small" class="header-key" (ngModelChange)="onChange()" />
                            <input pInputText [(ngModel)]="header.value" placeholder="Valeur" pSize="small" class="header-value" (ngModelChange)="onChange()" />
                            <p-button icon="fa-jelly-fill fa-solid fa-trash" severity="danger" text size="small" (onClick)="removeHeader($index)" />
                        </div>
                    }
                </div>
                <p-button label="Ajouter un header" icon="fa-solid fa-plus" size="small" text (onClick)="addHeader()" />
            </div>

            @if (method !== 'GET') {
                <div class="config-field">
                    <label class="config-label">Type de body</label>
                    <p-select [options]="bodyTypeOptions" [(ngModel)]="bodyType" optionLabel="label" optionValue="value" size="small" appendTo="body" (onChange)="onChange()" />
                </div>

                @if (bodyType !== 'none') {
                    <div class="config-field">
                        <label class="config-label">Body</label>
                        <textarea pTextarea [(ngModel)]="body" [placeholder]="bodyPlaceholder" [rows]="5" (ngModelChange)="onChange()"></textarea>
                    </div>
                }
            }

            <div class="config-field">
                <label class="config-label">Options</label>
                <div class="config-row">
                    <div class="config-subfield">
                        <label class="config-sublabel">Timeout (ms)</label>
                        <p-inputNumber [(ngModel)]="timeout" [min]="1000" [max]="300000" [step]="1000" size="small" (ngModelChange)="onChange()" />
                    </div>
                    <div class="config-subfield">
                        <label class="config-sublabel">Retries</label>
                        <p-inputNumber [(ngModel)]="retries" [min]="0" [max]="10" size="small" (ngModelChange)="onChange()" />
                    </div>
                </div>
            </div>

            <div class="config-field">
                <label class="config-label">Chemin de sortie (optionnel)</label>
                <small class="config-hint">JSONPath pour extraire une partie de la réponse</small>
                <input pInputText [(ngModel)]="outputPath" placeholder="ex: data.results" pSize="small" (ngModelChange)="onChange()" />
            </div>
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .config-hint { font-size: .6875rem; color: var(--p-text-muted-color); }
        .config-row { display: flex; gap: 1rem; }
        .config-subfield { display: flex; flex-direction: column; gap: .25rem; flex: 1; }
        .config-sublabel { font-size: .75rem; color: var(--p-text-muted-color); }
        .headers-list { display: flex; flex-direction: column; gap: .5rem; }
        .header-item { display: flex; align-items: center; gap: .5rem; }
        .header-key { width: 140px; }
        .header-value { flex: 1; }
    `]
})
export class ConfigHttpComponent {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    methodOptions = [
        { label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' }, { label: 'PATCH', value: 'PATCH' },
        { label: 'DELETE', value: 'DELETE' }
    ];

    bodyTypeOptions = [
        { label: 'Aucun', value: 'none' }, { label: 'JSON', value: 'json' },
        { label: 'Form Data', value: 'form' }, { label: 'Raw', value: 'raw' }
    ];

    get config(): HttpConfig { return this.node().config as HttpConfig; }

    get method(): string { return this.config.method || 'GET'; }
    set method(value: string) { this.config.method = value as HttpConfig['method']; }

    get url(): string { return this.config.url || ''; }
    set url(value: string) { this.config.url = value; }

    get headers(): HttpHeader[] { if (!this.config.headers) { this.config.headers = []; } return this.config.headers; }

    get bodyType(): string { return this.config.bodyType || 'none'; }
    set bodyType(value: string) { this.config.bodyType = value as HttpConfig['bodyType']; }

    get body(): string { return this.config.body || ''; }
    set body(value: string) { this.config.body = value; }

    get timeout(): number { return this.config.timeout || 30000; }
    set timeout(value: number) { this.config.timeout = value; }

    get retries(): number { return this.config.retries || 0; }
    set retries(value: number) { this.config.retries = value; }

    get outputPath(): string { return this.config.outputPath || ''; }
    set outputPath(value: string) { this.config.outputPath = value; }

    get bodyPlaceholder(): string {
        switch (this.bodyType) {
            case 'json': return '{\n  "key": "value"\n}';
            case 'form': return 'key1=value1&key2=value2';
            default: return 'Contenu brut...';
        }
    }

    onChange(): void { this.configChange.emit(); }

    addHeader(): void { this.headers.push({ key: '', value: '' }); this.configChange.emit(); }

    removeHeader(index: number): void { this.headers.splice(index, 1); this.configChange.emit(); }
}

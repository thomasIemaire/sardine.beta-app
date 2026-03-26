import { Component, effect, EventEmitter, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { ApprovalConfig, ApprovalOption, GFlowNode } from '../core/gflow.types';

@Component({
    selector: 'app-config-approval',
    imports: [FormsModule, InputTextModule, SelectModule, ButtonModule, InputNumberModule, Textarea],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Titre de la demande</label>
                <input pInputText [(ngModel)]="title" placeholder="ex: Validation requise" pSize="small" (ngModelChange)="onChange()" />
            </div>

            <div class="config-field">
                <label class="config-label">Message</label>
                <textarea pTextarea pSize="small" [(ngModel)]="message" placeholder="Décrivez ce que l'utilisateur doit approuver..." [rows]="3" (ngModelChange)="onChange()"></textarea>
            </div>

            <div class="config-field">
                <label class="config-label">Options de réponse</label>
                <div class="options-list">
                    @for (option of options; track $index) {
                        <div class="option-item">
                            <input pInputText [(ngModel)]="option.label" placeholder="Label" pSize="small" class="option-input" (ngModelChange)="onOptionChange($index)" />
                            <input pInputText [(ngModel)]="option.value" placeholder="Valeur" pSize="small" class="option-input" (ngModelChange)="onOptionChange($index)" />
                            <p-button icon="fa-jelly-fill fa-solid fa-trash" severity="danger" text size="small" [disabled]="options.length <= 2" (onClick)="removeOption($index)" />
                        </div>
                    }
                </div>
                <p-button label="Ajouter une option" icon="fa-solid fa-plus" size="small" text (onClick)="addOption()" />
            </div>

            <div class="config-field">
                <label class="config-label">Assigner à</label>
                <div class="config-row">
                    <p-select [options]="assigneeTypeOptions" [(ngModel)]="assigneeType" optionLabel="label" optionValue="value" placeholder="Type" size="small" class="assignee-type" appendTo="body" (onChange)="onChange()" />
                    @if (assigneeType === 'user') {
                        <input pInputText [(ngModel)]="assigneeEmail" placeholder="Email de l'utilisateur" pSize="small" type="email" class="assignee-value" (ngModelChange)="onChange()" />
                    } @else if (assigneeType === 'team' || assigneeType === 'role') {
                        <input pInputText [(ngModel)]="assigneeId" [placeholder]="assigneePlaceholder" pSize="small" class="assignee-value" (ngModelChange)="onChange()" />
                    }
                </div>
            </div>

            <div class="config-field">
                <label class="config-label">Timeout (secondes)</label>
                <div class="config-row">
                    <p-inputNumber [(ngModel)]="timeout" [min]="0" [max]="604800" placeholder="0 = pas de timeout" size="small" class="timeout-input" (ngModelChange)="onChange()" />
                    @if (timeout && timeout > 0) {
                        <p-select [options]="timeoutActionOptions" [(ngModel)]="timeoutAction" optionLabel="label" optionValue="value" placeholder="Action au timeout" size="small" class="timeout-action" appendTo="body" (onChange)="onChange()" />
                    }
                </div>
            </div>
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .config-row { display: flex; gap: .5rem; }
        .assignee-type { width: 120px; }
        .assignee-value { flex: 1; }
        .options-list { display: flex; flex-direction: column; gap: .5rem; }
        .option-item { display: flex; align-items: center; gap: .5rem; }
        .option-input { flex: 1; }
        .timeout-input { width: 120px; }
        .timeout-action { flex: 1; }
    `]
})
export class ConfigApprovalComponent {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    assigneeTypeOptions = [
        { label: 'Exécutant du flow', value: 'executor' },
        { label: 'Utilisateur', value: 'user' },
        { label: 'Équipe', value: 'team' },
        { label: 'Rôle', value: 'role' },
    ];

    get timeoutActionOptions() {
        return [
            ...this.options.map(o => ({ label: `Répondre : ${o.label}`, value: o.value })),
            { label: 'Ignorer (pas de réponse)', value: 'skip' },
        ];
    }

    constructor() {
        effect(() => {
            const raw = this.node().config as Record<string, unknown>;
            if (raw['assigneeName'] && !raw['assigneeEmail']) {
                (raw as any).assigneeEmail = raw['assigneeName'];
                delete raw['assigneeName'];
            }
        });
    }

    get config(): ApprovalConfig { return this.node().config as ApprovalConfig; }

    get title(): string { return this.config.title || ''; }
    set title(value: string) { this.config.title = value; }

    get message(): string { return this.config.message || ''; }
    set message(value: string) { this.config.message = value; }

    get assigneeType(): string { return this.config.assigneeType || 'user'; }
    set assigneeType(value: string) { this.config.assigneeType = value as ApprovalConfig['assigneeType']; }

    get assigneeEmail(): string { return this.config.assigneeEmail || ''; }
    set assigneeEmail(value: string) { this.config.assigneeEmail = value; }

    get assigneePlaceholder(): string { return this.config.assigneeType === 'team' ? "Nom de l'équipe" : 'Nom du rôle'; }

    get assigneeId(): string { return this.config.assigneeId || ''; }
    set assigneeId(value: string) { this.config.assigneeId = value; }

    get options(): ApprovalOption[] {
        if (!this.config.options || this.config.options.length === 0) {
            this.config.options = [{ label: 'Approuver', value: 'approved' }, { label: 'Rejeter', value: 'rejected' }];
        }
        return this.config.options;
    }

    get timeout(): number | undefined { return this.config.timeout; }
    set timeout(value: number | undefined) { this.config.timeout = value; }

    get timeoutAction(): string { return this.config.timeoutAction || ''; }
    set timeoutAction(value: string) { this.config.timeoutAction = value; }

    onChange(): void {
        if (this.config.timeout && this.config.timeout > 0 && !this.config.timeoutAction) { this.config.timeoutAction = 'skip'; }
        if (!this.config.timeout || this.config.timeout <= 0) { delete this.config.timeout; delete this.config.timeoutAction; }
        this.validate();
        this.updateNodeOutputs();
        this.configChange.emit();
    }

    onOptionChange(_index: number): void { this.validate(); this.updateNodeOutputs(); this.configChange.emit(); }

    addOption(): void {
        const newIndex = this.options.length + 1;
        this.options.push({ label: `Option ${newIndex}`, value: `option_${newIndex}` });
        this.validate(); this.updateNodeOutputs(); this.configChange.emit();
    }

    removeOption(index: number): void {
        if (this.options.length > 2) { this.options.splice(index, 1); this.validate(); this.updateNodeOutputs(); this.configChange.emit(); }
    }

    private validate(): void {
        const c = this.config;
        const hasTitle = !!c.title?.trim();
        const hasOptions = c.options?.length >= 2 && c.options.every(o => !!o.label?.trim() && !!o.value?.trim());
        const hasAssignee =
            c.assigneeType === 'executor' ? true :
            c.assigneeType === 'user' ? !!c.assigneeEmail?.trim() :
            !!c.assigneeId?.trim();
        this.node().configured = hasTitle && hasOptions && hasAssignee;
    }

    private updateNodeOutputs(): void {
        const node = this.node();
        node.outputs = this.options.map(opt => ({ name: opt.label }));
    }
}

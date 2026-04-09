import { Component, effect, EventEmitter, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { ApprovalConfig, ApprovalOption, GFlowNode, NotificationChannel } from '../core/gflow.types';

const CHANNEL_OPTIONS: { label: string; value: NotificationChannel; icon: string }[] = [
    { label: 'Application', value: 'inapp', icon: 'fa-regular fa-bell' },
    { label: 'Email',       value: 'email', icon: 'fa-regular fa-envelope' },
];

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
                <label class="notify-toggle" (click)="toggleNotify()">
                    <span class="notify-checkbox" [class.is-checked]="notifyEnabled">
                        @if (notifyEnabled) { <i class="fa-solid fa-check"></i> }
                    </span>
                    <span>Envoyer une notification</span>
                </label>
                @if (notifyEnabled) {
                    <div class="channel-toggle">
                        @for (ch of channelOptions; track ch.value) {
                            <button class="channel-btn" [class.is-active]="isChannelActive(ch.value)"
                                type="button" (click)="toggleChannel(ch.value)">
                                <i [class]="ch.icon"></i>
                                <span>{{ ch.label }}</span>
                            </button>
                        }
                    </div>
                }
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
        .config-hint { font-size: .6875rem; color: var(--p-text-muted-color); }
        .notify-toggle {
            display: flex; align-items: center; gap: .5rem;
            cursor: pointer; user-select: none;
            font-size: .8125rem; font-weight: 500; color: var(--p-text-color);
        }
        .notify-checkbox {
            width: 1rem; height: 1rem; flex-shrink: 0;
            border: 1.5px solid var(--surface-border); border-radius: .25rem;
            background: var(--background-color-0);
            display: flex; align-items: center; justify-content: center;
            font-size: .625rem; color: var(--p-primary-color);
            transition: border-color .15s, background .15s;
            &.is-checked {
                border-color: var(--p-primary-color);
                background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
            }
        }
        .channel-toggle { display: flex; gap: .5rem; margin-top: .375rem; }
        .channel-btn {
            flex: 1;
            display: flex; align-items: center; justify-content: center; gap: .375rem;
            padding: .5rem .75rem;
            border: 1px solid var(--surface-border); border-radius: .375rem;
            background: var(--background-color-0); color: var(--p-text-muted-color);
            font-size: .8125rem; font-weight: 500; cursor: pointer; transition: all .15s ease;
            i { font-size: .875rem; }
            &:hover { background: var(--background-color-100); color: var(--p-text-color); }
            &.is-active {
                background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
                border-color: color-mix(in srgb, var(--p-primary-color) 40%, transparent);
                color: var(--p-primary-color); font-weight: 600;
            }
        }
    `]
})
export class ConfigApprovalComponent {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    readonly channelOptions = CHANNEL_OPTIONS;

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

    get notifyEnabled(): boolean {
        return this.config.notifyChannels !== null && this.config.notifyChannels !== undefined
            ? this.config.notifyChannels.length > 0
            : true; // actif par défaut
    }

    toggleNotify(): void {
        if (this.notifyEnabled) {
            this.config.notifyChannels = [];
        } else {
            this.config.notifyChannels = ['inapp'];
        }
        this.configChange.emit();
    }

    isChannelActive(ch: NotificationChannel): boolean {
        return (this.config.notifyChannels ?? ['inapp']).includes(ch);
    }

    toggleChannel(ch: NotificationChannel): void {
        const current = this.config.notifyChannels ?? ['inapp'];
        const idx = current.indexOf(ch);
        if (idx === -1) {
            this.config.notifyChannels = [...current, ch];
        } else if (current.length > 1) {
            this.config.notifyChannels = current.filter(c => c !== ch);
        }
        this.configChange.emit();
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

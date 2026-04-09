import { Component, EventEmitter, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { GFlowNode, NotificationChannel, NotificationConfig, NotificationTarget, NotificationTargetType } from '../core/gflow.types';

interface SelectOption { label: string; value: string; }

const CHANNEL_OPTIONS: { label: string; value: NotificationChannel; icon: string }[] = [
    { label: 'Application', value: 'inapp', icon: 'fa-regular fa-bell' },
    { label: 'Email',       value: 'email', icon: 'fa-regular fa-envelope' },
];

type FieldKind = 'id' | 'id-or-email' | null;

function targetFieldKind(type: NotificationTargetType): FieldKind {
    if (type === 'user')                          return 'id-or-email';
    if (type === 'team' || type === 'organization') return 'id';
    return null; // executor
}

@Component({
    selector: 'app-config-notification',
    imports: [FormsModule, InputTextModule, Textarea, SelectModule, ButtonModule],
    template: `
        <div class="config-fields">

            <div class="config-field">
                <label class="config-label">Titre</label>
                <input pInputText [(ngModel)]="title"
                    placeholder="Ex : Fichier traité : {{ '{' }}{{ '{' }}fileName{{ '}' }}{{ '}' }}"
                    pSize="small" (ngModelChange)="onChange()" />
            </div>

            <div class="config-field">
                <label class="config-label">Message</label>
                <textarea pTextarea pSize="small" [(ngModel)]="message"
                    placeholder="Ex : Résultat : {{ '{' }}{{ '{' }}classificationResult.mappedClass{{ '}' }}{{ '}' }}"
                    [rows]="3" (ngModelChange)="onChange()"></textarea>
                <small class="config-hint">
                    Les variables <code>{{ '{' }}{{ '{' }}variable{{ '}' }}{{ '}' }}</code> sont remplacées par les données du contexte.
                </small>
            </div>

            <div class="config-field">
                <label class="config-label">Canaux d'envoi</label>
                <div class="channel-toggle">
                    @for (ch of channelOptions; track ch.value) {
                        <button class="channel-btn" [class.is-active]="isChannelActive(ch.value)"
                            type="button" (click)="toggleChannel(ch.value)">
                            <i [class]="ch.icon"></i>
                            <span>{{ ch.label }}</span>
                        </button>
                    }
                </div>
                <small class="config-hint">Par défaut : application uniquement.</small>
            </div>

            <div class="config-field">
                <label class="config-label">Destinataires</label>
                <div class="targets-list">
                    @for (target of targets; track $index) {
                        <div class="target-item">
                            <p-select
                                [options]="targetTypeOptions"
                                [(ngModel)]="target.type"
                                optionLabel="label"
                                optionValue="value"
                                size="small"
                                class="target-type"
                                appendTo="body"
                                (onChange)="onTargetTypeChange(target); onChange()" />

                            @if (fieldKind(target.type) === 'id') {
                                <input pInputText [(ngModel)]="target.id"
                                    placeholder="ID" pSize="small" class="target-extra"
                                    (ngModelChange)="onChange()" />
                            }
                            @if (fieldKind(target.type) === 'id-or-email') {
                                @if (!target.email) {
                                    <input pInputText [(ngModel)]="target.id"
                                        placeholder="ID" pSize="small" class="target-extra"
                                        (ngModelChange)="onChange()" />
                                }
                                @if (!target.id) {
                                    <input pInputText [(ngModel)]="target.email"
                                        placeholder="Email" pSize="small" class="target-extra"
                                        (ngModelChange)="onChange()" />
                                }
                            }

                            <p-button icon="fa-regular fa-trash" severity="danger" text size="small"
                                [disabled]="targets.length <= 1"
                                (onClick)="removeTarget($index)" />
                        </div>
                    }
                </div>
                <p-button label="Ajouter un destinataire" icon="fa-regular fa-plus"
                    size="small" text (onClick)="addTarget()" />
                <small class="config-hint">Par défaut : le déclencheur du flow est notifié.</small>
            </div>
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .config-hint { font-size: .6875rem; color: var(--p-text-muted-color); }

        .channel-toggle { display: flex; gap: .5rem; }

        .channel-btn {
            flex: 1;
            display: flex; align-items: center; justify-content: center; gap: .375rem;
            padding: .5rem .75rem;
            border: 1px solid var(--surface-border);
            border-radius: .375rem;
            background: var(--background-color-0);
            color: var(--p-text-muted-color);
            font-size: .8125rem; font-weight: 500;
            cursor: pointer; transition: all .15s ease;
            i { font-size: .875rem; }
            &:hover { background: var(--background-color-100); color: var(--p-text-color); }
            &.is-active {
                background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
                border-color: color-mix(in srgb, var(--p-primary-color) 40%, transparent);
                color: var(--p-primary-color); font-weight: 600;
            }
        }

        .targets-list { display: flex; flex-direction: column; gap: .5rem; }
        .target-item { display: flex; align-items: center; gap: .5rem; }
        .target-type { width: 150px; flex-shrink: 0; }
        .target-extra { flex: 1; min-width: 0; }

    `]
})
export class ConfigNotificationComponent {
    node = input.required<GFlowNode>();
    @Output() configChange = new EventEmitter<void>();

    readonly channelOptions = CHANNEL_OPTIONS;
    readonly fieldKind = targetFieldKind;

    targetTypeOptions: SelectOption[] = [
        { label: 'Exécutant du flow', value: 'executor' },
        { label: 'Utilisateur',       value: 'user' },
        { label: 'Équipe',            value: 'team' },
        { label: 'Organisation',      value: 'organization' },
    ];

    get config(): NotificationConfig { return this.node().config as NotificationConfig; }

    get title(): string { return this.config.title || ''; }
    set title(v: string) { this.config.title = v; }

    get message(): string { return this.config.message || ''; }
    set message(v: string) { this.config.message = v; }

    get channels(): NotificationChannel[] {
        return this.config.channels ?? ['inapp'];
    }

    get targets(): NotificationTarget[] {
        if (!this.config.targets || this.config.targets.length === 0) {
            this.config.targets = [{ type: 'executor' }];
        }
        return this.config.targets;
    }

    isChannelActive(ch: NotificationChannel): boolean {
        return this.channels.includes(ch);
    }

    toggleChannel(ch: NotificationChannel): void {
        const current = this.config.channels ?? ['inapp'];
        const idx = current.indexOf(ch);
        if (idx === -1) {
            this.config.channels = [...current, ch];
        } else if (current.length > 1) {
            this.config.channels = current.filter(c => c !== ch);
        }
        this.configChange.emit();
    }

    onTargetTypeChange(target: NotificationTarget): void {
        delete target.id;
        delete target.email;
    }

onChange(): void { this.configChange.emit(); }

    addTarget(): void {
        this.targets.push({ type: 'executor' });
        this.configChange.emit();
    }

    removeTarget(index: number): void {
        if (this.targets.length > 1) {
            this.targets.splice(index, 1);
            this.configChange.emit();
        }
    }
}

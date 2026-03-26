import { Component, EventEmitter, input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { GFlowNode, NotificationConfig, NotificationTarget } from '../core/gflow.types';

interface SelectOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-config-notification',
    imports: [FormsModule, InputTextModule, Textarea, SelectModule, ButtonModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Titre</label>
                <input pInputText [(ngModel)]="title" placeholder="Titre de la notification" pSize="small" (ngModelChange)="onChange()" />
            </div>

            <div class="config-field">
                <label class="config-label">Message</label>
                <textarea pTextarea pSize="small" [(ngModel)]="message" placeholder="Contenu de la notification..." [rows]="3" (ngModelChange)="onChange()"></textarea>
            </div>

            <div class="config-field">
                <label class="config-label">Canal</label>
                <p-select [options]="channelOptions" [(ngModel)]="channel" optionLabel="label" optionValue="value" size="small" appendTo="body" (onChange)="onChange()" />
            </div>

            <div class="config-field">
                <label class="config-label">Priorité</label>
                <p-select [options]="priorityOptions" [(ngModel)]="priority" optionLabel="label" optionValue="value" size="small" appendTo="body" (onChange)="onChange()" />
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
                                placeholder="Type"
                                size="small"
                                class="target-type"
                                appendTo="body"
                                (onChange)="onChange()" />
                            @if (target.type !== 'executor') {
                                <input pInputText
                                    [(ngModel)]="target.name"
                                    [placeholder]="target.type === 'user' ? 'Email' : 'Nom'"
                                    pSize="small"
                                    class="target-name"
                                    (ngModelChange)="onChange()" />
                            }
                            <p-button
                                icon="fa-jelly-fill fa-solid fa-trash"
                                severity="danger"
                                text
                                size="small"
                                [disabled]="targets.length <= 1"
                                (onClick)="removeTarget($index)" />
                        </div>
                    }
                </div>
                <p-button
                    label="Ajouter un destinataire"
                    icon="fa-solid fa-plus"
                    size="small"
                    text
                    (onClick)="addTarget()" />
            </div>

            <div class="config-field">
                <label class="config-label">Action (optionnel)</label>
                <div class="action-fields">
                    <input pInputText [(ngModel)]="actionLabel" placeholder="Texte du bouton" pSize="small" (ngModelChange)="onChange()" />
                    <input pInputText [(ngModel)]="actionUrl" placeholder="URL de redirection" pSize="small" (ngModelChange)="onChange()" />
                </div>
                <small class="config-hint">Ajoute un bouton cliquable à la notification</small>
            </div>
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .config-hint { font-size: .6875rem; color: var(--p-text-muted-color); }
        .targets-list { display: flex; flex-direction: column; gap: .5rem; }
        .target-item { display: flex; align-items: center; gap: .5rem; }
        .target-type { width: 140px; }
        .target-name { flex: 1; }
        .action-fields { display: flex; flex-direction: column; gap: .5rem; }
    `]
})
export class ConfigNotificationComponent {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    channelOptions: SelectOption[] = [
        { label: 'Application', value: 'app' },
        { label: 'Email', value: 'email' },
        { label: 'SMS', value: 'sms' }
    ];

    priorityOptions: SelectOption[] = [
        { label: 'Basse', value: 'low' },
        { label: 'Normale', value: 'normal' },
        { label: 'Haute', value: 'high' },
        { label: 'Urgente', value: 'urgent' }
    ];

    targetTypeOptions: SelectOption[] = [
        { label: 'Exécutant du flow', value: 'executor' },
        { label: 'Utilisateur', value: 'user' },
        { label: 'Équipe', value: 'team' },
        { label: 'Organisation', value: 'organization' },
        { label: 'Rôle', value: 'role' },
    ];

    get config(): NotificationConfig { return this.node().config as NotificationConfig; }

    get title(): string { return this.config.title || ''; }
    set title(value: string) { this.config.title = value; }

    get message(): string { return this.config.message || ''; }
    set message(value: string) { this.config.message = value; }

    get channel(): string { return this.config.channel || 'app'; }
    set channel(value: string) { this.config.channel = value as NotificationConfig['channel']; }

    get priority(): string { return this.config.priority || 'normal'; }
    set priority(value: string) { this.config.priority = value as NotificationConfig['priority']; }

    get targets(): NotificationTarget[] {
        if (!this.config.targets || this.config.targets.length === 0) {
            this.config.targets = [{ type: 'executor', id: '', name: '' }];
        }
        return this.config.targets;
    }

    get actionUrl(): string { return this.config.actionUrl || ''; }
    set actionUrl(value: string) { this.config.actionUrl = value; }

    get actionLabel(): string { return this.config.actionLabel || ''; }
    set actionLabel(value: string) { this.config.actionLabel = value; }

    onChange(): void { this.configChange.emit(); }

    addTarget(): void {
        this.targets.push({ type: 'executor', id: '', name: '' });
        this.configChange.emit();
    }

    removeTarget(index: number): void {
        if (this.targets.length > 1) {
            this.targets.splice(index, 1);
            this.configChange.emit();
        }
    }
}

import { Component, EventEmitter, inject, input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { forkJoin, of, catchError } from 'rxjs';
import { ContainerConfig, GFlowNode } from '../core/gflow.types';
import { AgentService } from '../../../../core/services/agent.service';
import { ContextSwitcherService } from '../../../../core/layout/context-switcher/context-switcher.service';

interface AgentOption {
    id: string;
    name: string;
    description: string;
    version: string;
    source: 'own' | 'shared';
}

interface AgentGroup {
    label: string;
    source: 'own' | 'shared';
    items: AgentOption[];
}

@Component({
    selector: 'app-config-container',
    imports: [FormsModule, SelectModule, ButtonModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Agents (exécution parallèle)</label>
                <div class="agents-list">
                    @for (agent of config.agents; track $index) {
                        <div class="agent-item">
                            <div class="agent-item__info">
                                <span class="agent-item__name">{{ agent.agentName }}</span>
                                <span class="agent-item__version">{{ agent.version }}</span>
                            </div>
                            <p-button icon="fa-solid fa-xmark" severity="secondary" text size="small" (onClick)="removeAgent($index)" />
                        </div>
                    }
                </div>

                <p-select
                    [options]="availableGroups"
                    [group]="true"
                    optionLabel="name"
                    optionGroupLabel="label"
                    optionGroupChildren="items"
                    [(ngModel)]="selectedAgent"
                    placeholder="Ajouter un agent..."
                    [filter]="true"
                    filterBy="name,description"
                    filterPlaceholder="Rechercher..."
                    size="small"
                    appendTo="body"
                    [loading]="loading"
                    (onChange)="addAgent()"
                >
                    <ng-template let-group pTemplate="group">
                        <div class="agent-group">
                            <i class="fa-regular" [class.fa-building]="group.source === 'own'" [class.fa-share-nodes]="group.source === 'shared'"></i>
                            <span>{{ group.label }}</span>
                            <span class="agent-group__count">{{ group.items.length }}</span>
                        </div>
                    </ng-template>
                    <ng-template let-agent pTemplate="item">
                        <div class="agent-opt">
                            <span class="agent-opt__name">{{ agent.name }}</span>
                            @if (agent.description) {
                                <span class="agent-opt__desc">{{ agent.description }}</span>
                            }
                        </div>
                    </ng-template>
                    <ng-template pTemplate="selectedItem">
                        <span class="select-placeholder">Ajouter un agent...</span>
                    </ng-template>
                </p-select>
            </div>

            @if (config.agents.length === 0) {
                <div class="config-hint">Ajoutez des agents au conteneur. Ils s'exécuteront en parallèle.</div>
            }
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .5rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .agents-list { display: flex; flex-direction: column; gap: .375rem; }
        .agent-item { display: flex; align-items: center; justify-content: space-between; gap: .5rem; background-color: var(--background-color-100); padding: .5rem .75rem; border-radius: .5rem; }
        .agent-item__info { display: flex; align-items: center; gap: .5rem; min-width: 0; }
        .agent-item__name { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .agent-item__version { background-color: var(--background-color-200); color: var(--p-text-muted-color); padding: 2px 6px; border-radius: 40px; font-size: .625rem; font-weight: 500; white-space: nowrap; }
        .config-hint { font-size: .75rem; color: var(--p-text-muted-color); line-height: 1.4; }
        .select-placeholder { color: var(--p-text-muted-color); font-size: .8125rem; }
        .agent-group {
            display: flex;
            align-items: center;
            gap: .5rem;
            font-size: .6875rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: .04em;
            color: var(--p-text-muted-color);
            i { font-size: .75rem; }
        }
        .agent-group__count {
            margin-left: auto;
            font-weight: 500;
            color: var(--p-text-muted-color);
            background: var(--background-color-100, var(--p-content-hover-background));
            padding: .05rem .375rem;
            border-radius: 999px;
        }
        .agent-opt { display: flex; flex-direction: column; gap: .125rem; min-width: 0; }
        .agent-opt__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
        .agent-opt__desc { font-size: .6875rem; color: var(--p-text-muted-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    `]
})
export class ConfigContainerComponent implements OnInit {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    private readonly agentService = inject(AgentService);
    private readonly contextSwitcher = inject(ContextSwitcherService);

    allAgents: AgentOption[] = [];
    availableGroups: AgentGroup[] = [];
    selectedAgent: AgentOption | null = null;
    loading = false;

    get config(): ContainerConfig { return this.node().config as ContainerConfig; }

    ngOnInit(): void { this.loadAgents(); }

    addAgent(): void {
        if (!this.selectedAgent) return;
        this.config.agents.push({
            agentId: this.selectedAgent.id,
            agentName: this.selectedAgent.name,
            version: this.selectedAgent.version,
        });
        this.selectedAgent = null;
        this.node().configured = this.config.agents.length > 0;
        this.refreshAvailableGroups();
        this.configChange.emit();
    }

    removeAgent(index: number): void {
        this.config.agents.splice(index, 1);
        this.node().configured = this.config.agents.length > 0;
        this.refreshAvailableGroups();
        this.configChange.emit();
    }

    private loadAgents(): void {
        const orgId = this.contextSwitcher.selectedId();
        if (!orgId) return;

        this.loading = true;

        forkJoin({
            own: this.agentService
                .getAgents(orgId, { page: 1, pageSize: 100 })
                .pipe(catchError(() => of({ items: [], total: 0, totalPages: 0 }))),
            shared: this.agentService
                .getSharedAgents(orgId)
                .pipe(catchError(() => of({ items: [], total: 0, totalPages: 0 }))),
        }).subscribe(({ own, shared }) => {
            const byName = (a: AgentOption, b: AgentOption) => a.name.localeCompare(b.name);

            this.allAgents = [
                ...own.items.map<AgentOption>((a) => ({
                    id: a.id,
                    name: a.name,
                    description: a.description ?? '',
                    version: a.activeVersionId ?? '',
                    source: 'own',
                })).sort(byName),
                ...shared.items.map<AgentOption>((a) => ({
                    id: a.id,
                    name: a.name,
                    description: a.description ?? '',
                    version: a.activeVersionId ?? '',
                    source: 'shared',
                })).sort(byName),
            ];

            this.refreshAvailableGroups();
            this.loading = false;
        });
    }

    private refreshAvailableGroups(): void {
        const usedIds = new Set(this.config.agents.map((a) => a.agentId));
        const available = this.allAgents.filter((a) => !usedIds.has(a.id));

        const own = available.filter((a) => a.source === 'own');
        const shared = available.filter((a) => a.source === 'shared');

        const groups: AgentGroup[] = [];
        if (own.length > 0) groups.push({ label: 'Mon organisation', source: 'own', items: own });
        if (shared.length > 0) groups.push({ label: 'Partagés avec mon organisation', source: 'shared', items: shared });
        this.availableGroups = groups;
    }
}

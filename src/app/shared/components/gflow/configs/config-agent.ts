import { Component, EventEmitter, inject, input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { forkJoin, of, catchError } from 'rxjs';
import { AgentConfig, GFlowNode, JsonValue } from '../core/gflow.types';
import { AgentService, ApiAgentVersion } from '../../../../core/services/agent.service';
import { ContextSwitcherService } from '../../../../core/layout/context-switcher/context-switcher.service';
import { GflowStateService } from '../services/gflow-state.service';

interface AgentOption {
    id: string;
    name: string;
    description: string;
    version: string;
    source: 'own' | 'shared';
    schemaData: Record<string, unknown> | null;
}

interface AgentGroup {
    label: string;
    source: 'own' | 'shared';
    items: AgentOption[];
}

interface VersionOption {
    label: string;
    value: string; // '' = dernière version
}

@Component({
    selector: 'app-config-agent',
    imports: [FormsModule, SelectModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Agent</label>
                <p-select
                    [options]="agentGroups"
                    [group]="true"
                    optionLabel="name"
                    optionGroupLabel="label"
                    optionGroupChildren="items"
                    [(ngModel)]="selectedAgent"
                    placeholder="Sélectionner un agent"
                    [filter]="true"
                    filterBy="name,description"
                    filterPlaceholder="Rechercher..."
                    size="small"
                    appendTo="body"
                    [loading]="loading"
                    (onChange)="onAgentChange()">
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
                    <ng-template let-agent pTemplate="selectedItem">
                        @if (agent) {
                            <div class="agent-opt">
                                <span class="agent-opt__name">{{ agent.name }}</span>
                                @if (agent.source === 'shared') {
                                    <span class="agent-opt__tag">Partagé</span>
                                }
                            </div>
                        }
                    </ng-template>
                </p-select>
            </div>

            @if (selectedAgent) {
                <div class="config-field">
                    <label class="config-label">Version</label>
                    <p-select
                        [options]="versionOptions"
                        optionLabel="label"
                        optionValue="value"
                        [(ngModel)]="selectedVersionId"
                        size="small"
                        appendTo="body"
                        [loading]="loadingVersions"
                        (onChange)="onVersionChange()"
                    />
                </div>

                <div class="agent-info">
                    @if (selectedAgent.description) {
                        <div class="agent-info__row">
                            <span class="agent-info__label">Description:</span>
                            <span class="agent-info__value">{{ selectedAgent.description }}</span>
                        </div>
                    }
                    <div class="agent-info__row">
                        <span class="agent-info__label">Origine:</span>
                        <span class="agent-info__value">{{ selectedAgent.source === 'own' ? 'Mon organisation' : 'Partagé' }}</span>
                    </div>
                </div>
            }
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .agent-info { background-color: var(--background-color-100); padding: .75rem; border-radius: .5rem; display: flex; flex-direction: column; gap: .375rem; }
        .agent-info__row { display: flex; align-items: flex-start; gap: .5rem; font-size: .75rem; }
        .agent-info__label { color: var(--p-text-muted-color); min-width: 80px; flex-shrink: 0; }
        .agent-info__value { color: var(--p-text-color); font-weight: 500; word-break: break-word; }
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
        .agent-opt__desc {
            font-size: .6875rem;
            color: var(--p-text-muted-color);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .agent-opt__tag {
            font-size: .625rem;
            font-weight: 600;
            padding: .1rem .375rem;
            border-radius: 999px;
            background: var(--primary-color-100, color-mix(in srgb, var(--p-primary-color) 15%, transparent));
            color: var(--primary-color-700, var(--p-primary-color));
            text-transform: uppercase;
            letter-spacing: .02em;
            flex-shrink: 0;
        }
    `]
})
export class ConfigAgentComponent implements OnInit {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    private readonly agentService = inject(AgentService);
    private readonly contextSwitcher = inject(ContextSwitcherService);
    private readonly state = inject(GflowStateService);

    agentGroups: AgentGroup[] = [];
    selectedAgent: AgentOption | null = null;
    loading = false;

    versionOptions: VersionOption[] = [];
    selectedVersionId = '';
    loadingVersions = false;

    get config(): AgentConfig { return this.node().config as AgentConfig; }

    ngOnInit(): void { this.loadAgents(); }

    onAgentChange(): void {
        const agent = this.selectedAgent;
        if (!agent) {
            this.versionOptions = [];
            this.selectedVersionId = '';
            this.configChange.emit();
            return;
        }

        this.config.agentId = agent.id;
        this.config.agentName = agent.name;
        this.config.version = '';
        this.selectedVersionId = '';
        this.node().name = agent.name;

        this.applyOutputMap(agent);
        this.configChange.emit();

        this.loadVersions(agent.id);

        if (agent.schemaData === null) {
            this.fetchAndApplySchema(agent, true);
        }
    }

    onVersionChange(): void {
        this.config.version = this.selectedVersionId;
        this.configChange.emit();
    }

    private loadVersions(agentId: string): void {
        const orgId = this.contextSwitcher.selectedId();
        if (!orgId) return;

        this.loadingVersions = true;
        this.agentService.getAgentVersions(orgId, agentId)
            .pipe(catchError(() => of([] as ApiAgentVersion[])))
            .subscribe((versions) => {
                this.versionOptions = [
                    { label: 'Dernière version (automatique)', value: '' },
                    ...versions
                        .sort((a, b) => b.version_number - a.version_number)
                        .map((v, i, arr) => ({ label: `v${v.version_number ?? (arr.length - i)}`, value: v.id })),
                ];
                this.loadingVersions = false;
            });
    }

    private fetchAndApplySchema(agent: AgentOption, emit: boolean): void {
        const orgId = this.contextSwitcher.selectedId();
        if (!orgId) return;

        this.agentService.getAgent(orgId, agent.id).pipe(
            catchError(() => of(null)),
        ).subscribe((full) => {
            if (!full?.schemaData) return;
            agent.schemaData = full.schemaData as Record<string, unknown>;
            if (this.selectedAgent?.id !== agent.id) return;

            this.applyOutputMap(agent);
            if (emit) {
                this.configChange.emit();
            } else {
                this.state.recomputeDownstreamFrom(this.node().id);
            }
        });
    }

    private applyOutputMap(agent: AgentOption): void {
        const node = this.node();
        const cleaned = this.simplifySchema(agent.schemaData ?? {});

        const outputMap: JsonValue = {
            agentResults: [
                {
                    agentId: agent.id,
                    agentName: agent.name,
                    fields: cleaned,
                },
            ],
        };

        if (!node.outputs || node.outputs.length === 0) {
            node.outputs = [{ name: undefined, map: outputMap }];
        } else {
            node.outputs[0] = { ...node.outputs[0], map: outputMap };
        }
    }

    private simplifySchema(value: unknown): JsonValue {
        if (Array.isArray(value)) {
            return value.map((v) => this.simplifySchema(v));
        }

        if (value !== null && typeof value === 'object') {
            const obj = value as Record<string, unknown>;
            const isList = obj['_list'] === true;

            const children: Record<string, JsonValue> = {};
            let hasChildren = false;
            for (const [k, v] of Object.entries(obj)) {
                if (k.startsWith('_')) continue;
                children[k] = this.simplifySchema(v);
                hasChildren = true;
            }

            if (!hasChildren) {
                const type = obj['_type'];
                if (typeof type === 'string') return type;
                if (typeof type === 'number' || typeof type === 'boolean' || type === null) return type;
                return null;
            }

            return isList ? [children] : children;
        }

        return (value ?? null) as JsonValue;
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

            const ownOptions: AgentOption[] = own.items
                .map<AgentOption>((a) => ({
                    id: a.id,
                    name: a.name,
                    description: a.description ?? '',
                    version: a.activeVersionId ?? '',
                    source: 'own',
                    schemaData: (a.schemaData as Record<string, unknown> | null) ?? null,
                }))
                .sort(byName);

            const sharedOptions: AgentOption[] = shared.items
                .map<AgentOption>((a) => ({
                    id: a.id,
                    name: a.name,
                    description: a.description ?? '',
                    version: a.activeVersionId ?? '',
                    source: 'shared',
                    schemaData: (a.schemaData as Record<string, unknown> | null) ?? null,
                }))
                .sort(byName);

            const groups: AgentGroup[] = [];
            if (ownOptions.length > 0) groups.push({ label: 'Mon organisation', source: 'own', items: ownOptions });
            if (sharedOptions.length > 0) groups.push({ label: 'Partagés avec mon organisation', source: 'shared', items: sharedOptions });
            this.agentGroups = groups;

            if (this.config.agentId) {
                const all = [...ownOptions, ...sharedOptions];
                this.selectedAgent = all.find((a) => a.id === this.config.agentId) ?? null;
                this.selectedVersionId = this.config.version ?? '';

                if (this.selectedAgent) {
                    this.loadVersions(this.config.agentId);

                    if (this.selectedAgent.schemaData !== null) {
                        this.applyOutputMap(this.selectedAgent);
                        this.state.recomputeDownstreamFrom(this.node().id);
                    } else {
                        this.fetchAndApplySchema(this.selectedAgent, false);
                    }
                }
            }

            this.loading = false;
        });
    }
}

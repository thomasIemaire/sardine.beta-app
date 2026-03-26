import { Component, EventEmitter, inject, input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ContainerConfig, GFlowNode } from '../core/gflow.types';
import { AgentsService, UserService } from '../core/gflow-stubs';

interface AgentOption {
    id: string;
    name: string;
    version: string;
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
                @if (availableToAdd.length > 0) {
                    <div class="add-agent-row">
                        <p-select [options]="availableToAdd" [(ngModel)]="selectedAgent" optionLabel="name" placeholder="Ajouter un agent..." size="small" appendTo="body" styleClass="add-agent-select" />
                        <p-button icon="fa-solid fa-plus" size="small" [disabled]="!selectedAgent" (onClick)="addAgent()" />
                    </div>
                }
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
        .add-agent-row { display: flex; align-items: center; gap: .5rem; }
        .add-agent-row :first-child { flex: 1; }
        .config-hint { font-size: .75rem; color: var(--p-text-muted-color); line-height: 1.4; }
    `]
})
export class ConfigContainerComponent implements OnInit {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    private agentsService = inject(AgentsService);
    private userService = inject(UserService);

    allAgents: AgentOption[] = [];
    selectedAgent: AgentOption | null = null;
    availableToAdd: AgentOption[] = [];

    ngOnInit(): void { this.loadAgents(); }

    get config(): ContainerConfig { return this.node().config as ContainerConfig; }

    addAgent(): void {
        if (!this.selectedAgent) return;
        this.config.agents.push({ agentId: this.selectedAgent.id, agentName: this.selectedAgent.name, version: this.selectedAgent.version });
        this.selectedAgent = null;
        this.node().configured = this.config.agents.length > 0;
        this.refreshAvailable();
        this.configChange.emit();
    }

    removeAgent(index: number): void {
        this.config.agents.splice(index, 1);
        this.node().configured = this.config.agents.length > 0;
        this.refreshAvailable();
        this.configChange.emit();
    }

    private loadAgents(): void {
        const orgId = this.userService.getCurrentOrgId();
        if (!orgId) return;
        this.agentsService.list(orgId).subscribe(agents => {
            this.allAgents = agents.map(a => ({ id: a.id, name: a.name, version: a.version }));
            this.refreshAvailable();
        });
    }

    private refreshAvailable(): void {
        const usedIds = new Set(this.config.agents.map(a => a.agentId));
        this.availableToAdd = this.allAgents.filter(a => !usedIds.has(a.id));
    }
}

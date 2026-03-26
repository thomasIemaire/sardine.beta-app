import { Component, EventEmitter, inject, input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { AgentConfig, GFlowNode } from '../core/gflow.types';
import { AgentsService, UserService } from '../core/gflow-stubs';

interface AgentOption {
    id: string;
    name: string;
    version: string;
    reference: string;
}

@Component({
    selector: 'app-config-agent',
    imports: [FormsModule, SelectModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Agent</label>
                <p-select
                    [options]="availableAgents"
                    [(ngModel)]="selectedAgent"
                    optionLabel="name"
                    placeholder="Sélectionner un agent"
                    [filter]="true"
                    filterPlaceholder="Rechercher..."
                    size="small"
                    appendTo="body"
                    (onChange)="onAgentChange()" />
            </div>

            @if (selectedAgent) {
                <div class="agent-info">
                    <div class="agent-info__row">
                        <span class="agent-info__label">Référence:</span>
                        <span class="agent-info__value">{{ selectedAgent.reference }}</span>
                    </div>
                    <div class="agent-info__row">
                        <span class="agent-info__label">Version:</span>
                        <span class="agent-info__value">{{ selectedAgent.version }}</span>
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
        .agent-info__row { display: flex; align-items: center; gap: .5rem; font-size: .75rem; }
        .agent-info__label { color: var(--p-text-muted-color); min-width: 70px; }
        .agent-info__value { color: var(--p-text-color); font-weight: 500; }
    `]
})
export class ConfigAgentComponent implements OnInit {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    private agentsService = inject(AgentsService);
    private userService = inject(UserService);

    availableAgents: AgentOption[] = [];
    selectedAgent: AgentOption | null = null;

    get config(): AgentConfig { return this.node().config as AgentConfig; }

    ngOnInit(): void { this.loadAgents(); }

    onAgentChange(): void {
        if (this.selectedAgent) {
            this.config.agentId = this.selectedAgent.id;
            this.config.agentName = this.selectedAgent.name;
            this.config.version = this.selectedAgent.version;
            this.node().name = this.selectedAgent.name;
        }
        this.configChange.emit();
    }

    private loadAgents(): void {
        const orgId = this.userService.getCurrentOrgId();
        if (!orgId) return;

        this.agentsService.list(orgId).subscribe(agents => {
            this.availableAgents = agents.map(a => ({
                id: a.id,
                name: a.name,
                version: a.version,
                reference: a.reference,
            }));

            if (this.config.agentId) {
                this.selectedAgent = this.availableAgents.find(a => a.id === this.config.agentId) || null;
            }
        });
    }
}

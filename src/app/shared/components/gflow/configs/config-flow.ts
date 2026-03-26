import { Component, EventEmitter, inject, input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { FlowRefConfig, GFlowNode } from '../core/gflow.types';
import { FlowsService, UserService } from '../core/gflow-stubs';

interface FlowOption {
    id: string;
    name: string;
    version: string;
    reference: string | null;
}

@Component({
    selector: 'app-config-flow',
    imports: [FormsModule, SelectModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Flow à appeler</label>
                <p-select [options]="availableFlows" [(ngModel)]="selectedFlow" optionLabel="name" placeholder="Sélectionner un flow" [filter]="true" filterPlaceholder="Rechercher..." size="small" appendTo="body" (onChange)="onFlowChange()" />
            </div>

            @if (selectedFlow) {
                <div class="flow-info">
                    @if (selectedFlow.reference) {
                    <div class="flow-info__row">
                        <span class="flow-info__label">Référence:</span>
                        <span class="flow-info__value">{{ selectedFlow.reference }}</span>
                    </div>
                    }
                    <div class="flow-info__row">
                        <span class="flow-info__label">Version:</span>
                        <span class="flow-info__value">{{ selectedFlow.version }}</span>
                    </div>
                </div>
            }

            <small class="config-hint">Le flow sélectionné sera exécuté comme sous-flow.</small>
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .config-hint { font-size: .6875rem; color: var(--p-text-muted-color); }
        .flow-info { background-color: var(--background-color-100); padding: .75rem; border-radius: .5rem; display: flex; flex-direction: column; gap: .375rem; }
        .flow-info__row { display: flex; align-items: center; gap: .5rem; font-size: .75rem; }
        .flow-info__label { color: var(--p-text-muted-color); min-width: 70px; }
        .flow-info__value { color: var(--p-text-color); font-weight: 500; }
    `]
})
export class ConfigFlowComponent implements OnInit {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<void>();

    private flowsService = inject(FlowsService);
    private userService = inject(UserService);

    availableFlows: FlowOption[] = [];
    selectedFlow: FlowOption | null = null;

    get config(): FlowRefConfig { return this.node().config as FlowRefConfig; }

    ngOnInit(): void { this.loadFlows(); }

    onFlowChange(): void {
        if (this.selectedFlow) {
            this.config.flowId = this.selectedFlow.id;
            this.config.flowName = this.selectedFlow.name;
            this.config.flowVersion = this.selectedFlow.version;
            this.node().name = this.selectedFlow.name;
        }
        this.configChange.emit();
    }

    private loadFlows(): void {
        const orgId = this.userService.getCurrentOrgId();
        if (!orgId) return;

        this.flowsService.list(orgId, { is_template: false }).subscribe(flows => {
            this.availableFlows = flows.map(f => ({ id: f.id, name: f.name, version: f.version, reference: f.reference }));
            if (this.config.flowId) {
                this.selectedFlow = this.availableFlows.find(f => f.id === this.config.flowId) || null;
            }
        });
    }
}

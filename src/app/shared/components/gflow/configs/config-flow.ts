import { Component, EventEmitter, inject, input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { FlowRefConfig, GFlowNode } from '../core/gflow.types';
import { FlowService } from '../../../../core/services/flow.service';
import { ContextSwitcherService } from '../../../../core/layout/context-switcher/context-switcher.service';

interface FlowOption {
    id: string;
    name: string;
}

@Component({
    selector: 'app-config-flow',
    imports: [FormsModule, SelectModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Flow à appeler</label>
                <p-select
                    [options]="availableFlows"
                    [(ngModel)]="selectedFlow"
                    optionLabel="name"
                    placeholder="Sélectionner un flow"
                    [filter]="true"
                    filterPlaceholder="Rechercher..."
                    size="small"
                    appendTo="body"
                    [loading]="loading"
                    (onChange)="onFlowChange()" />
            </div>

            <small class="config-hint">Le flow sélectionné sera exécuté comme sous-flow.</small>
        </div>
    `,
    styles: [`
        .config-fields { display: flex; flex-direction: column; gap: 1rem; }
        .config-field { display: flex; flex-direction: column; gap: .375rem; }
        .config-label { font-size: .8125rem; font-weight: 500; color: var(--p-text-color); }
        .config-hint { font-size: .6875rem; color: var(--p-text-muted-color); }
    `]
})
export class ConfigFlowComponent implements OnInit {
    node = input.required<GFlowNode>();
    @Output() configChange = new EventEmitter<void>();

    private readonly flowService = inject(FlowService);
    private readonly contextSwitcher = inject(ContextSwitcherService);

    availableFlows: FlowOption[] = [];
    selectedFlow: FlowOption | null = null;
    loading = false;

    get config(): FlowRefConfig { return this.node().config as FlowRefConfig; }

    ngOnInit(): void { this.loadFlows(); }

    onFlowChange(): void {
        if (this.selectedFlow) {
            this.config.flowId = this.selectedFlow.id;
            this.config.flowName = this.selectedFlow.name;
            this.node().name = this.selectedFlow.name;
            this.node().configured = true;
        } else {
            this.config.flowId = '';
            this.config.flowName = '';
            this.node().configured = false;
        }
        this.configChange.emit();
    }

    private loadFlows(): void {
        const orgId = this.contextSwitcher.selectedId();
        if (!orgId) return;

        this.loading = true;
        this.flowService.getFlows(orgId, { page: 1, pageSize: 100 }).subscribe({
            next: (page) => {
                this.availableFlows = page.items.map(f => ({ id: f.id, name: f.name }));
                if (this.config.flowId) {
                    this.selectedFlow = this.availableFlows.find(f => f.id === this.config.flowId) ?? null;
                }
                this.loading = false;
            },
            error: () => { this.loading = false; },
        });
    }
}

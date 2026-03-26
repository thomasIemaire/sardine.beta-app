import { Component, EventEmitter, input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { GFlowNode, NodeType } from '../core/gflow.types';
import { PALETTE_GROUPS } from '../core/node-definitions';

@Component({
    selector: 'app-config-new',
    imports: [FormsModule, SelectModule],
    template: `
        <div class="config-fields">
            <div class="config-field">
                <label class="config-label">Type de noeud</label>
                <p-select
                    [options]="nodeTypeOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Choisir un type..."
                    [(ngModel)]="selectedType"
                    (ngModelChange)="onTypeSelected()"
                    size="small"
                    appendTo="body" />
            </div>
            <div class="config-hint">
                Sélectionnez le type de noeud à créer.
            </div>
        </div>
    `,
    styles: [`
        .config-fields {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .config-field {
            display: flex;
            flex-direction: column;
            gap: .375rem;
        }
        .config-label {
            font-size: .8125rem;
            font-weight: 500;
            color: var(--p-text-color);
        }
        .config-hint {
            font-size: .75rem;
            color: var(--p-text-muted-color);
            line-height: 1.4;
        }
    `]
})
export class ConfigNewComponent implements OnInit {
    node = input.required<GFlowNode>();

    @Output() configChange = new EventEmitter<NodeType>();

    nodeTypeOptions: { label: string; value: NodeType }[] = [];
    selectedType: NodeType | null = null;

    ngOnInit(): void {
        this.nodeTypeOptions = PALETTE_GROUPS.flatMap(g =>
            g.items.map(it => ({ label: it.label, value: it.type }))
        );
    }

    onTypeSelected(): void {
        if (this.selectedType) {
            this.configChange.emit(this.selectedType);
        }
    }
}

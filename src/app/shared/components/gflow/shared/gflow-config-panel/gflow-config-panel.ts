import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ConfigBase } from '../config-base/config-base';
import { NodeDataPreviewComponent } from '../node-data-preview/node-data-preview';
import { GFlowLink, GFlowNode, JsonValue } from '../../core/gflow.types';
import { GflowStateService } from '../../services/gflow-state.service';

@Component({
    selector: 'app-gflow-config-panel',
    imports: [CommonModule, ConfigBase, ButtonModule, NodeDataPreviewComponent],
    templateUrl: './gflow-config-panel.html',
    styleUrls: ['./gflow-config-panel.scss'],
})
export class GflowConfigPanelComponent implements OnChanges {
    private state = inject(GflowStateService);

    @Input() node: GFlowNode | null = null;
    @Input() link: GFlowLink | null = null;
    @Input() nodes: GFlowNode[] = [];
    @Input() links: GFlowLink[] = [];

    @Output() cancel = new EventEmitter<void>();
    @Output() save = new EventEmitter<void>();
    @Output() delete = new EventEmitter<void>();
    @Output() configChange = new EventEmitter<unknown>();
    @Output() docNavigate = new EventEmitter<string>();

    componentInputs: Record<string, unknown> | null = null;
    inputMap: JsonValue = {};

    ngOnChanges(changes: SimpleChanges) {
        if (changes['node']) {
            if (this.node) {
                this.inputMap = this.state.aggregatedInputMap(this.node.id);
                if (this.node.configComponent) {
                    this.componentInputs = {
                        node: this.node,
                        inputMap: this.inputMap,
                    };
                } else {
                    this.componentInputs = null;
                }
            } else {
                this.inputMap = {};
                this.componentInputs = null;
            }
        }
    }
}

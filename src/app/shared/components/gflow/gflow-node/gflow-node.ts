import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { marked } from 'marked';
import { AgentConfig, ContainerConfig, DoWhileConfig, EndConfig, FlowRefConfig, ForConfig, GFlowLink, GFlowNode, PortKind, RangerConfig, TextConfig, WhileConfig } from '../core/gflow.types';

@Component({
    selector: 'app-gflow-node',
    imports: [CommonModule],
    templateUrl: './gflow-node.html',
    styleUrls: ['./gflow-node.scss']
})
export class GflowNodeComponent {

    readonly item = input.required<GFlowNode>();
    readonly links = input<GFlowLink[]>([]);
    readonly showAddButton = input<boolean>(false);
    readonly readonly = input<boolean>(false);
    readonly addAgent = output<void>();
    readonly textChange = output<string>();
    readonly deleteNode = output<void>();
    readonly resizeStart = output<MouseEvent>();

    readonly zoneChildCount = input<number>(0);
    readonly zoneDropTarget = input<boolean>(false);

    readonly isNewNode = computed(() => this.item().type === 'new');
    readonly isAgentNode = computed(() => this.item().type === 'agent');
    readonly isEndNode = computed(() => this.item().type === 'end');
    readonly isContainerNode = computed(() => this.item().type === 'container');
    readonly isFlowNode = computed(() => this.item().type === 'flow');
    readonly isRangerNode = computed(() => this.item().type === 'ranger');
    readonly isTextNode = computed(() => this.item().type === 'text');
    readonly isZoneNode = computed(() => this.item().type === 'for' || this.item().type === 'while' || this.item().type === 'do-while');

    readonly zoneTypeLabel = computed(() => {
        const t = this.item().type;
        return t === 'for' || t === 'while' || t === 'do-while' ? 'Boucle' : '';
    });

    readonly hasEntries = computed(() =>
        (this.item().entries?.length ?? 0) > 0
    );

    readonly hasExits = computed(() =>
        (this.item().exits?.length ?? 0) > 0
    );

    readonly hasNamedOutputs = computed(() =>
        this.item().outputs.some(port => !!port.name)
    );

    readonly hasBody = computed(() =>
        this.hasNamedOutputs() || this.item().type === 'container'
    );

    readonly isFocusedOrSelected = computed(() =>
        this.item().focused || this.item().selected
    );

    readonly zoneDescription = computed(() => {
        const node = this.item();
        if (node.type === 'for') {
            return (node.config as ForConfig)?.iterableField || 'Itère sur chaque élément';
        }
        if (node.type === 'while') {
            return (node.config as WhileConfig)?.condition || 'Répète tant que la condition est vraie';
        }
        if (node.type === 'do-while') {
            return (node.config as DoWhileConfig)?.condition || 'Exécute puis répète tant que la condition est vraie';
        }
        return '';
    });

    readonly containerAgents = computed(() =>
        (this.item().config as ContainerConfig)?.agents || []
    );

    readonly agentName = computed(() =>
        (this.item().config as AgentConfig)?.agentName || ''
    );

    readonly agentVersion = computed(() =>
        (this.item().config as AgentConfig)?.version || ''
    );

    readonly endStatus = computed(() =>
        (this.item().config as EndConfig)?.status || ''
    );

    readonly flowName = computed(() =>
        (this.item().config as FlowRefConfig)?.flowName || ''
    );

    readonly flowVersion = computed(() =>
        (this.item().config as FlowRefConfig)?.flowVersion || ''
    );

    readonly rangerPath = computed(() =>
        (this.item().config as RangerConfig)?.folderPath || ''
    );

    readonly textContent = linkedSignal(() => (this.item().config as TextConfig)?.text || '');

    readonly textHtml = computed(() => {
        const text = this.textContent();
        if (!text) return '';
        return marked.parse(text, { async: false }) as string;
    });

    readonly textWidth = computed(() =>
        (this.item().config as TextConfig)?.width || 180
    );

    editing = signal(false);

    onDeleteClick(event: MouseEvent): void {
        event.stopPropagation();
        event.preventDefault();
        if (this.readonly()) return;
        this.deleteNode.emit();
    }

    onResizeHandleDown(event: MouseEvent): void {
        event.stopPropagation();
        event.preventDefault();
        if (this.readonly()) return;
        this.resizeStart.emit(event);
    }

    onAddAgentClick(event: MouseEvent): void {
        event.stopPropagation();
        event.preventDefault();
        if (this.readonly()) return;
        this.addAgent.emit();
    }

    onTextDblClick(event: MouseEvent): void {
        if (this.readonly()) return;
        event.stopPropagation();
        event.preventDefault();
        this.editing.set(true);
        setTimeout(() => {
            const el = (event.target as HTMLElement)
                .closest('.node__container')
                ?.querySelector('.node__text-edit') as HTMLTextAreaElement | null;
            if (el) {
                el.focus();
                el.select();
            }
        });
    }

    onTextBlur(event: FocusEvent): void {
        const text = (event.target as HTMLTextAreaElement).value ?? '';
        (this.item().config as TextConfig).text = text;
        this.textContent.set(text);
        this.editing.set(false);
        this.textChange.emit(text);
    }

    onTextKeydown(event: KeyboardEvent): void {
        event.stopPropagation();
        if (event.key === 'Escape') {
            (event.target as HTMLTextAreaElement).blur();
        }
    }

    /** Precomputed set of connected port keys — rebuilt only when links input changes. */
    private readonly connectedPorts = computed(() => {
        const nodeId = this.item().id;
        const set = new Set<string>();
        for (const link of this.links()) {
            if (link.src.nodeId === nodeId) set.add(`${link.src.kind}:${link.src.portIndex}`);
            if (link.dst.nodeId === nodeId) set.add(`${link.dst.kind}:${link.dst.portIndex}`);
        }
        return set;
    });

    isPortConnected(kind: PortKind, index: number): boolean {
        return this.connectedPorts().has(`${kind}:${index}`);
    }
}

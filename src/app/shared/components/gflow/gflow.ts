import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    DestroyRef,
    ElementRef,
    HostListener,
    OnDestroy,
    OnInit,
    computed,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AutoFocus } from 'primeng/autofocus';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, ConfirmEventType, MenuItem, MessageService } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';

import { GflowNodeComponent } from './gflow-node/gflow-node';
import { GflowConfigPanelComponent } from './shared/gflow-config-panel/gflow-config-panel';
import { ExecPanelComponent } from './exec-panel/exec-panel';
import { PresenceBarComponent, PresenceUser } from './presence-bar/presence-bar';
import { VersionPanelComponent } from './version-panel/version-panel';
import { GflowViewportService } from './services/gflow-viewport.service';
import { GflowStateService } from './services/gflow-state.service';
import { GflowRendererService, PendingLink } from './services/gflow-renderer.service';
import { GflowHistoryService, Snapshot } from './services/gflow-history.service';
import { AgentConfig, ContainerConfig, GFlowLink, GFlowNode, JsonValue, NodeType, PortKind, PortRef, SerializedFlowData, SerializedNode, TextConfig, generateId } from './core/gflow.types';
import { ExecutionNodeLog, PresenceUserResponse } from './core/gflow-stubs';
import { FlowsService, WebSocketService } from './core/gflow-stubs';
import { getNodeWidth, getNodeHeight, NODE_WIDTH, NODE_BASE_HEIGHT, isZoneNode, ZONE_DEFAULT_WIDTH, ZONE_DEFAULT_HEIGHT, ZONE_HEADER_HEIGHT } from './core/node-geometry';
import { PaletteGroup, PaletteItem, PALETTE_GROUPS, NODE_DEFINITION_MAP } from './core/node-definitions';

const SNAP_THRESHOLD_PX = 48;
const CLICK_TO_DRAG_THRESHOLD_PX = 3;

type ToolType = 'select' | 'pan';

interface DragState {
    active: boolean;
    node: GFlowNode | null;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    group: Array<{ node: GFlowNode; x0: number; y0: number }>;
}

interface PanState {
    active: boolean;
    startX: number;
    startY: number;
    moved: boolean;
}

interface SelectionState {
    active: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    style: { left: string; top: string; width: string; height: string };
}

interface SnappedPort {
    element: HTMLElement;
    ref: PortRef;
    center: { x: number; y: number };
}

interface ClipboardData {
    nodes: Array<Omit<GFlowNode, 'focused' | 'selected' | 'configComponent'>>;
    links: Array<Omit<GFlowLink, 'd' | 'mid'>>;
}

export interface FlowSavePayload {
    name: string;
    description: string;
    data: SerializedFlowData;
}

@Component({
    selector: 'app-gflow',
    imports: [
        CommonModule,
        FormsModule,
        GflowNodeComponent,
        GflowConfigPanelComponent,
        ExecPanelComponent,
        PresenceBarComponent,
        VersionPanelComponent,
        ButtonModule,
        InputTextModule,
        ConfirmDialogModule,
        ContextMenu,
        AutoFocus,
    ],
    templateUrl: './gflow.html',
    styleUrls: ['./gflow.scss'],
    providers: [
        GflowViewportService,
        GflowStateService,
        GflowRendererService,
        GflowHistoryService,
        ConfirmationService,
    ],
})
export class GflowComponent implements OnInit, AfterViewInit, OnDestroy {
    // ViewChildren

    private readonly viewportRef = viewChild.required<ElementRef<HTMLElement>>('viewport');
    private readonly titleInputRef = viewChild<ElementRef<HTMLInputElement>>('titleInput');
    private readonly nodeContextMenuRef = viewChild<ContextMenu>('nodeContextMenu');
    // Inputs & Outputs

    readonly navigateBack = input<string | null>(null);
    readonly flowId = input<string | null>(null);
    readonly orgId = input<string | null>(null);
    readonly saveFlow = output<FlowSavePayload>();
    readonly executeFlow = output<void>();
    readonly close = output<void>();
    // State

    readonly flow = signal({
        title: 'Nouveau Flow',
        description: '',
        id: null as string | null,
    });

    readonly isDirty = signal(false);
    readonly paletteOpen = signal(true);
    readonly configOpen = signal(false);
    readonly execPanelOpen = signal(false);
    readonly versionPanelOpen = signal(false);
    readonly presenceUsers = signal<PresenceUser[]>([]);
    readonly initialExecutionId = signal<string | null>(null);
    readonly activeNodeLogs = signal<ExecutionNodeLog[]>([]);
    readonly nodeExecStatusMap = computed(() => {
        const map = new Map<string, ExecutionNodeLog['status']>();
        for (const log of this.activeNodeLogs()) {
            // Garder le statut le plus récent (dernier log par node_id)
            map.set(log.node_id, log.status);
        }
        return map;
    });
    private static readonly PASS_COLORS = [
        '#22c55e', // green  — pass 1
        '#3b82f6', // blue   — pass 2
        '#f59e0b', // amber  — pass 3
        '#a855f7', // purple — pass 4
        '#ef4444', // red    — pass 5
        '#06b6d4', // cyan   — pass 6
    ];

    readonly executedLinkMap = computed(() => {
        const logs = this.activeNodeLogs();
        if (!logs.length) return new Map<string, { pass: number; count: number }>();

        const result = new Map<string, { pass: number; count: number }>();

        // Sort logs chronologically to determine pass order
        const sortedLogs = [...logs].sort((a, b) =>
            new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
        );

        // Count how many times each node has been executed (pass number)
        const nodeExecCount = new Map<string, number>();

        for (const log of sortedLogs) {
            const execNum = (nodeExecCount.get(log.node_id) ?? 0) + 1;
            nodeExecCount.set(log.node_id, execNum);

            if (log.output_port !== null) {
                for (const link of this.links) {
                    if (link.relation === 'io' &&
                        link.src.nodeId === log.node_id &&
                        link.src.portIndex === log.output_port) {
                        const existing = result.get(link.id);
                        result.set(link.id, {
                            pass: execNum,
                            count: (existing?.count ?? 0) + 1,
                        });
                    }
                }
            }
        }

        // Entry-exit links: traversed if both endpoints were executed
        const executedNodeIds = new Set(logs.map(l => l.node_id));
        for (const link of this.links) {
            if (link.relation === 'entry-exit' &&
                executedNodeIds.has(link.src.nodeId) &&
                executedNodeIds.has(link.dst.nodeId) &&
                !result.has(link.id)) {
                const srcPasses = nodeExecCount.get(link.src.nodeId) ?? 1;
                result.set(link.id, { pass: srcPasses, count: srcPasses });
            }
        }

        return result;
    });

    getPassColor(pass: number | undefined): string {
        if (!pass) return '';
        return GflowComponent.PASS_COLORS[(pass - 1) % GflowComponent.PASS_COLORS.length];
    }
    readonly nodeNameMap = computed(() => {
        const map: Record<string, string> = {};
        for (const n of this.nodes) {
            map[n.id] = n.name;
        }
        return map;
    });
    readonly currentTool = signal<ToolType>('pan');
    readonly isEditingTitle = signal(false);

    focusedNode: GFlowNode | null = null;
    focusedLink: GFlowLink | null = null;
    focusedInputMap: JsonValue | null = null;
    nodeContextMenuItems: MenuItem[] = [];

    worldDragging = false;
    selectionFading = false;
    pendingLink: PendingLink | null = null;

    dragState: DragState = this.createBlankDragState();
    panState: PanState = { active: false, moved: false, startX: 0, startY: 0 };
    selectionState: SelectionState = this.createBlankSelectionState();
    // Constants exposed to template

    readonly paletteGroups: PaletteGroup[] = PALETTE_GROUPS;
    readonly paletteWidth = 200;
    // Private state

    private skipNextClick = false;
    private snappedPort: SnappedPort | null = null;
    private shouldCenterOnStart = false;
    private isRestoring = false;
    private clipboard: ClipboardData | null = null;
    dragDropTargetZoneId: string | null = null;
    dragInsertTargetLinkId: string | null = null;
    // Constructor

    private readonly flowsService = inject(FlowsService);
    private readonly wsService = inject(WebSocketService);
    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private readonly cdr: ChangeDetectorRef,
        public readonly viewport: GflowViewportService,
        public readonly state: GflowStateService,
        private readonly renderer: GflowRendererService,
        private readonly history: GflowHistoryService,
        private readonly confirmationService: ConfirmationService,
        private readonly messageService: MessageService,
        private readonly router: Router,
    ) {}
    // Getters for template bindings

    get links(): GFlowLink[] {
        return this.state.links;
    }

    get nodes(): GFlowNode[] {
        return this.state.nodes;
    }

    get ox(): number {
        return this.viewport.ox;
    }

    get oy(): number {
        return this.viewport.oy;
    }

    get scale(): number {
        return this.viewport.scale;
    }

    get baseStep(): number {
        return this.viewport.baseStep;
    }

    get dotR(): number {
        return this.viewport.baseDot;
    }

    get nodeSize(): number {
        return this.viewport.nodeSize;
    }

    get pendingPreviewD(): string {
        return this.renderer.previewPath;
    }

    nodeZIndex(node: GFlowNode): number {
        if (node.focused) return 10;
        if (isZoneNode(node)) return 0;
        return 1;
    }

    get canUndo(): boolean {
        return this.history.canUndo;
    }

    get canRedo(): boolean {
        return this.history.canRedo;
    }

    zoneChildCount(zoneId: string): number {
        return this.nodes.filter(n => n.parentId === zoneId).length;
    }

    isZoneDropTarget(nodeId: string): boolean {
        return this.dragDropTargetZoneId === nodeId;
    }
    // Lifecycle

    ngOnInit(): void {
        this.state.addNode('start', 0, 0);
        this.shouldCenterOnStart = true;
        this.pushSnapshot();
        this.initPresence();
    }

    private mapPresenceUser(u: PresenceUserResponse): PresenceUser {
        return { id: u.id, name: `${u.first_name} ${u.last_name}`.trim(), avatarUrl: u.avatar_url ?? undefined };
    }

    private initPresence(): void {
        const orgId = this.orgId();
        const flowId = this.flow().id;
        if (!orgId || !flowId) return;

        // Load initial presence list
        this.flowsService.getPresence(orgId, flowId).pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe({
            next: users => this.presenceUsers.set(users.map(u => this.mapPresenceUser(u))),
            error: () => {} // Presence not available yet
        });

        // Real-time join
        this.wsService.on('presence.join').pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(data => {
            if (data.flow_id !== flowId) return;
            this.presenceUsers.update(list => {
                if (list.some(u => u.id === data.user.id)) return list;
                return [...list, this.mapPresenceUser(data.user)];
            });
        });

        // Real-time leave
        this.wsService.on('presence.leave').pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(data => {
            if (data.flow_id !== flowId) return;
            this.presenceUsers.update(list => list.filter(u => u.id !== data.user_id));
        });
    }

    ngAfterViewInit(): void {
        this.renderer.initialize(this.viewportRef().nativeElement, () => this.cdr.detectChanges());
        this.refreshFocusedInputMap();
        this.renderer.schedule();
        this.updateCursor();

        if (this.shouldCenterOnStart) {
            this.centerOnStartNode();
        }
    }

    ngOnDestroy(): void {
        this.renderer.dispose();
    }
    // Keyboard handlers

    @HostListener('window:resize')
    onWindowResize(): void {
        this.viewport.invalidateRect();
    }

    @HostListener('window:beforeunload', ['$event'])
    handleBeforeUnload(event: BeforeUnloadEvent): void {
        if (this.isDirty()) {
            event.preventDefault();
        }
    }

    @HostListener('document:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            this.onSave();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            event.preventDefault();
            this.undo();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
            event.preventDefault();
            this.redo();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            event.preventDefault();
            this.copySelection();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
            event.preventDefault();
            this.pasteClipboard();
            return;
        }

        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        if (event.key === 'Delete') {
            this.onDeleteFromPanel();
        }
    }
    // Public methods

    loadFlow(flowData: {
        title: string;
        description?: string;
        id?: string;
        nodes?: SerializedNode[];
        links?: GFlowLink[];
        viewport?: { x: number; y: number; scale: number };
    }): void {
        this.flow.set({
            title: flowData.title || 'Nouveau Flow',
            description: flowData.description || '',
            id: flowData.id || null,
        });

        if (flowData.nodes) {
            this.state.nodes = flowData.nodes.map(n => {
                const definition = NODE_DEFINITION_MAP[n.type];
                const blueprint = definition?.create();

                return {
                    ...n,
                    inputs: n.inputs || [],
                    outputs: n.outputs || [],
                    entries: n.entries ?? blueprint?.entries ?? [],
                    exits: n.exits ?? blueprint?.exits ?? [],
                    color: definition?.color || '',
                    icon: definition?.icon || { icon: '' },
                    config: n.config || {},
                    selected: false,
                    focused: false,
                    x: Number(n.x),
                    y: Number(n.y),
                    configComponent: blueprint?.configComponent ?? null,
                };
            });
        }

        if (flowData.links) {
            this.state.links = flowData.links.map((l, i) => ({ ...l, id: String(i + 1) }));
            this.state.syncLinkCounter();
        }

        if (flowData.viewport) {
            this.viewport.ox = Number(flowData.viewport.x);
            this.viewport.oy = Number(flowData.viewport.y);
            this.viewport.scale = Number(flowData.viewport.scale);
            this.shouldCenterOnStart = false;
        } else {
            this.shouldCenterOnStart = true;
        }

        if (!this.state.hasStart()) {
            this.state.addNode('start', 0, 0);
            this.shouldCenterOnStart = true;
        }

        if (this.shouldCenterOnStart) {
            this.centerOnStartNode();
        }

        this.renderer.schedule();
        this.isDirty.set(false);
        this.history.clear();
        this.pushSnapshot();
        this.cdr.markForCheck();

        // Second pass: ensures link paths are recalculated after the browser has
        // fully laid out the new node elements (getBoundingClientRect returns
        // accurate values only once the layout is stable).
        setTimeout(() => this.renderer.schedule(), 50);
    }

    onSave(): void {
        const flowState = this.flow();
        const payload: FlowSavePayload = {
            name: flowState.title,
            description: flowState.description || '',
            data: {
                nodes: this.state.nodes.map((n): SerializedNode => ({
                    id: n.id,
                    type: n.type,
                    x: n.x,
                    y: n.y,
                    name: n.name,
                    configured: n.configured,
                    config: n.config,
                    inputs: n.inputs,
                    outputs: n.outputs,
                    entries: n.entries,
                    exits: n.exits,
                    ...(n.parentId !== undefined && { parentId: n.parentId }),
                    ...(n.zoneWidth !== undefined && { zoneWidth: n.zoneWidth }),
                    ...(n.zoneHeight !== undefined && { zoneHeight: n.zoneHeight }),
                })),
                links: this.state.links.map(({ d, mid, ...link }) => link),
                viewport: {
                    x: this.viewport.ox,
                    y: this.viewport.oy,
                    scale: this.viewport.scale,
                },
            },
        };

        this.saveFlow.emit(payload);
        this.isDirty.set(false);
    }

    onClose(): void {
        if (this.isDirty()) {
            this.confirmationService.confirm({
                message: 'Vous avez des modifications non sauvegardées.',
                header: 'Sauvegarder avant de quitter ?',
                icon: 'fa-solid fa-floppy-disk',
                acceptLabel: 'Sauvegarder',
                rejectLabel: 'Quitter sans sauvegarder',
                acceptButtonStyleClass: 'p-button-sm',
                rejectButtonStyleClass: 'p-button-danger p-button-text p-button-sm',
                accept: () => { this.onSave(); this.close.emit(); },
                reject: (type?: ConfirmEventType) => {
                    if (type === ConfirmEventType.REJECT) {
                        this.close.emit();
                    }
                },
            });
            return;
        }
        this.close.emit();
    }

    onDocNavigate(fragment: string): void {
        this.close.emit();
        this.router.navigate(['/automation/docs'], { fragment: fragment || undefined });
    }

    setTool(tool: ToolType): void {
        this.currentTool.set(tool);
        this.updateCursor();
    }

    undo(): void {
        const snapshot = this.history.undo();
        if (snapshot) this.restoreSnapshot(snapshot);
    }

    redo(): void {
        const snapshot = this.history.redo();
        if (snapshot) this.restoreSnapshot(snapshot);
    }
    // Title editing

    startEditingTitle(event: MouseEvent): void {
        event.stopPropagation();
        this.isEditingTitle.set(true);
        this.cdr.detectChanges();
        const input = this.titleInputRef()?.nativeElement;
        if (input) {
            input.focus();
            input.select();
        }
    }

    stopEditingTitle(): void {
        if (!this.isEditingTitle()) return;
        this.isEditingTitle.set(false);
        this.isDirty.set(true);
    }

    onTitleKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.titleInputRef()?.nativeElement.blur();
        }
    }

    updateFlowTitle(title: string): void {
        this.flow.update(f => ({ ...f, title }));
    }
    // Viewport events

    onWheel(event: WheelEvent): void {
        this.viewport.applyWheel(event);
        this.renderer.scheduleViewportOnly();
    }

    onViewportMouseDown(ev: MouseEvent): void {
        this.skipNextClick = false;

        if (ev.button !== 0) return;
        if (this.dragState.active || this.pendingLink) return;
        if (this.isPortElement(ev.target as HTMLElement)) return;

        if (this.currentTool() === 'pan') {
            this.beginPan(ev);
        } else {
            this.beginSelection(ev);
        }
    }

    onViewportClick(): void {
        if (this.skipNextClick) {
            this.skipNextClick = false;
            return;
        }
        this.closeConfig();
        this.deselectAll();
    }

    onMouseMove(ev: MouseEvent): void {
        if (this.panState.active && (ev.buttons & 1)) {
            this.updatePan(ev);
        }
    }

    onDocMouseMove(ev: MouseEvent): void {
        if (this.dragState.active && this.dragState.node) {
            this.updateDrag(ev);
            return;
        }

        if (this.pendingLink) {
            this.updatePendingLink(ev);
        }

        if (this.selectionState.active) {
            this.updateSelection(ev);
        }
    }

    onDocMouseUp(ev: MouseEvent): void {
        if (this.panState.active) this.endPan();
        if (this.dragState.active && this.dragState.node) this.endDrag();
        if (this.pendingLink) this.endLink(ev);
        if (this.selectionState.active) this.endSelection();
        this.renderer.schedule();
    }

    onDocMouseDown(ev: MouseEvent): void {
        const target = ev.target as HTMLElement;
        const portEl = target?.closest('.input-port, .output-port, .entry-port, .exit-port') as HTMLElement | null;
        if (!portEl) return;

        ev.preventDefault();
        ev.stopPropagation();
        this.skipNextClick = true;

        const host = portEl.closest('[data-node-id]') as HTMLElement;
        const nodeId = host.getAttribute('data-node-id')!;
        const portIndex = Number(portEl.getAttribute('data-index') || 0);
        const kind = this.getPortKind(portEl);

        const world = this.viewport.toWorld(ev.clientX, ev.clientY);
        this.pendingLink = { from: { nodeId, portIndex, kind }, mouse: world };
        this.renderer.updatePendingLink(this.pendingLink);
    }
    // Node drag

    startDrag(ev: MouseEvent, node: GFlowNode): void {
        if (this.isPortElement(ev.target as HTMLElement)) return;
        ev.preventDefault();
        ev.stopPropagation();

        if (!node.selected) {
            this.deselectAll();
            node.selected = true;
        }
        this.focusNode(node);

        const world = this.viewport.toWorld(ev.clientX, ev.clientY);
        this.dragState = {
            active: true,
            node,
            startX: node.x,
            startY: node.y,
            dx: world.x - node.x,
            dy: world.y - node.y,
            group: [],
        };

        this.nodes.forEach(other => {
            if (other.selected && other.id !== node.id) {
                this.dragState.group.push({ node: other, x0: other.x, y0: other.y });
            }
        });

        // If dragging a zone, include all its children in the group
        if (isZoneNode(node)) {
            this.nodes.forEach(child => {
                if (child.parentId === node.id && !this.dragState.group.some(g => g.node.id === child.id)) {
                    this.dragState.group.push({ node: child, x0: child.x, y0: child.y });
                }
            });
        }
    }
    // Palette

    togglePalette(ev?: MouseEvent): void {
        ev?.stopPropagation();
        this.paletteOpen.update(v => !v);
        this.viewport.invalidateRect();
    }

    addFromPalette(item: PaletteItem): void {
        const rect = this.viewportRef().nativeElement.getBoundingClientRect();
        const vx = this.paletteOpen() ? this.paletteWidth + 80 : rect.width * 0.5;
        const vy = rect.height * 0.5;
        const w = this.viewport.toWorld(rect.left + vx, rect.top + vy);
        this.addNodeAt(item.type, w.x, w.y);
    }

    onPaletteDragStart(ev: DragEvent, item: PaletteItem): void {
        ev.dataTransfer?.setData('application/x-node', JSON.stringify(item));
        if (ev.dataTransfer) {
            ev.dataTransfer.effectAllowed = 'copy';
        }
    }

    onWorldDragOver(ev: DragEvent): void {
        if (ev.dataTransfer?.types?.includes('application/x-node')) {
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'copy';
        }
    }

    onWorldDrop(event: DragEvent): void {
        const raw = event.dataTransfer?.getData('application/x-node');
        if (!raw) return;
        event.preventDefault();

        const item: PaletteItem = JSON.parse(raw);
        const world = this.viewport.toWorld(event.clientX, event.clientY);
        const hitLink = this.findLinkAt(world.x, world.y);

        if (hitLink) {
            this.splitLinkWithNode(hitLink, item.type, world.x, world.y);
        } else {
            this.addNodeAt(item.type, world.x, world.y);
        }
    }
    // Link interactions

    onLinkClick(event: MouseEvent, link: GFlowLink): void {
        event.stopPropagation();
        this.focusLink(link);
    }
    // Node focus and config

    focusNode(node: GFlowNode | null): void {
        this.focusedNode = node;
        this.focusedLink = null;
        this.nodes.forEach(n => (n.focused = n.id === node?.id));
        this.refreshFocusedInputMap();
        this.cdr.markForCheck();
    }

    focusLink(link: GFlowLink | null): void {
        this.focusedLink = link;
        this.focusedNode = null;
        this.nodes.forEach(n => {
            n.focused = false;
            n.selected = false;
        });
        if (link) this.openConfig();
        this.cdr.markForCheck();
    }

    centerNode(node: GFlowNode): void {
        this.focusNode(node);
        this.openConfig();
        this.renderer.schedule();
    }

    openConfig(): void {
        this.execPanelOpen.set(false);
        this.configOpen.set(true);
        this.refreshFocusedInputMap();
        this.viewport.invalidateRect();
    }

    closeConfig(): void {
        this.configOpen.set(false);
        this.focusNode(null);
        this.focusLink(null);
        this.viewport.invalidateRect();
    }

    toggleExecPanel(): void {
        if (this.execPanelOpen()) {
            this.execPanelOpen.set(false);
            this.activeNodeLogs.set([]);
        } else {
            this.closeConfig();
            this.execPanelOpen.set(true);
        }
    }

    openExecPanel(): void {
        this.closeConfig();
        this.initialExecutionId.set(null);
        this.execPanelOpen.set(true);
    }

    openExecPanelWithExecution(executionId: string): void {
        this.closeConfig();
        this.initialExecutionId.set(executionId);
        this.execPanelOpen.set(true);
    }

    onNodeConfigChange(evt: unknown): void {
        if (!this.focusedNode) return;

        // Handle 'new' node type selection → transform into the chosen type
        if (this.focusedNode.type === 'new' && typeof evt === 'string') {
            this.transformNewNode(evt as NodeType);
            return;
        }

        // Replace node reference so the child's item() signal detects a change,
        // which forces all computed() signals (endStatus, agentName, etc.) to re-evaluate.
        const idx = this.state.nodes.indexOf(this.focusedNode);
        if (idx >= 0) {
            const fresh = { ...this.focusedNode };
            this.state.nodes[idx] = fresh;
            this.focusedNode = fresh;
        }

        this.state.recomputeDownstreamFrom(this.focusedNode.id);
        this.afterGraphChange();
    }

    onDeleteFromPanel(): void {
        // Link deletion — no confirmation needed
        if (this.focusedLink) {
            this.performDeletion([], this.focusedLink);
            return;
        }

        const nodesToDelete = this.nodes.filter(n => n.selected || n.id === this.focusedNode?.id);
        const deletableNodes = nodesToDelete.filter(n => n.type !== 'start');

        if (deletableNodes.length === 0) {
            if (nodesToDelete.some(n => n.type === 'start')) {
                this.showWarning('Le noeud de départ ne peut pas être supprimé.');
            }
            return;
        }

        const message = deletableNodes.length > 1
            ? 'Voulez-vous vraiment supprimer ces éléments ?'
            : 'Voulez-vous vraiment supprimer ce noeud ?';

        this.confirmationService.confirm({
            message,
            header: 'Confirmation de suppression',
            icon: 'fa-jelly-fill fa-solid fa-trash',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger p-button-sm',
            rejectButtonStyleClass: 'p-button-secondary p-button-text p-button-sm',
            accept: () => this.performDeletion(deletableNodes, null),
        });
    }
    // Agent → Container conversion

    isSoleSelectedAgent(node: GFlowNode): boolean {
        return node.type === 'agent' && node.selected &&
            this.nodes.filter(n => n.selected).length === 1;
    }
    // Text nodes

    addTextNode(): void {
        const rect = this.viewportRef().nativeElement.getBoundingClientRect();
        const w = this.viewport.toWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
        const x = this.viewport.snap(w.x - 60);
        const y = this.viewport.snap(w.y - 20);
        const node = this.state.addNode('text', x, y);
        this.focusNode(node);
        node.selected = true;
        this.afterGraphChange();
    }

    onTextChange(node: GFlowNode, text: string): void {
        (node.config as TextConfig).text = text;
        const idx = this.state.nodes.indexOf(node);
        if (idx >= 0) {
            this.state.nodes[idx] = { ...node };
        }
        this.isDirty.set(true);
        this.pushSnapshot();
        this.cdr.markForCheck();
    }

    onDeleteNode(node: GFlowNode): void {
        if (node.type === 'start') return;

        // Delete children when deleting a zone
        if (isZoneNode(node)) {
            const children = this.nodes.filter(child => child.parentId === node.id);
            children.forEach(child => this.state.deleteNode(child.id));
        }

        this.state.deleteNode(node.id);
        this.focusNode(null);
        this.afterGraphChange();
        this.closeConfig();
    }

    onNodeContextMenu(event: MouseEvent, node: GFlowNode): void {
        event.preventDefault();
        event.stopPropagation();

        this.nodeContextMenuItems = [
            {
                label: 'Configurer',
                icon: 'fa-solid fa-sliders',
                disabled: node.type === 'text',
                command: () => { this.focusNode(node); this.openConfig(); },
            },
            {
                label: 'Dupliquer',
                icon: 'fa-solid fa-copy',
                disabled: node.type === 'start',
                command: () => this.duplicateNode(node),
            },
            { separator: true },
            {
                label: 'Supprimer',
                icon: 'fa-solid fa-trash',
                disabled: node.type === 'start',
                styleClass: 'menu-item--danger',
                command: () => this.onDeleteNode(node),
            },
        ];

        this.nodeContextMenuRef()?.show(event);
    }

    private duplicateNode(node: GFlowNode): void {
        const { focused, selected, configComponent, ...rest } = node;
        this.clipboard = { nodes: [structuredClone(rest)], links: [] };
        this.pasteClipboard();
    }

    onTextResizeStart(event: MouseEvent, node: GFlowNode): void {
        if (isZoneNode(node)) {
            this.onZoneResizeStart(event, node);
            return;
        }

        let currentNode = node;
        let config = currentNode.config as TextConfig;
        const startX = event.clientX;
        const startWidth = config.width || 180;
        let resizeRafId: number | null = null;

        const onMouseMove = (e: MouseEvent) => {
            const delta = (e.clientX - startX) / this.viewport.scale;
            config.width = Math.max(100, Math.round(startWidth + delta));
            if (resizeRafId === null) {
                resizeRafId = requestAnimationFrame(() => {
                    resizeRafId = null;
                    // Replace node reference so item() input signal detects the change
                    // and the textWidth computed recomputes
                    const idx = this.state.nodes.indexOf(currentNode);
                    if (idx >= 0) {
                        this.state.nodes[idx] = { ...currentNode };
                        currentNode = this.state.nodes[idx];
                        config = currentNode.config as TextConfig;
                    }
                    this.renderer.schedule();
                    this.cdr.markForCheck();
                });
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (resizeRafId !== null) {
                cancelAnimationFrame(resizeRafId);
            }
            this.isDirty.set(true);
            this.pushSnapshot();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    private onZoneResizeStart(event: MouseEvent, node: GFlowNode): void {
        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = node.zoneWidth ?? ZONE_DEFAULT_WIDTH;
        const startHeight = node.zoneHeight ?? ZONE_DEFAULT_HEIGHT;
        let resizeRafId: number | null = null;

        const onMouseMove = (e: MouseEvent) => {
            const dx = (e.clientX - startX) / this.viewport.scale;
            const dy = (e.clientY - startY) / this.viewport.scale;
            node.zoneWidth = Math.max(200, Math.round(startWidth + dx));
            node.zoneHeight = Math.max(200, Math.round(startHeight + dy));
            if (resizeRafId === null) {
                resizeRafId = requestAnimationFrame(() => {
                    resizeRafId = null;
                    this.renderer.schedule();
                    this.cdr.markForCheck();
                });
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (resizeRafId !== null) {
                cancelAnimationFrame(resizeRafId);
            }
            node.zoneWidth = this.viewport.snap(node.zoneWidth ?? ZONE_DEFAULT_WIDTH);
            node.zoneHeight = this.viewport.snap(node.zoneHeight ?? ZONE_DEFAULT_HEIGHT);
            this.isDirty.set(true);
            this.pushSnapshot();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    // Node click / dblclick handlers

    onNodeClick(event: MouseEvent, node: GFlowNode): void {
        event.stopPropagation();
        this.focusNode(node);
        if (node.type !== 'text') {
            this.openConfig();
        }
    }

    onNodeDblClick(_event: MouseEvent, node: GFlowNode): void {
        if (node.type !== 'text') {
            this.centerNode(node);
        }
    }
    // Agent → Container conversion

    onAddToContainer(node: GFlowNode): void {
        if (node.type === 'agent') {
            this.convertAgentToContainer(node);
        } else if (node.type === 'container') {
            this.focusNode(node);
            this.openConfig();
        }
    }

    private convertAgentToContainer(agentNode: GFlowNode): void {
        const agentConfig = agentNode.config as AgentConfig;
        const containerDef = NODE_DEFINITION_MAP['container'];
        const blueprint = containerDef.create();

        const agents: ContainerConfig['agents'] = [];
        if (agentConfig.agentId) {
            agents.push({
                agentId: agentConfig.agentId,
                agentName: agentConfig.agentName || '',
                version: agentConfig.version || '',
            });
        }

        const containerNode: GFlowNode = {
            id: agentNode.id,
            x: agentNode.x,
            y: agentNode.y,
            type: 'container',
            name: blueprint.name,
            color: containerDef.color,
            icon: containerDef.icon,
            inputs: blueprint.inputs,
            outputs: blueprint.outputs,
            entries: blueprint.entries,
            exits: blueprint.exits,
            configured: agents.length > 0,
            config: { agents } as ContainerConfig,
            configComponent: blueprint.configComponent,
            focused: true,
            selected: true,
        };

        // Replace in-place (same ID keeps links valid)
        const idx = this.state.nodes.indexOf(agentNode);
        if (idx !== -1) {
            this.state.nodes[idx] = containerNode;
        }

        // Remove any entry/exit links that no longer have ports
        this.state.links = this.state.links.filter(link => {
            if (link.src.nodeId === containerNode.id && !this.hasPort(containerNode, link.src.kind, link.src.portIndex)) {
                return false;
            }
            if (link.dst.nodeId === containerNode.id && !this.hasPort(containerNode, link.dst.kind, link.dst.portIndex)) {
                return false;
            }
            return true;
        });

        this.focusedNode = containerNode;
        this.refreshFocusedInputMap();
        this.state.recomputeDownstreamFrom(containerNode.id);
        this.afterGraphChange();
        this.openConfig();
    }
    // Private methods - Pan

    private beginPan(ev: MouseEvent): void {
        this.panState = { active: true, moved: false, startX: ev.clientX, startY: ev.clientY };
        this.worldDragging = true;
        this.updateCursor();
    }

    private updatePan(ev: MouseEvent): void {
        if (!this.panState.moved) {
            const dx = Math.abs(ev.clientX - this.panState.startX);
            const dy = Math.abs(ev.clientY - this.panState.startY);
            if (dx + dy > CLICK_TO_DRAG_THRESHOLD_PX) {
                this.panState.moved = true;
            }
        }
        this.viewport.moveBy(ev.movementX, ev.movementY);
        this.renderer.scheduleViewportOnly();
    }

    private endPan(): void {
        if (this.panState.moved) this.skipNextClick = true;
        this.panState.active = false;
        this.worldDragging = false;
        this.updateCursor();
    }
    // Private methods - Selection

    private beginSelection(ev: MouseEvent): void {
        if (!ev.shiftKey && !ev.ctrlKey) this.deselectAll();
        const bounds = this.viewportRef().nativeElement.getBoundingClientRect();
        const x = ev.clientX - bounds.left;
        const y = ev.clientY - bounds.top;
        this.selectionState = {
            active: true,
            startX: x,
            startY: y,
            currentX: x,
            currentY: y,
            style: { left: `${x}px`, top: `${y}px`, width: '0px', height: '0px' },
        };
    }

    private updateSelection(ev: MouseEvent): void {
        const bounds = this.viewportRef().nativeElement.getBoundingClientRect();
        const x = ev.clientX - bounds.left;
        const y = ev.clientY - bounds.top;
        this.selectionState.currentX = x;
        this.selectionState.currentY = y;

        const minX = Math.min(this.selectionState.startX, x);
        const minY = Math.min(this.selectionState.startY, y);
        const width = Math.abs(x - this.selectionState.startX);
        const height = Math.abs(y - this.selectionState.startY);

        this.selectionState.style = {
            left: `${minX}px`,
            top: `${minY}px`,
            width: `${width}px`,
            height: `${height}px`,
        };

        const worldTL = this.viewport.toWorld(bounds.left + minX, bounds.top + minY);
        const worldBR = this.viewport.toWorld(bounds.left + minX + width, bounds.top + minY + height);
        const sel = {
            x: Math.min(worldTL.x, worldBR.x),
            y: Math.min(worldTL.y, worldBR.y),
            w: Math.abs(worldBR.x - worldTL.x),
            h: Math.abs(worldBR.y - worldTL.y),
        };

        this.nodes.forEach(n => {
            const nw = getNodeWidth(n);
            const nh = getNodeHeight(n);
            n.selected = sel.x < n.x + nw && sel.x + sel.w > n.x && sel.y < n.y + nh && sel.y + sel.h > n.y;
        });
        this.cdr.markForCheck();
    }

    private endSelection(): void {
        const dx = Math.abs(this.selectionState.currentX - this.selectionState.startX);
        const dy = Math.abs(this.selectionState.currentY - this.selectionState.startY);
        const hadArea = dx > 3 || dy > 3;

        if (hadArea) {
            this.skipNextClick = true;
            // Keep the rect visible with fade-out
            this.selectionState.active = false;
            this.selectionFading = true;
            this.cdr.markForCheck();

            setTimeout(() => {
                this.selectionFading = false;
                this.selectionState = this.createBlankSelectionState();
                this.cdr.markForCheck();
            }, 500);
        } else {
            this.selectionState = this.createBlankSelectionState();
        }
    }
    // Private methods - Drag

    private updateDrag(ev: MouseEvent): void {
        const n = this.dragState.node!;
        const world = this.viewport.toWorld(ev.clientX, ev.clientY);

        n.x = world.x - this.dragState.dx;
        n.y = world.y - this.dragState.dy;

        const dx = n.x - this.dragState.startX;
        const dy = n.y - this.dragState.startY;

        for (const g of this.dragState.group) {
            g.node.x = g.x0 + dx;
            g.node.y = g.y0 + dy;
        }

        // Highlight zone drop target
        this.dragDropTargetZoneId = this.findHoveredZone(n);

        // Highlight link insertion target
        this.dragInsertTargetLinkId = this.findInsertTargetLink(n)?.id ?? null;

        this.renderer.schedule();
    }

    private findHoveredZone(node: GFlowNode): string | null {
        if (isZoneNode(node) || node.type === 'start') return null;

        const nw = getNodeWidth(node);
        const nh = getNodeHeight(node);
        const cx = node.x + nw / 2;
        const cy = node.y + nh / 2;

        for (const zone of this.nodes) {
            if (!isZoneNode(zone)) continue;
            const zw = getNodeWidth(zone);
            const zh = getNodeHeight(zone);
            if (cx > zone.x && cx < zone.x + zw && cy > zone.y && cy < zone.y + zh) {
                return zone.id;
            }
        }
        return null;
    }

    private findInsertTargetLink(node: GFlowNode): GFlowLink | null {
        if (this.dragState.group.length > 0) return null;
        if (!node.inputs?.length || !node.outputs?.length) return null;

        const nw = getNodeWidth(node);
        const nh = getNodeHeight(node);
        const cx = node.x + nw / 2;
        const cy = node.y + nh / 2;
        const threshold = 16;

        for (const link of this.links) {
            if (link.relation !== 'io') continue;
            if (link.src.nodeId === node.id || link.dst.nodeId === node.id) continue;
            if (link.mid) {
                const dist = Math.hypot(link.mid.x - cx, link.mid.y - cy);
                if (dist < threshold * 3) return link;
            }
        }
        return null;
    }

    private endDrag(): void {
        const n = this.dragState.node!;
        n.x = this.viewport.snap(n.x);
        n.y = this.viewport.snap(n.y);

        for (const g of this.dragState.group) {
            g.node.x = this.viewport.snap(g.node.x);
            g.node.y = this.viewport.snap(g.node.y);
        }

        // Check if dropping onto a link for insertion
        const targetLink = this.dragInsertTargetLinkId
            ? this.links.find(l => l.id === this.dragInsertTargetLinkId) ?? null
            : null;

        if (targetLink && n.inputs?.length > 0 && n.outputs?.length > 0 && this.dragState.group.length === 0) {
            this.insertNodeIntoLink(n, targetLink);
            this.afterGraphChange();
        } else {
            this.resolveCollisions(n);
            this.captureIntoZones(n);
        }

        this.dragInsertTargetLinkId = null;
        this.dragDropTargetZoneId = null;
        this.dragState = this.createBlankDragState();
        this.isDirty.set(true);
    }
    // Private methods - Link creation

    private updatePendingLink(ev: MouseEvent): void {
        if (!this.pendingLink) return;

        const world = this.viewport.toWorld(ev.clientX, ev.clientY);
        const snap = this.findSnappablePort(ev.clientX, ev.clientY, this.pendingLink.from);

        if (snap) {
            if (this.snappedPort && this.snappedPort.element !== snap.element) {
                this.snappedPort.element.classList.remove('is-snapped');
            }
            snap.element.classList.add('is-snapped');
            this.snappedPort = snap;
            this.pendingLink = { ...this.pendingLink, mouse: snap.center };
        } else {
            if (this.snappedPort) {
                this.snappedPort.element.classList.remove('is-snapped');
                this.snappedPort = null;
            }
            this.pendingLink = { ...this.pendingLink, mouse: world };
        }
        this.renderer.updatePendingLink(this.pendingLink);
    }

    private endLink(ev: MouseEvent): void {
        if (this.snappedPort) {
            this.connectToSnap();
        } else {
            const portEl = (ev.target as HTMLElement)?.closest(
                '.input-port, .output-port, .entry-port, .exit-port',
            ) as HTMLElement | null;
            if (portEl) {
                this.connectToPort(portEl);
            } else {
                this.createNodeFromDrop(this.pendingLink!);
            }
        }

        if (this.snappedPort) {
            this.snappedPort.element.classList.remove('is-snapped');
            this.snappedPort = null;
        }
        this.pendingLink = null;
        this.renderer.updatePendingLink(null);
    }

    private connectToPort(portEl: HTMLElement): void {
        const host = portEl.closest('[data-node-id]') as HTMLElement;
        const nodeId = host.getAttribute('data-node-id')!;
        const portIndex = Number(portEl.getAttribute('data-index') || 0);
        const kind = this.getPortKind(portEl);

        const to: PortRef = { nodeId, portIndex, kind };
        this.safeCreateLink(this.pendingLink!.from, to);
    }

    private connectToSnap(): void {
        if (!this.pendingLink || !this.snappedPort) return;
        this.safeCreateLink(this.pendingLink.from, this.snappedPort.ref);
    }

    private createNodeFromDrop(pending: PendingLink): void {
        const inverse: Record<PortKind, PortKind> = { out: 'in', in: 'out', entry: 'exit', exit: 'entry' };
        const targetKind = inverse[pending.from.kind];

        const x = this.viewport.snap(pending.mouse.x - this.nodeSize / 2);
        const y = this.viewport.snap(pending.mouse.y - this.nodeSize / 2);

        const newNode = this.state.addNode('new', x, y);

        const hasEntries = (newNode.entries?.length ?? 0) > 0;
        const hasExits = (newNode.exits?.length ?? 0) > 0;

        if ((targetKind === 'entry' && !hasEntries) || (targetKind === 'exit' && !hasExits)) {
            this.focusNode(newNode);
            this.openConfig();
            this.afterGraphChange();
            return;
        }

        const newPort: PortRef = { nodeId: newNode.id, portIndex: 0, kind: targetKind };

        if (['out', 'entry'].includes(pending.from.kind)) {
            this.safeCreateLink(pending.from, newPort);
        } else {
            this.safeCreateLink(newPort, pending.from);
        }

        this.simplifyNewNode(newNode, targetKind);
        this.focusNode(newNode);
        this.openConfig();
    }

    private safeCreateLink(a: PortRef, b: PortRef): void {
        if (a.nodeId === b.nodeId && a.kind === b.kind && a.portIndex === b.portIndex) return;

        const dup = this.links.some(
            l =>
                l.src.nodeId === a.nodeId &&
                l.src.kind === a.kind &&
                l.src.portIndex === a.portIndex &&
                l.dst.nodeId === b.nodeId &&
                l.dst.kind === b.kind &&
                l.dst.portIndex === b.portIndex,
        );
        if (dup) return;

        this.state.createLinkBetween(a, b);
        this.afterGraphChange();
    }

    private findSnappablePort(mouseX: number, mouseY: number, source: PortRef): SnappedPort | null {
        let selector: string;
        let target: PortKind;

        if (source.kind === 'out') {
            selector = '.input-port';
            target = 'in';
        } else if (source.kind === 'in') {
            selector = '.output-port';
            target = 'out';
        } else if (source.kind === 'entry') {
            selector = '.exit-port';
            target = 'exit';
        } else {
            selector = '.entry-port';
            target = 'entry';
        }

        // Pre-filter: find nodes near the mouse using world-space calculations (no DOM queries)
        const mouseWorld = this.viewport.toWorld(mouseX, mouseY);
        const margin = SNAP_THRESHOLD_PX / this.viewport.scale + NODE_WIDTH;
        const nearbyNodeIds = new Set<string>();

        for (const n of this.nodes) {
            if (n.id === source.nodeId) continue;
            const cx = n.x + NODE_WIDTH / 2;
            const cy = n.y + NODE_BASE_HEIGHT / 2;
            if (Math.abs(cx - mouseWorld.x) < margin && Math.abs(cy - mouseWorld.y) < margin) {
                nearbyNodeIds.add(n.id);
            }
        }

        if (nearbyNodeIds.size === 0) return null;

        // Only query DOM for ports of nearby nodes
        const vp = this.viewportRef().nativeElement;
        const candidates = vp.querySelectorAll(selector);
        let closest: SnappedPort | null = null;
        let min = Infinity;

        candidates.forEach(el => {
            const element = el as HTMLElement;
            const nodeEl = element.closest('[data-node-id]');
            if (!nodeEl) return;

            const nodeId = nodeEl.getAttribute('data-node-id');
            if (!nodeId || !nearbyNodeIds.has(nodeId)) return;

            const r = element.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const d = Math.hypot(mouseX - cx, mouseY - cy);

            if (d < SNAP_THRESHOLD_PX && d < min) {
                min = d;
                const idx = Number(element.getAttribute('data-index') || 0);
                closest = {
                    element,
                    ref: { nodeId: nodeId!, portIndex: idx, kind: target },
                    center: this.viewport.toWorld(cx, cy),
                };
            }
        });

        return closest;
    }
    // Private methods - Node operations

    private addNodeAt(type: NodeType, wx: number, wy: number): void {
        if (type === 'start' && this.state.hasStart()) {
            this.showWarning('Le flux possède déjà un point de départ.');
            return;
        }
        const x = this.viewport.snap(wx - this.nodeSize / 2);
        const y = this.viewport.snap(wy - this.nodeSize / 2);
        const node = this.state.addNode(type, x, y);

        // Auto-create a start node inside zone loops
        if (isZoneNode(node)) {
            const startNode = this.state.addNode('start', x + this.baseStep * 2, y + ZONE_HEADER_HEIGHT + this.baseStep);
            startNode.parentId = node.id;
        }

        this.focusNode(node);
        this.openConfig();
        this.renderer.schedule();
    }

    private splitLinkWithNode(link: GFlowLink, nodeType: NodeType, x: number, y: number): void {
        const nodeX = this.viewport.snap(x - this.nodeSize / 2);
        const nodeY = this.viewport.snap(y - this.nodeSize / 2);
        const newNode = this.state.addNode(nodeType, nodeX, nodeY);

        const hasInput = newNode.inputs && newNode.inputs.length > 0;
        const hasOutput = newNode.outputs && newNode.outputs.length > 0;

        if (!hasInput || !hasOutput) return;

        this.state.removeLink(link.id);

        this.state.createLinkBetween(link.src, {
            nodeId: newNode.id,
            kind: 'in',
            portIndex: 0,
        });

        this.state.createLinkBetween(
            {
                nodeId: newNode.id,
                kind: 'out',
                portIndex: 0,
            },
            link.dst,
        );

        this.focusNode(newNode);
        this.openConfig();
        this.renderer.schedule();
    }

    private insertNodeIntoLink(node: GFlowNode, link: GFlowLink): void {
        // Remove existing connections on port 0 of the dragged node
        for (const l of this.state.inputLinks(node.id, 0)) {
            this.state.removeLink(l.id);
        }
        for (const l of this.state.outputLinks(node.id, 0)) {
            this.state.removeLink(l.id);
        }

        // Remove the target link
        this.state.removeLink(link.id);

        // Rewire: source → node input 0, node output 0 → destination
        this.state.createLinkBetween(link.src, {
            nodeId: node.id,
            kind: 'in',
            portIndex: 0,
        });

        this.state.createLinkBetween(
            {
                nodeId: node.id,
                kind: 'out',
                portIndex: 0,
            },
            link.dst,
        );
    }

    private simplifyNewNode(node: GFlowNode, used: PortKind): void {
        node.entries = used === 'entry' ? node.entries : [];
        node.exits = used === 'exit' ? node.exits : [];
        node.inputs = used === 'in' ? node.inputs : [];
        node.outputs = used === 'out' ? node.outputs : [];
    }

    private transformNewNode(targetType: NodeType): void {
        if (!this.focusedNode) return;

        const definition = NODE_DEFINITION_MAP[targetType];
        if (!definition) return;

        const blueprint = definition.create();
        const oldNode = this.focusedNode;

        // Build the transformed node, preserving id and position
        const newNode: GFlowNode = {
            id: oldNode.id,
            x: oldNode.x,
            y: oldNode.y,
            focused: true,
            selected: true,
            type: targetType,
            name: blueprint.name,
            color: definition.color,
            icon: definition.icon,
            inputs: blueprint.inputs,
            outputs: blueprint.outputs,
            entries: blueprint.entries,
            exits: blueprint.exits,
            configured: blueprint.configured,
            config: blueprint.config,
            configComponent: blueprint.configComponent,
        };

        // Replace in state array
        const idx = this.state.nodes.indexOf(oldNode);
        if (idx !== -1) {
            this.state.nodes[idx] = newNode;
        }

        // Remove links that reference ports no longer present
        this.state.links = this.state.links.filter(link => {
            if (link.src.nodeId === newNode.id && !this.hasPort(newNode, link.src.kind, link.src.portIndex)) {
                return false;
            }
            if (link.dst.nodeId === newNode.id && !this.hasPort(newNode, link.dst.kind, link.dst.portIndex)) {
                return false;
            }
            return true;
        });

        // Update focus to new reference so the config panel re-renders
        this.focusedNode = newNode;
        this.nodes.forEach(n => (n.focused = n.id === newNode.id));
        this.refreshFocusedInputMap();
        this.state.recomputeDownstreamFrom(newNode.id);
        this.afterGraphChange();
    }

    private hasPort(node: GFlowNode, kind: PortKind, index: number): boolean {
        switch (kind) {
            case 'in': return index < node.inputs.length;
            case 'out': return index < node.outputs.length;
            case 'entry': return index < node.entries.length;
            case 'exit': return index < node.exits.length;
        }
    }

    private performDeletion(nodes: GFlowNode[], link: GFlowLink | null): void {
        if (nodes.length > 0) {
            const deletedIds = new Set(nodes.filter(n => n.type !== 'start').map(n => n.id));
            // Delete children of deleted zones
            const children = this.nodes.filter(child => child.parentId && deletedIds.has(child.parentId));
            children.forEach(child => this.state.deleteNode(child.id));
            nodes.forEach(n => {
                if (n.type !== 'start') {
                    this.state.deleteNode(n.id);
                }
            });
            this.focusNode(null);
        }

        if (link) {
            this.state.removeLink(link.id);
            this.focusLink(null);
        }

        this.afterGraphChange();
        this.closeConfig();
        this.messageService.add({ severity: 'info', summary: 'Supprimé', detail: 'Élément(s) supprimé(s)' });
    }

    private resolveCollisions(active: GFlowNode): void {
        const margin = this.baseStep;
        const A = { x: active.x, y: active.y, w: getNodeWidth(active), h: getNodeHeight(active) };
        const hit = { x: A.x - margin / 2, y: A.y - margin / 2, w: A.w + margin, h: A.h + margin };

        for (const other of this.nodes) {
            if (other.id === active.id) continue;
            if (this.dragState.group.some(g => g.node.id === other.id)) continue;

            // Never resolve collisions between zones and regular nodes
            if (isZoneNode(active) !== isZoneNode(other)) continue;

            const B = { x: other.x, y: other.y, w: getNodeWidth(other), h: getNodeHeight(other) };
            const overlap = hit.x < B.x + B.w && hit.x + hit.w > B.x && hit.y < B.y + B.h && hit.y + hit.h > B.y;
            if (!overlap) continue;

            const cA = { x: A.x + A.w / 2, y: A.y + A.h / 2 };
            const cB = { x: B.x + B.w / 2, y: B.y + B.h / 2 };
            const dx = cB.x - cA.x;
            const dy = cB.y - cA.y;
            const avgW = (A.w + B.w) / 2;
            const avgH = (A.h + B.h) / 2;

            if (Math.abs(dx) / avgW > Math.abs(dy) / avgH) {
                other.x = this.viewport.snap(dx > 0 ? A.x + A.w + margin : A.x - B.w - margin);
            } else {
                other.y = this.viewport.snap(dy > 0 ? A.y + A.h + margin : A.y - B.h - margin);
            }
        }
    }

    private captureIntoZones(node: GFlowNode): void {
        // Don't capture zones into other zones (no nesting), and don't capture start nodes
        if (isZoneNode(node) || node.type === 'start') {
            return;
        }

        const nw = getNodeWidth(node);
        const nh = getNodeHeight(node);
        const cx = node.x + nw / 2;
        const cy = node.y + nh / 2;

        for (const zone of this.nodes) {
            if (!isZoneNode(zone)) continue;

            const zw = getNodeWidth(zone);
            const zh = getNodeHeight(zone);

            // Check if node center is inside the zone bounds
            if (cx > zone.x && cx < zone.x + zw && cy > zone.y && cy < zone.y + zh) {
                node.parentId = zone.id;
                return;
            }
        }

        // Not inside any zone — release if previously captured
        node.parentId = undefined;
    }
    // Private methods - Copy / Paste

    private copySelection(): void {
        const selected = this.nodes.filter(n => (n.selected || n.id === this.focusedNode?.id) && n.type !== 'start');
        if (selected.length === 0) return;

        const selectedIds = new Set(selected.map(n => n.id));

        // Copy nodes (strip runtime-only fields)
        const nodes = selected.map(({ focused, selected: _, configComponent, ...rest }) =>
            structuredClone(rest),
        );

        // Copy only links where both endpoints are in the selection
        const links = this.state.links
            .filter(l => selectedIds.has(l.src.nodeId) && selectedIds.has(l.dst.nodeId))
            .map(({ d, mid, ...rest }) => structuredClone(rest));

        this.clipboard = { nodes, links };
        this.messageService.add({ severity: 'info', summary: 'Copié', detail: `${nodes.length} noeud(s) copié(s)` });
    }

    private pasteClipboard(): void {
        if (!this.clipboard || this.clipboard.nodes.length === 0) return;

        const OFFSET = this.viewport.baseStep * 2;

        // Build old→new ID mapping
        const idMap = new Map<string, string>();
        for (const n of this.clipboard.nodes) {
            idMap.set(n.id, generateId());
        }

        // Deselect all current nodes
        this.deselectAll();

        // Create new nodes with new IDs, offset position, and deep-cloned config
        const newNodes: GFlowNode[] = [];
        for (const src of this.clipboard.nodes) {
            const definition = NODE_DEFINITION_MAP[src.type];
            const newNode: GFlowNode = {
                ...structuredClone(src),
                id: idMap.get(src.id)!,
                x: src.x + OFFSET,
                y: src.y + OFFSET,
                focused: false,
                selected: true,
                configComponent: definition?.create().configComponent ?? null,
            };
            this.state.nodes.push(newNode);
            newNodes.push(newNode);
        }

        // Recreate links with remapped node IDs
        for (const src of this.clipboard.links) {
            const newSrcNodeId = idMap.get(src.src.nodeId);
            const newDstNodeId = idMap.get(src.dst.nodeId);
            if (!newSrcNodeId || !newDstNodeId) continue;

            this.state.createLinkBetween(
                { ...src.src, nodeId: newSrcNodeId },
                { ...src.dst, nodeId: newDstNodeId },
            );
        }

        // Update clipboard offset so next paste shifts further
        this.clipboard = {
            ...this.clipboard,
            nodes: this.clipboard.nodes.map(n => ({ ...n, x: n.x + OFFSET, y: n.y + OFFSET })),
        };

        this.afterGraphChange();
    }
    // Private methods - Utilities

    private deselectAll(): void {
        this.nodes.forEach(n => (n.selected = false));
        this.focusNode(null);
        this.focusLink(null);
        this.closeConfig();
    }

    private afterGraphChange(): void {
        if (!this.isRestoring) {
            this.pushSnapshot();
        }
        this.refreshFocusedInputMap();
        this.cdr.markForCheck();
        this.renderer.schedule();
        this.isDirty.set(true);
    }

    private pushSnapshot(): void {
        this.history.push({
            nodes: this.state.nodes.map(({ focused, selected, configComponent, ...node }) => node),
            links: this.state.links.map(({ d, mid, ...link }) => link),
        });
    }

    private restoreSnapshot(snapshot: Snapshot): void {
        this.isRestoring = true;

        this.state.nodes = snapshot.nodes.map(n => {
            const definition = NODE_DEFINITION_MAP[n.type];
            return {
                ...n,
                focused: false,
                selected: false,
                configComponent: definition?.create().configComponent ?? null,
            };
        });

        this.state.links = snapshot.links.map(l => ({ ...l }));
        this.state.syncLinkCounter();

        this.closeConfig();
        this.renderer.schedule();
        this.cdr.markForCheck();
        this.isDirty.set(true);

        this.isRestoring = false;
    }

    private refreshFocusedInputMap(): void {
        this.focusedInputMap = this.focusedNode ? this.state.aggregatedInputMap(this.focusedNode.id) : null;
    }

    private updateCursor(): void {
        const el = this.viewportRef().nativeElement;
        el.style.cursor = this.currentTool() === 'pan' ? (this.worldDragging ? 'grabbing' : 'grab') : 'default';
    }

    private centerOnStartNode(): void {
        setTimeout(() => {
            if (!this.shouldCenterOnStart) return;
            this.viewport.invalidateRect();
            this.viewport.centerOn(0, 0, NODE_WIDTH, NODE_BASE_HEIGHT);
            this.renderer.schedule();
            this.cdr.detectChanges();
            this.shouldCenterOnStart = false;
        }, 10);
    }

    private findLinkAt(x: number, y: number): GFlowLink | null {
        const threshold = 16;

        for (const link of this.links) {
            if (link.mid) {
                const dist = Math.hypot(link.mid.x - x, link.mid.y - y);
                if (dist < threshold * 3) {
                    return link;
                }
            }
        }

        return null;
    }

    private isPortElement(el: HTMLElement): boolean {
        return !!el?.closest('.input-port, .output-port, .entry-port, .exit-port');
    }

    private getPortKind(portEl: HTMLElement): PortKind {
        if (portEl.classList.contains('output-port')) return 'out';
        if (portEl.classList.contains('entry-port')) return 'entry';
        if (portEl.classList.contains('exit-port')) return 'exit';
        return 'in';
    }

    private showWarning(message: string): void {
        this.messageService.add({ severity: 'warn', summary: 'Impossible', detail: message });
    }

    private createBlankDragState(): DragState {
        return { active: false, node: null, startX: 0, startY: 0, dx: 0, dy: 0, group: [] };
    }

    private createBlankSelectionState(): SelectionState {
        return {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            style: { left: '0px', top: '0px', width: '0px', height: '0px' },
        };
    }
}

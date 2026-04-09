import { Type } from '@angular/core';

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export type PortKind = 'in' | 'out' | 'entry' | 'exit';

export interface GFlowPort {
    name?: string;
    map?: JsonValue;
}

export interface PortRef {
    nodeId: string;
    portIndex: number;
    kind: PortKind;
}

export type NodeType =
    | 'new'
    | 'start'
    | 'end'
    | 'if'
    | 'switch'
    | 'merge'
    | 'edit'
    | 'agent'
    | 'determination'
    | 'classification'
    | 'approval'
    | 'http'
    | 'notification'
    | 'container'
    | 'save_file'
    | 'flow'
    | 'for'
    | 'while'
    | 'do-while'
    | 'text';

export interface NodeIcon {
    icon: string;
    rotate?: number;
}

export interface GFlowNode {
    id: string;
    name: string;
    type: NodeType;
    x: number;
    y: number;
    color: string;
    icon: NodeIcon;
    inputs: GFlowPort[];
    outputs: GFlowPort[];
    entries: GFlowPort[];
    exits: GFlowPort[];
    configured: boolean;
    focused: boolean;
    selected: boolean;
    config: NodeConfig;
    configComponent: Type<unknown> | null;
    zoneWidth?: number;
    zoneHeight?: number;
    parentId?: string;
}

export interface StartConfig {
    triggerType?: 'manual' | 'scheduled' | 'webhook';
}

export interface EndConfig {
    status: 'completed' | 'failed' | 'cancelled';
    error_message?: string;
}

export interface IfConfig {
    condition: string;
    field?: string;
    operator?: 'equals' | 'contains' | 'greater' | 'less';
    value?: string;
}

export interface SwitchCase {
    label: string;
    value: string;
}

export interface SwitchConfig {
    field: string;
    cases: SwitchCase[];
}

export interface MergeConfig {
    mode: 'all' | 'any' | 'first';
    inputs?: { index: number; enabled: boolean }[];
}

export interface EditOperation {
    type: 'set' | 'delete' | 'rename';
    path: string;
    value?: string;
    newPath?: string;
}

export interface EditConfig {
    operations: EditOperation[];
}

export interface AgentConfig {
    agentId: string;
    agentName: string;
    version: string;
}

export interface ClassificationConfig {
    documentClasses: string[];
}

export interface ApprovalOption {
    label: string;
    value: string;
    color?: string;
}

export interface ApprovalConfig {
    title: string;
    message: string;
    options: ApprovalOption[];
    assigneeType: 'user' | 'team' | 'role' | 'executor';
    assigneeId: string;
    assigneeEmail: string;
    timeout?: number;
    timeoutAction?: string; // option value or 'skip'
}

export interface HttpHeader {
    key: string;
    value: string;
}

export interface HttpConfig {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers: HttpHeader[];
    body?: string;
    bodyType: 'none' | 'json' | 'form' | 'raw';
    timeout: number;
    retries: number;
    outputPath?: string;
}

export type NotificationChannel = 'app' | 'email' | 'sms';
export type NotificationTargetType = 'executor' | 'user' | 'team' | 'organization' | 'role';

export interface NotificationTarget {
    type: NotificationTargetType;
    id: string;
    name: string;
}

export interface NotificationConfig {
    title: string;
    message: string;
    channel: NotificationChannel;
    targets: NotificationTarget[];
    priority: 'low' | 'normal' | 'high' | 'urgent';
    actionUrl?: string;
    actionLabel?: string;
}

export interface ContainerAgent {
    agentId: string;
    agentName: string;
    version: string;
}

export interface ContainerConfig {
    agents: ContainerAgent[];
}

export interface FlowRefConfig {
    flowId: string;
    flowName: string;
    flowVersion: string;
}

export interface RangerConfig {
    operation: 'archive' | 'move' | 'delete';
    path: string;
}

export interface ForConfig {
    iterableField: string;
}

export interface WhileConfig {
    condition: string;
}

export interface DoWhileConfig {
    condition: string;
}

export interface TextConfig {
    text: string;
    width?: number;
}

export type NodeConfig =
    | StartConfig
    | EndConfig
    | IfConfig
    | SwitchConfig
    | MergeConfig
    | EditConfig
    | AgentConfig
    | ClassificationConfig
    | ApprovalConfig
    | HttpConfig
    | NotificationConfig
    | ContainerConfig
    | FlowRefConfig
    | RangerConfig
    | ForConfig
    | WhileConfig
    | DoWhileConfig
    | TextConfig
    | Record<string, unknown>;

export type LinkRelation = 'io' | 'entry-exit';

export interface GFlowLink {
    id: string;
    src: PortRef;
    dst: PortRef;
    relation: LinkRelation;
    d?: string;
    mid?: { x: number; y: number };
    map?: JsonValue;
}

export interface FlowViewport {
    x: number;
    y: number;
    scale: number;
}

/** Slim format stored in DB — derivable fields (color, icon) are excluded. */
export interface SerializedNode {
    id: string;
    type: NodeType;
    x: number;
    y: number;
    name: string;
    configured: boolean;
    config: NodeConfig;
    inputs: GFlowPort[];
    outputs: GFlowPort[];
    entries: GFlowPort[];
    exits: GFlowPort[];
    parentId?: string;
    zoneWidth?: number;
    zoneHeight?: number;
}

export type SerializedLink = Omit<GFlowLink, 'd' | 'mid'>;

export interface FlowData {
    nodes: GFlowNode[];
    links: GFlowLink[];
    viewport?: FlowViewport;
}

export interface SerializedFlowData {
    nodes: SerializedNode[];
    links: SerializedLink[];
    viewport: FlowViewport;
}

export interface Flow {
    id?: string;
    title: string;
    description?: string;
    data?: FlowData;
}

export function cloneJson<T extends JsonValue>(value: T): T {
    return structuredClone(value);
}

export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createNode(partial: Partial<GFlowNode>): GFlowNode {
    return {
        id: partial.id || generateId(),
        name: partial.name || '',
        type: partial.type || 'new',
        x: partial.x ?? 0,
        y: partial.y ?? 0,
        color: partial.color || '',
        icon: partial.icon || { icon: '' },
        inputs: partial.inputs ? [...partial.inputs] : [],
        outputs: partial.outputs ? [...partial.outputs] : [],
        entries: partial.entries ? [...partial.entries] : [],
        exits: partial.exits ? [...partial.exits] : [],
        configured: partial.configured ?? false,
        focused: partial.focused ?? false,
        selected: partial.selected ?? false,
        config: partial.config || {},
        configComponent: partial.configComponent ?? null,
        zoneWidth: partial.zoneWidth,
        zoneHeight: partial.zoneHeight,
        parentId: partial.parentId,
    };
}

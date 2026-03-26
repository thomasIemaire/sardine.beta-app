import { Type } from '@angular/core';
import {
    AgentConfig,
    ApprovalConfig,
    ClassificationConfig,
    DoWhileConfig,
    EditConfig,
    EndConfig,
    ForConfig,
    GFlowPort,
    HttpConfig,
    IfConfig,
    JsonValue,
    MergeConfig,
    NodeConfig,
    NodeIcon,
    NodeType,
    NotificationConfig,
    SwitchConfig,
    ContainerConfig,
    FlowRefConfig,
    RangerConfig,
    TextConfig,
    WhileConfig,
} from './gflow.types';
import { ConfigEndComponent } from '../configs/config-end';
import { ConfigIfComponent } from '../configs/config-if';
import { ConfigSwitchComponent } from '../configs/config-switch';
import { ConfigEditComponent } from '../configs/config-edit';
import { ConfigAgentComponent } from '../configs/config-agent';
import { ConfigClassificationComponent } from '../configs/config-classification';
import { ConfigApprovalComponent } from '../configs/config-approval';
import { ConfigHttpComponent } from '../configs/config-http';
import { ConfigNotificationComponent } from '../configs/config-notification';
import { ConfigNewComponent } from '../configs/config-new';
import { ConfigContainerComponent } from '../configs/config-container';
import { ConfigRangerComponent } from '../configs/config-ranger';
import { ConfigFlowComponent } from '../configs/config-flow';
import { ConfigForComponent } from '../configs/config-for';
import { ConfigWhileComponent } from '../configs/config-while';
import { ConfigDoWhileComponent } from '../configs/config-do-while';

export type NodeCategory = 'Flux' | 'Logique' | 'Boucles' | 'Actions' | 'Agents';

export interface NodeBlueprint {
    name: string;
    inputs: GFlowPort[];
    outputs: GFlowPort[];
    entries: GFlowPort[];
    exits: GFlowPort[];
    configured: boolean;
    config: NodeConfig;
    configComponent: Type<unknown> | null;
}

export interface NodeDefinition {
    type: NodeType;
    label: string;
    icon: NodeIcon;
    color: string;
    category: NodeCategory;
    create: () => NodeBlueprint;
}

export interface PaletteItem {
    type: NodeType;
    label: string;
    icon: NodeIcon;
    color: string;
}

export interface PaletteGroup {
    name: NodeCategory;
    items: PaletteItem[];
}

function createPort(name?: string, map?: JsonValue): GFlowPort {
    return { name, map };
}

const NODE_DEFINITIONS_LIST: NodeDefinition[] = [
    // Hidden node type for creating new nodes
    {
        type: 'new',
        label: 'Nouveau',
        icon: { icon: 'fa-solid fa-plus' },
        color: 'var(--background-color-300)',
        category: 'Flux',
        create: () => ({
            name: 'Nouveau',
            inputs: [createPort()],
            outputs: [createPort()],
            entries: [createPort()],
            exits: [createPort()],
            configured: false,
            config: {},
            configComponent: ConfigNewComponent,
        }),
    },

    // Flow control nodes
    {
        type: 'start',
        label: 'Début',
        icon: { icon: 'fa-jelly-fill fa-solid fa-play' },
        color: 'var(--p-green-300)',
        category: 'Flux',
        create: () => ({
            name: 'Début',
            inputs: [],
            outputs: [createPort(undefined, {
                trigger: 'manual',
                timestamp: '2024-01-15T10:30:00.000Z',
                payload: {},
            })],
            entries: [],
            exits: [],
            configured: true,
            config: { triggerType: 'manual' },
            configComponent: null,
        }),
    },
    {
        type: 'flow',
        label: 'Flow',
        icon: { icon: 'fa-solid fa-diagram-project' },
        color: 'var(--p-purple-300)',
        category: 'Flux',
        create: () => ({
            name: 'Flow',
            inputs: [createPort()],
            outputs: [createPort(undefined, {
                output: {},
                status: 'completed',
                duration: 1250,
            })],
            entries: [],
            exits: [],
            configured: false,
            config: { flowId: '', flowName: '', flowVersion: '' } as FlowRefConfig,
            configComponent: ConfigFlowComponent,
        }),
    },
    {
        type: 'end',
        label: 'Fin',
        icon: { icon: 'fa-jelly-fill fa-solid fa-stop' },
        color: 'var(--p-red-300)',
        category: 'Flux',
        create: () => ({
            name: 'Fin',
            inputs: [createPort()],
            outputs: [],
            entries: [],
            exits: [],
            configured: false,
            config: { status: 'completed' } as EndConfig,
            configComponent: ConfigEndComponent,
        }),
    },

    // Logic nodes
    {
        type: 'if',
        label: 'Si / Sinon',
        icon: { icon: 'fa-solid fa-split' },
        color: 'var(--p-yellow-300)',
        category: 'Logique',
        create: () => ({
            name: 'Si / Sinon',
            inputs: [createPort()],
            outputs: [createPort('true'), createPort('false')],
            entries: [],
            exits: [],
            configured: false,
            config: { condition: '', field: '', operator: 'equals', value: '' } as IfConfig,
            configComponent: ConfigIfComponent,
        }),
    },
    {
        type: 'switch',
        label: 'Switch / Case',
        icon: { icon: 'fa-solid fa-shuffle' },
        color: 'var(--p-yellow-300)',
        category: 'Logique',
        create: () => ({
            name: 'Switch / Case',
            inputs: [createPort()],
            outputs: [createPort('Case 1')],
            entries: [],
            exits: [],
            configured: false,
            config: { field: '', cases: [{ label: 'Case 1', value: '' }] } as SwitchConfig,
            configComponent: ConfigSwitchComponent,
        }),
    },
    {
        type: 'merge',
        label: 'Fusionner',
        icon: { icon: 'fa-solid fa-merge' },
        color: 'var(--p-yellow-300)',
        category: 'Logique',
        create: () => ({
            name: 'Fusionner',
            inputs: [createPort()],
            outputs: [createPort()],
            entries: [],
            exits: [],
            configured: false,
            config: { mode: 'all' } as MergeConfig,
            configComponent: null,
        }),
    },
    {
        type: 'edit',
        label: 'Modifier',
        icon: { icon: 'fa-jelly-fill fa-regular fa-arrows-rotate' },
        color: 'var(--p-yellow-300)',
        category: 'Logique',
        create: () => ({
            name: 'Modifier',
            inputs: [createPort()],
            outputs: [createPort(undefined, {})],
            entries: [],
            exits: [],
            configured: false,
            config: { operations: [] } as EditConfig,
            configComponent: ConfigEditComponent,
        }),
    },

    {
        type: 'for',
        label: 'Pour chaque',
        icon: { icon: 'fa-jelly-fill fa-regular fa-arrow-rotate-right' },
        color: 'var(--p-orange-300)',
        category: 'Boucles',
        create: () => ({
            name: 'Pour chaque',
            inputs: [createPort()],
            outputs: [createPort(undefined, {
                item: {},
                index: 0,
                total: 10,
            })],
            entries: [],
            exits: [],
            configured: false,
            config: { iterableField: '' } as ForConfig,
            configComponent: ConfigForComponent,
        }),
    },
    {
        type: 'while',
        label: 'Tant que',
        icon: { icon: 'fa-solid fa-arrows-repeat' },
        color: 'var(--p-orange-300)',
        category: 'Boucles',
        create: () => ({
            name: 'Tant que',
            inputs: [createPort()],
            outputs: [createPort()],
            entries: [],
            exits: [],
            configured: false,
            config: { condition: '' } as WhileConfig,
            configComponent: ConfigWhileComponent,
        }),
    },
    {
        type: 'do-while',
        label: 'Faire tant que',
        icon: { icon: 'fa-solid fa-arrows-repeat-1' },
        color: 'var(--p-orange-300)',
        category: 'Boucles',
        create: () => ({
            name: 'Faire tant que',
            inputs: [createPort()],
            outputs: [createPort()],
            entries: [],
            exits: [],
            configured: false,
            config: { condition: '' } as DoWhileConfig,
            configComponent: ConfigDoWhileComponent,
        }),
    },

    // Action nodes
    {
        type: 'approval',
        label: 'Approbation',
        icon: { icon: 'fa-jelly-fill fa-regular fa-thumbs-up' },
        color: 'var(--p-gray-300)',
        category: 'Actions',
        create: () => ({
            name: 'Approbation',
            inputs: [createPort()],
            outputs: [
                createPort('Approuver', {
                    decision: 'approved',
                    approver: { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' },
                    timestamp: '2024-01-15T10:35:00.000Z',
                    comments: '',
                }),
                createPort('Rejeter', {
                    decision: 'rejected',
                    approver: { id: 'u1', name: 'Jean Dupont', email: 'jean@example.com' },
                    timestamp: '2024-01-15T10:35:00.000Z',
                    comments: '',
                }),
            ],
            entries: [],
            exits: [],
            configured: false,
            config: {
                title: '',
                message: '',
                options: [
                    { label: 'Approuver', value: 'approved' },
                    { label: 'Rejeter', value: 'rejected' }
                ],
                assigneeType: 'executor',
                assigneeId: '',
                assigneeEmail: '',
            } as ApprovalConfig,
            configComponent: ConfigApprovalComponent,
        }),
    },
    {
        type: 'http',
        label: 'Requête HTTP',
        icon: { icon: 'fa-jelly-fill fa-solid fa-globe' },
        color: 'var(--p-gray-300)',
        category: 'Actions',
        create: () => ({
            name: 'Requête HTTP',
            inputs: [createPort()],
            outputs: [createPort(undefined, {
                status: 200,
                headers: { 'content-type': 'application/json' },
                body: {},
            })],
            entries: [],
            exits: [],
            configured: false,
            config: {
                method: 'GET',
                url: '',
                headers: [],
                bodyType: 'none',
                timeout: 30000,
                retries: 0,
            } as HttpConfig,
            configComponent: ConfigHttpComponent,
        }),
    },
    {
        type: 'notification',
        label: 'Notification',
        icon: { icon: 'fa-jelly-fill fa-solid fa-bell' },
        color: 'var(--p-gray-300)',
        category: 'Actions',
        create: () => ({
            name: 'Notification',
            inputs: [createPort()],
            outputs: [createPort(undefined, {
                sent: true,
                notificationId: 'notif-1',
                timestamp: '2024-01-15T10:30:00.000Z',
            })],
            entries: [],
            exits: [],
            configured: false,
            config: {
                title: '',
                message: '',
                channel: 'app',
                targets: [{ type: 'executor', id: '', name: '' }],
                priority: 'normal',
            } as NotificationConfig,
            configComponent: ConfigNotificationComponent,
        }),
    },

    {
        type: 'ranger',
        label: 'Fichier',
        icon: { icon: 'fa-solid fa-file-arrow-down' },
        color: 'var(--p-gray-300)',
        category: 'Actions',
        create: () => ({
            name: 'Fichier',
            inputs: [createPort()],
            outputs: [createPort(undefined, {
                file: {
                    id: 'file-1',
                    name: 'document.pdf',
                    path: '/dossier/2024/',
                    folderId: 'folder-1',
                    size: 204800,
                },
            })],
            entries: [],
            exits: [],
            configured: false,
            config: { operation: 'archive', folderId: '', folderName: '', folderPath: '' } as RangerConfig,
            configComponent: ConfigRangerComponent,
        }),
    },

    // Agent nodes
    {
        type: 'agent',
        label: 'Agent',
        icon: { icon: 'fa-solid fa-robot' },
        color: 'var(--p-blue-300)',
        category: 'Agents',
        create: () => ({
            name: 'Agent',
            inputs: [createPort()],
            outputs: [createPort(undefined, {
                result: 'Résultat extrait par l\'agent',
                confidence: 0.94,
                data: {},
                metadata: { model: 'sardine-v2', tokens: 127, duration: 842 },
            })],
            entries: [],
            exits: [],
            configured: false,
            config: { agentId: '', agentName: '', version: '' } as AgentConfig,
            configComponent: ConfigAgentComponent,
        }),
    },
    {
        type: 'determination',
        label: 'Détermination',
        icon: { icon: 'fa-solid fa-distribute-spacing-horizontal' },
        color: 'var(--p-blue-300)',
        category: 'Agents',
        create: () => ({
            name: 'Détermination',
            inputs: [createPort()],
            outputs: [createPort(undefined, {
                category: 'contrat',
                confidence: 0.89,
                alternatives: [
                    { category: 'facture', confidence: 0.07 },
                    { category: 'autre', confidence: 0.04 },
                ],
            })],
            entries: [],
            exits: [],
            configured: true,
            config: {},
            configComponent: null,
        }),
    },
    {
        type: 'classification',
        label: 'Classification',
        icon: { icon: 'fa-jelly-fill fa-regular fa-tag' },
        color: 'var(--p-blue-300)',
        category: 'Agents',
        create: () => ({
            name: 'Classification',
            inputs: [createPort()],
            outputs: [
                createPort('Valide', { documentClass: 'Valide', confidence: 0.92, scores: {} }),
                createPort('Invalide', { documentClass: 'Invalide', confidence: 0.92, scores: {} }),
            ],
            entries: [],
            exits: [],
            configured: false,
            config: { documentClasses: [] } as ClassificationConfig,
            configComponent: ConfigClassificationComponent,
        }),
    },
    {
        type: 'container',
        label: 'Conteneur',
        icon: { icon: 'fa-solid fa-layer-group' },
        color: 'var(--p-blue-300)',
        category: 'Agents',
        create: () => ({
            name: 'Conteneur',
            inputs: [createPort()],
            outputs: [createPort(undefined, {
                results: [{ agentId: 'agent-1', result: 'texte extrait', confidence: 0.91 }],
                metadata: { totalTokens: 340, duration: 2100 },
            })],
            entries: [],
            exits: [],
            configured: false,
            config: { agents: [] } as ContainerConfig,
            configComponent: ConfigContainerComponent,
        }),
    },

    // Text note (not in palette, created via toolbar)
    {
        type: 'text',
        label: 'Texte',
        icon: { icon: 'fa-solid fa-font' },
        color: 'transparent',
        category: 'Flux',
        create: () => ({
            name: 'Texte',
            inputs: [],
            outputs: [],
            entries: [],
            exits: [],
            configured: true,
            config: { text: '' } as TextConfig,
            configComponent: null,
        }),
    },
];

export const NODE_DEFINITIONS = NODE_DEFINITIONS_LIST;

export const NODE_DEFINITION_MAP: Record<NodeType, NodeDefinition> = NODE_DEFINITIONS_LIST.reduce(
    (acc, def) => {
        acc[def.type] = def;
        return acc;
    },
    {} as Record<NodeType, NodeDefinition>
);

export const PALETTE_GROUPS: PaletteGroup[] = (() => {
    const categoryOrder: NodeCategory[] = ['Flux', 'Logique', 'Boucles', 'Actions', 'Agents'];
    const groups = new Map<NodeCategory, PaletteGroup>();

    // Initialize groups in order
    categoryOrder.forEach(category => {
        groups.set(category, { name: category, items: [] });
    });

    // Populate groups (exclude 'new', 'start' and 'container')
    NODE_DEFINITIONS_LIST.forEach(def => {
        if (def.type === 'new' || def.type === 'start' || def.type === 'container' || def.type === 'text') return;

        const group = groups.get(def.category);
        if (group) {
            group.items.push({
                type: def.type,
                label: def.label,
                icon: def.icon,
                color: def.color,
            });
        }
    });

    // Return only non-empty groups
    return categoryOrder
        .map(cat => groups.get(cat)!)
        .filter(group => group.items.length > 0);
})();

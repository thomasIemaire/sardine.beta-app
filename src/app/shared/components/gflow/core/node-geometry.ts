import { ContainerConfig, GFlowNode, PortKind, TextConfig } from './gflow.types';

export const NODE_WIDTH = 220;
export const NODE_BASE_HEIGHT = 80;

const PORT_SIZE = 10;
const PORT_GAP = 24;

// Named-output rows
const HEADER_AREA_H = 56;   // padding-top(12) + icon(32) + gap(12)
const ROW_HEIGHT = 44;
const BODY_BOTTOM_PAD = 10;

// Container
const CONTAINER_AGENT_H = 38;
const CONTAINER_PAD = 12;
const CONTAINER_BTN_H = 28;

// Text
const TEXT_LINE_H = 20;
const TEXT_PAD = 16;

// Zone (for / while)
export const ZONE_DEFAULT_WIDTH = 400;
export const ZONE_DEFAULT_HEIGHT = 300;
export const ZONE_HEADER_HEIGHT = 40;

export function isZoneNode(node: GFlowNode): boolean {
    return node.type === 'for' || node.type === 'while' || node.type === 'do-while';
}

export function getNodeWidth(node: GFlowNode): number {
    if (isZoneNode(node)) {
        return node.zoneWidth ?? ZONE_DEFAULT_WIDTH;
    }
    if (node.type === 'text') {
        return (node.config as TextConfig)?.width || 180;
    }
    return NODE_WIDTH;
}

export function getNodeHeight(node: GFlowNode): number {
    if (isZoneNode(node)) {
        return node.zoneHeight ?? ZONE_DEFAULT_HEIGHT;
    }
    if (node.type === 'text') {
        const text = (node.config as TextConfig)?.text || '';
        const lines = Math.max(1, text.split('\n').length);
        return TEXT_PAD + lines * TEXT_LINE_H;
    }

    const namedOutputs = node.outputs?.filter(o => !!o?.name).length ?? 0;
    if (namedOutputs > 0) {
        return HEADER_AREA_H + namedOutputs * ROW_HEIGHT + BODY_BOTTOM_PAD;
    }

    if (node.type === 'container') {
        const agentCount = (node.config as ContainerConfig)?.agents?.length ?? 0;
        return CONTAINER_PAD + agentCount * CONTAINER_AGENT_H + CONTAINER_BTN_H;
    }

    return NODE_BASE_HEIGHT;
}

export interface Point {
    x: number;
    y: number;
}

/**
 * Calculate the center position of a port in world coordinates.
 *
 * Uses the same layout logic as gflow-node.scss:
 * - Inputs/Outputs: flexbox column, centered vertically, gap 24px
 * - Entries/Exits: flexbox row, centered horizontally, gap 24px
 * - Named outputs: positioned in body rows
 */
export function getPortCenter(node: GFlowNode, kind: PortKind, portIndex: number): Point {
    const w = getNodeWidth(node);
    const h = getNodeHeight(node);

    switch (kind) {
        case 'in':
            return {
                x: node.x,
                y: node.y + flexCenter(h, node.inputs?.length || 1, portIndex),
            };

        case 'out': {
            const namedOutputs = node.outputs?.filter(o => !!o?.name).length ?? 0;
            if (namedOutputs > 0) {
                const idx = Math.min(portIndex, Math.max(0, namedOutputs - 1));
                return {
                    x: node.x + w,
                    y: node.y + HEADER_AREA_H + idx * ROW_HEIGHT + ROW_HEIGHT / 2,
                };
            }
            return {
                x: node.x + w,
                y: node.y + flexCenter(h, node.outputs?.length || 1, portIndex),
            };
        }

        case 'entry':
            return {
                x: node.x + flexCenter(w, node.entries?.length || 1, portIndex),
                y: node.y + h,
            };

        case 'exit':
            return {
                x: node.x + flexCenter(w, node.exits?.length || 1, portIndex),
                y: node.y,
            };
    }
}

/**
 * Given a container of `size` px containing `count` ports laid out with flexbox
 * `justify-content: center` and `gap: PORT_GAP`, return the center coordinate
 * of port at `index`.
 */
function flexCenter(size: number, count: number, index: number): number {
    const idx = Math.min(index, Math.max(0, count - 1));
    const totalContent = count * PORT_SIZE + (count - 1) * PORT_GAP;
    const startOffset = (size - totalContent) / 2;
    return startOffset + idx * (PORT_SIZE + PORT_GAP) + PORT_SIZE / 2;
}

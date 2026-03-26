import { createNode, GFlowNode, NodeType } from './gflow.types';
import { NODE_DEFINITION_MAP } from './node-definitions';

export function createNodeFromType(type: NodeType, x: number, y: number): GFlowNode {
    const definition = NODE_DEFINITION_MAP[type];
    if (!definition) {
        throw new Error(`Unknown node type: ${type}`);
    }

    const blueprint = definition.create();

    return createNode({
        type,
        name: blueprint.name,
        x,
        y,
        color: definition.color,
        icon: definition.icon,
        inputs: blueprint.inputs,
        outputs: blueprint.outputs,
        entries: blueprint.entries,
        exits: blueprint.exits,
        configured: blueprint.configured,
        config: blueprint.config,
        configComponent: blueprint.configComponent,
    });
}

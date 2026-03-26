import { Injectable } from '@angular/core';
import { GFlowNode, GFlowLink } from '../core/gflow.types';

/** Full node snapshot for undo/redo (in-memory only, not persisted). */
type HistoryNode = Omit<GFlowNode, 'focused' | 'selected' | 'configComponent'>;
type HistoryLink = Omit<GFlowLink, 'd' | 'mid'>;

export interface Snapshot {
    nodes: HistoryNode[];
    links: HistoryLink[];
}

const MAX_HISTORY = 50;

@Injectable()
export class GflowHistoryService {
    private stack: Snapshot[] = [];
    private cursor = -1;

    get canUndo(): boolean {
        return this.cursor > 0;
    }

    get canRedo(): boolean {
        return this.cursor < this.stack.length - 1;
    }

    push(snapshot: Snapshot): void {
        this.stack = this.stack.slice(0, this.cursor + 1);
        this.stack.push(this.clone(snapshot));
        this.cursor = this.stack.length - 1;

        if (this.stack.length > MAX_HISTORY) {
            this.stack.shift();
            this.cursor--;
        }
    }

    undo(): Snapshot | null {
        if (!this.canUndo) return null;
        this.cursor--;
        return this.clone(this.stack[this.cursor]);
    }

    redo(): Snapshot | null {
        if (!this.canRedo) return null;
        this.cursor++;
        return this.clone(this.stack[this.cursor]);
    }

    clear(): void {
        this.stack = [];
        this.cursor = -1;
    }

    private clone(snapshot: Snapshot): Snapshot {
        return structuredClone(snapshot);
    }
}

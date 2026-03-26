import { Injectable, NgZone } from '@angular/core';
import { GflowViewportService } from './gflow-viewport.service';
import { GflowStateService } from './gflow-state.service';
import { PortKind, PortRef } from '../core/gflow.types';
import { getPortCenter, Point } from '../core/node-geometry';

export interface PendingLink {
    from: PortRef;
    mouse: Point;
}

type Direction = 'N' | 'S' | 'E' | 'W';

const WIRE_GAP = 4;

const PORT_KIND_CLASS: Record<PortKind, string> = {
    in: 'input-port',
    out: 'output-port',
    entry: 'entry-port',
    exit: 'exit-port',
};

@Injectable()
export class GflowRendererService {
    private rafId: number | null = null;
    private onRendered: (() => void) | null = null;
    private needsLinkRecalc = true;
    private viewport: HTMLElement | null = null;

    private pendingLink: PendingLink | null = null;
    private pendingPreviewD = '';

    constructor(
        private readonly zone: NgZone,
        private readonly viewportService: GflowViewportService,
        private readonly state: GflowStateService,
    ) {}

    get previewPath(): string {
        return this.pendingPreviewD;
    }

    initialize(viewport: HTMLElement, onRendered: () => void): void {
        this.viewport = viewport;
        this.viewportService.setViewport(viewport);
        this.onRendered = onRendered;
        this.schedule();
    }

    dispose(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /** Schedule a full link recalculation + CD notify. */
    schedule(): void {
        this.needsLinkRecalc = true;
        this.scheduleFrame();
    }

    /** Schedule only a CD notify (no link recalculation). Use for pan / zoom. */
    scheduleViewportOnly(): void {
        this.scheduleFrame();
    }

    updatePendingLink(link: PendingLink | null): void {
        this.pendingLink = link;
        this.schedule();
    }

    private scheduleFrame(): void {
        if (this.rafId !== null) return;

        this.rafId = requestAnimationFrame(() => {
            this.rafId = null;

            if (this.needsLinkRecalc) {
                this.needsLinkRecalc = false;
                // 1. Flush pending Angular CD so the DOM reflects latest data
                this.zone.run(() => this.onRendered?.());
                // 2. Invalidate cached rect so port reads use a fresh one
                this.viewportService.invalidateRect();
                // 3. Read fresh DOM port positions and compute link paths
                this.recalculate();
            }

            // 3. Render link paths + viewport changes
            this.zone.run(() => this.onRendered?.());
        });
    }

    private recalculate(): void {
        const stub = this.viewportService.baseStep;

        for (const link of this.state.links) {
            const p1 = this.portPosition(link.src);
            const p2 = this.portPosition(link.dst);

            if (link.relation === 'entry-exit') {
                const route = this.route(
                    this.offset(p1, 'S', WIRE_GAP), this.offset(p2, 'N', WIRE_GAP),
                    'S', 'N', stub,
                );
                link.d = route.d;
                link.mid = route.mid;
            } else {
                const start = this.offset(p1, 'E', WIRE_GAP);
                const end   = this.offset(p2, 'W', WIRE_GAP);
                const pAx   = start.x + stub;
                const pBx   = end.x   - stub;

                const route = pBx <= pAx
                    ? this.routeManhattan(start, end, stub)
                    : this.route(start, end, 'E', 'W', stub);

                link.d = route.d;
                link.mid = route.mid;
            }
        }

        this.pendingPreviewD = this.pendingPath(stub);
    }

    /**
     * Orthogonal Manhattan routing used when the destination is behind (to the left of)
     * the source. The link arrives at the destination from the same side it exits the source:
     *
     *   dest below source  → source goes DOWN → left → DOWN to dest (arrives from above)
     *                        (fallback: loop below both when vertical gap is too small)
     *   dest above source  → source goes UP → left → UP to dest (arrives from below)
     *                        (fallback: loop above both when vertical gap is too small)
     */
    private routeManhattan(
        start: Point, end: Point, stub: number,
    ): { d: string; mid: Point } {
        const pA = this.offset(start, 'E', stub);   // source stub end
        const pB = this.offset(end,   'W', stub);   // dest   stub end
        const R      = Math.min(stub * 0.45, 12);   // corner radius (world units)
        const margin = stub * 2.5;                  // clearance margin

        // hd: horizontal direction at loopY
        const hd = pB.x >= pA.x ? 1 : -1;

        // vd: outgoing vertical direction from source (+1=down, -1=up)
        const vd = pB.y >= pA.y ? 1 : -1;

        // return_vd: direction from loopY to destination (same as vd: continue same direction)
        let loopY: number;
        let return_vd: number;

        if (vd === 1) {
            // ── Dest is BELOW source ─────────────────────────────────────
            // Try to place loopY between source and dest so the path goes
            // DOWN → left → DOWN (arriving at dest from above)
            const candidate = pA.y + margin;
            if (candidate < pB.y - R * 2) {
                loopY     = candidate;   // intermediate: pA.y < loopY < pB.y
                return_vd = 1;           // continue DOWN after loopY → arrives from above
            } else {
                // Gap too small → fall back: loop below both nodes
                loopY     = pB.y + margin;
                return_vd = -1;          // go UP after loopY → arrives from below
            }
        } else {
            // ── Dest is ABOVE source ─────────────────────────────────────
            // Try to place loopY between source and dest so the path goes
            // UP → left → UP (arriving at dest from below, no big outer loop)
            const candidate = pA.y - margin;
            if (candidate > pB.y + R * 2) {
                loopY     = candidate;   // intermediate: pB.y < loopY < pA.y
                return_vd = -1;          // continue UP after loopY → arrives from below
            } else {
                // Gap too small → fall back: loop above both nodes
                loopY     = pB.y - margin;
                return_vd = 1;           // go DOWN after loopY → arrives from above
            }
        }

        const d = [
            `M ${start.x} ${start.y}`,
            // ── East stub, corner 1: E → S/N (outgoing vd) ───────────────
            `L ${pA.x - R} ${pA.y}`,
            `Q ${pA.x} ${pA.y} ${pA.x} ${pA.y + vd * R}`,
            // ── Vertical to loopY, corner 2: S/N → W ─────────────────────
            `L ${pA.x} ${loopY - vd * R}`,
            `Q ${pA.x} ${loopY} ${pA.x + hd * R} ${loopY}`,
            // ── Horizontal at loopY, corner 3: W → S/N (return_vd) ───────
            `L ${pB.x - hd * R} ${loopY}`,
            `Q ${pB.x} ${loopY} ${pB.x} ${loopY + return_vd * R}`,
            // ── Vertical to dest, corner 4: S/N → E ──────────────────────
            `L ${pB.x} ${pB.y - return_vd * R}`,
            `Q ${pB.x} ${pB.y} ${pB.x + R} ${pB.y}`,
            // ── West stub to destination ──────────────────────────────────
            `L ${end.x} ${end.y}`,
        ].join(' ');

        return {
            d,
            mid: { x: (pA.x + pB.x) / 2, y: loopY },
        };
    }

    private pendingPath(stub: number): string {
        if (!this.pendingLink) return '';

        const p1 = this.portPosition(this.pendingLink.from);
        const p2 = this.pendingLink.mouse;
        const kind = this.pendingLink.from.kind;

        if (kind === 'entry' || kind === 'exit') {
            const startDir: Direction = kind === 'entry' ? 'S' : 'N';
            return this.route(this.offset(p1, startDir, WIRE_GAP), p2, startDir, kind === 'entry' ? 'N' : 'S', stub).d;
        }

        const startDir: Direction = kind === 'out' ? 'E' : 'W';
        return this.route(this.offset(p1, startDir, WIRE_GAP), p2, startDir, kind === 'out' ? 'W' : 'E', stub).d;
    }

    private portPosition(ref: PortRef): Point {
        if (this.viewport) {
            const cls = PORT_KIND_CLASS[ref.kind];
            const el = this.viewport.querySelector(
                `[data-node-id="${ref.nodeId}"] .${cls}[data-index="${ref.portIndex}"]`,
            ) as HTMLElement | null;

            if (el) {
                const r = el.getBoundingClientRect();
                // Use viewportService.toWorld() to guarantee same rect as mouse coords
                return this.viewportService.toWorld(
                    r.left + r.width / 2,
                    r.top + r.height / 2,
                );
            }
        }

        // Fallback: pure math (when DOM element not yet rendered)
        const node = this.state.nodes.find(n => n.id === ref.nodeId);
        if (!node) return { x: 0, y: 0 };
        return getPortCenter(node, ref.kind, ref.portIndex);
    }

    private route(
        start: Point, end: Point,
        startDir: Direction, endDir: Direction,
        stub: number,
    ): { d: string; mid: Point } {
        const pA = this.offset(start, startDir, stub);
        const pB = this.offset(end, endDir, stub);

        const dist = Math.hypot(pB.x - pA.x, pB.y - pA.y);
        const pull = Math.max(stub * 2, dist * 0.5);

        const c1 = this.control(pA, startDir, pull);
        const c2 = this.control(pB, endDir, pull);

        const d = `M ${start.x} ${start.y} L ${pA.x} ${pA.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${pB.x} ${pB.y} L ${end.x} ${end.y}`;

        // Cubic bezier midpoint at t=0.5
        const mid = {
            x: 0.125 * (pA.x + 3 * c1.x + 3 * c2.x + pB.x),
            y: 0.125 * (pA.y + 3 * c1.y + 3 * c2.y + pB.y),
        };

        return { d, mid };
    }

    private control(p: Point, dir: Direction, d: number): Point {
        switch (dir) {
            case 'E': return { x: p.x + d, y: p.y };
            case 'W': return { x: p.x - d, y: p.y };
            case 'S': return { x: p.x, y: p.y + d };
            case 'N': return { x: p.x, y: p.y - d };
        }
    }

    private offset(p: Point, dir: Direction, d: number): Point {
        switch (dir) {
            case 'E': return { x: p.x + d, y: p.y };
            case 'W': return { x: p.x - d, y: p.y };
            case 'S': return { x: p.x, y: p.y + d };
            case 'N': return { x: p.x, y: p.y - d };
        }
    }
}

import { Injectable } from '@angular/core';

export interface Point {
    x: number;
    y: number;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
const ZOOM_SENSITIVITY = 0.001;

@Injectable()
export class GflowViewportService {
    ox = 0;
    oy = 0;
    scale = 1;

    readonly baseStep = 24;
    readonly baseDot = 1;

    private viewport: HTMLElement | null = null;
    private cachedRect: DOMRect | null = null;

    get nodeSize(): number {
        return 4 * this.baseStep;
    }

    setViewport(element: HTMLElement): void {
        this.viewport = element;
        this.cachedRect = null;
    }

    getViewport(): HTMLElement | null {
        return this.viewport;
    }

    invalidateRect(): void {
        this.cachedRect = null;
    }

    private getRect(): DOMRect {
        if (!this.cachedRect && this.viewport) {
            this.cachedRect = this.viewport.getBoundingClientRect();
        }
        return this.cachedRect || new DOMRect();
    }

    toWorld(clientX: number, clientY: number): Point {
        const rect = this.getRect();
        const vx = clientX - rect.left;
        const vy = clientY - rect.top;

        return {
            x: (vx - this.ox) / this.scale,
            y: (vy - this.oy) / this.scale,
        };
    }

    toScreen(worldX: number, worldY: number): Point {
        const rect = this.getRect();
        return {
            x: worldX * this.scale + this.ox + rect.left,
            y: worldY * this.scale + this.oy + rect.top,
        };
    }

    snap(value: number): number {
        const g = this.baseStep;
        return Math.round((value + g) / g) * g - g;
    }

    applyWheel(event: WheelEvent): void {
        event.preventDefault();

        const factor = Math.exp(-event.deltaY * ZOOM_SENSITIVITY);
        const previousScale = this.scale;
        this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.scale * factor));

        if (!this.viewport || this.scale === previousScale) {
            return;
        }

        const rect = this.getRect();
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;

        const scaleFactor = this.scale / previousScale;
        this.ox = cx - (cx - this.ox) * scaleFactor;
        this.oy = cy - (cy - this.oy) * scaleFactor;
    }

    moveBy(dx: number, dy: number): void {
        this.ox += dx;
        this.oy += dy;
    }

    centerOn(worldX: number, worldY: number, width: number, height: number): void {
        if (!this.viewport) {
            return;
        }

        const rect = this.getRect();
        const viewportCenterX = rect.width / 2;
        const viewportCenterY = rect.height / 2;
        const worldCenterX = worldX + width / 2;
        const worldCenterY = worldY + height / 2;

        this.ox = viewportCenterX - worldCenterX * this.scale;
        this.oy = viewportCenterY - worldCenterY * this.scale;
    }

    reset(): void {
        this.ox = 0;
        this.oy = 0;
        this.scale = 1;
    }
}

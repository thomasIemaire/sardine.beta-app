import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Injector,
  NgZone,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

export type RectType = 'image' | 'texte' | 'tableau';

export interface AnnotationRect {
  id: string;
  x: number; y: number; width: number; height: number;
  type: RectType;
}

interface DrawingState {
  startX: number; startY: number; currentX: number; currentY: number;
}

const RECT_COLORS: Record<RectType, string> = {
  image: '#f59e0b', texte: '#3b82f6', tableau: '#10b981',
};
const BADGE_WIDTHS: Record<RectType, number> = { texte: 42, image: 46, tableau: 56 };
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 6;

@Component({
  selector: 'app-pdf-viewer',
  imports: [TooltipModule],
  template: `
    <!-- Outer viewport: overflow:hidden, receives wheel + pan mouse events -->
    <div
      class="viewer-wrap"
      #viewerWrap
      [class.mode-draw]="mode() === 'draw'"
      [class.is-panning]="isPanning()"
      (wheel)="onWheel($event)"
      (mousedown)="onWrapMouseDown($event)"
      (mousemove)="onWrapMouseMove($event)"
      (mouseup)="onWrapMouseUp()"
      (mouseleave)="onWrapMouseLeave()"
    >
      <!-- Transformed canvas + annotations -->
      <div
        class="canvas-container"
        #container
        [style.transform]="transform()"
        [style.transform-origin]="'0 0'"
      >
        <canvas #pdfCanvas class="pdf-canvas"></canvas>

        <svg
          #overlay
          class="annotations-overlay"
          [attr.width]="canvasW()"
          [attr.height]="canvasH()"
          (mousedown)="onDrawMouseDown($event)"
          (mousemove)="onDrawMouseMove($event)"
          (mouseup)="onDrawMouseUp($event)"
          (mouseleave)="onDrawMouseLeave()"
        >
          @for (rect of rects(); track rect.id) {
            <g class="annotation-rect">
              <rect
                [attr.x]="rect.x * canvasW()"
                [attr.y]="rect.y * canvasH()"
                [attr.width]="rect.width * canvasW()"
                [attr.height]="rect.height * canvasH()"
                [attr.stroke]="color(rect.type)"
                [attr.fill]="color(rect.type) + '22'"
                stroke-width="2" rx="2"
              />
              <rect
                [attr.x]="rect.x * canvasW()"
                [attr.y]="rect.y * canvasH() - 18"
                [attr.width]="badgeW(rect.type)"
                height="18"
                [attr.fill]="color(rect.type)"
                rx="3"
              />
              <text
                [attr.x]="rect.x * canvasW() + 5"
                [attr.y]="rect.y * canvasH() - 5"
                font-size="11" fill="white" font-family="sans-serif" font-weight="600"
              >{{ rect.type }}</text>
              <g
                class="delete-btn"
                [attr.transform]="deleteBtnPos(rect)"
                (click)="removeRect(rect.id, $event)"
              >
                <circle r="8" fill="rgba(0,0,0,0.55)" cx="8" cy="8" />
                <text x="8" y="12.5" font-size="12" fill="white" text-anchor="middle" font-family="sans-serif">×</text>
              </g>
            </g>
          }
          @if (drawing() && preview(); as p) {
            <rect
              [attr.x]="p.x" [attr.y]="p.y" [attr.width]="p.w" [attr.height]="p.h"
              [attr.stroke]="color(activeType())"
              [attr.fill]="color(activeType()) + '22'"
              stroke-width="2" stroke-dasharray="5,3" rx="2"
            />
          }
        </svg>
      </div>

      <!-- Zoom controls (bottom-right) -->
      @if (!loading() && canvasW()) {
        <div class="zoom-bar">
          <button class="zoom-btn" (click)="zoomOut()" pTooltip="Dézoomer (−)" tooltipPosition="top">
            <i class="fa-regular fa-minus"></i>
          </button>
          <button class="zoom-level" (click)="fitZoom()" pTooltip="Ajuster à l'écran (0)" tooltipPosition="top">
            {{ zoomPercent() }}%
          </button>
          <button class="zoom-btn" (click)="zoomIn()" pTooltip="Zoomer (+)" tooltipPosition="top">
            <i class="fa-regular fa-plus"></i>
          </button>
        </div>
      }

      @if (loading()) {
        <div class="viewer-overlay viewer-loading">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>Chargement…</span>
        </div>
      }
      @if (error()) {
        <div class="viewer-overlay viewer-error">
          <i class="fa-regular fa-circle-exclamation"></i>
          <span>Impossible de lire le PDF</span>
          <small>{{ error() }}</small>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }

    .viewer-wrap {
      position: relative;
      overflow: hidden;
      height: 100%;
      background: var(--p-surface-ground);
      cursor: default;

      &:not(.mode-draw) { cursor: grab; }
      &.is-panning      { cursor: grabbing !important; }
      &.mode-draw       { cursor: default; }
    }

    .canvas-container {
      position: absolute;
      display: inline-block;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
      will-change: transform;
    }

    .pdf-canvas { display: block; }

    .annotations-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: visible;

      .mode-draw & {
        pointer-events: all;
        cursor: crosshair;
      }
    }

    .annotation-rect {
      .delete-btn { cursor: pointer; opacity: 0; transition: opacity .15s; }
      &:hover .delete-btn { opacity: 1; }
    }

    /* Zoom bar */
    .zoom-bar {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      display: flex;
      align-items: center;
      gap: 2px;
      background: var(--p-surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 8px;
      padding: 2px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 10;
    }

    .zoom-btn, .zoom-level {
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--p-text-color);
      border-radius: 5px;
      transition: background .12s;
      &:hover { background: var(--p-surface-hover); }
    }

    .zoom-btn {
      width: 28px;
      height: 28px;
      font-size: .75rem;
    }

    .zoom-level {
      min-width: 48px;
      height: 28px;
      font-size: .75rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    /* Overlays */
    .viewer-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      background: var(--p-surface-ground);
      font-size: .875rem;
      pointer-events: none;
      i { font-size: 1.5rem; }
    }

    .viewer-loading { color: var(--p-text-muted-color); i { color: var(--p-primary-500); } }
    .viewer-error   { color: var(--p-danger-color, #ef4444); small { font-size: .75rem; opacity: .7; } }
  `,
})
export class PdfViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('pdfCanvas')  private canvasRef!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('overlay')    private overlayRef!: ElementRef<SVGSVGElement>;
  @ViewChild('viewerWrap') private wrapRef!: ElementRef<HTMLDivElement>;

  readonly pdfData      = input<ArrayBuffer | null>(null);
  readonly pageNumber   = input<number>(1);
  readonly mode         = input<'move' | 'draw'>('move');
  readonly activeType   = input<RectType>('texte');
  readonly initialRects = input<AnnotationRect[]>([]);

  readonly pageRendered = output<number>();
  readonly rectsChange  = output<AnnotationRect[]>();

  readonly loading  = signal(false);
  readonly error    = signal<string | null>(null);
  readonly canvasW  = signal(0);
  readonly canvasH  = signal(0);
  readonly rects    = signal<AnnotationRect[]>([]);
  readonly drawing  = signal(false);
  readonly preview  = signal<{ x: number; y: number; w: number; h: number } | null>(null);

  // ── Zoom / Pan ─────────────────────────────────────────────────────────────
  readonly zoom     = signal(1);
  readonly panX     = signal(0);
  readonly panY     = signal(0);
  readonly isPanning = signal(false);

  readonly transform   = computed(() => `translate(${this.panX()}px,${this.panY()}px) scale(${this.zoom()})`);
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));

  private panStartX = 0;
  private panStartY = 0;

  // ── Internal ───────────────────────────────────────────────────────────────
  private pdfDoc: PDFDocumentProxy | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private renderTask: any = null;
  private drawState: DrawingState | null = null;
  private loadedData: ArrayBuffer | null = null;

  private readonly zone     = inject(NgZone);
  private readonly injector = inject(Injector);

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    effect(() => {
      const data    = this.pdfData();
      const pageNum = this.pageNumber();
      untracked(() => {
        if (!data) return;
        if (data !== this.loadedData) {
          this.loadPdf(data, pageNum);
        } else if (this.pdfDoc) {
          this.renderPage(this.pdfDoc, pageNum);
        }
      });
    }, { injector: this.injector });

    effect(() => {
      const initial = this.initialRects();
      untracked(() => this.rects.set([...initial]));
    }, { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.pdfDoc?.destroy();
  }

  // ── PDF Loading ────────────────────────────────────────────────────────────

  private async loadPdf(data: ArrayBuffer, pageNum: number): Promise<void> {
    this.cancelRender();
    this.zone.run(() => { this.loading.set(true); this.error.set(null); });
    try {
      if (this.pdfDoc) { await this.pdfDoc.destroy(); this.pdfDoc = null; }
      this.loadedData = data;
      const doc = await getDocument({ data: data.slice(0) }).promise;
      this.pdfDoc = doc;
      this.zone.run(() => this.pageRendered.emit(doc.numPages));
      await this.renderPage(doc, pageNum);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PdfViewer] load error', err);
      this.zone.run(() => { this.error.set(msg); this.loading.set(false); });
    }
  }

  private async renderPage(doc: PDFDocumentProxy, pageNum: number): Promise<void> {
    this.cancelRender();
    this.zone.run(() => this.loading.set(true));

    const canvas = this.canvasRef.nativeElement;
    const ctx    = canvas.getContext('2d')!;
    const page   = await doc.getPage(pageNum);
    const vp     = page.getViewport({ scale: 1.5 });

    canvas.width  = vp.width;
    canvas.height = vp.height;

    this.zone.run(() => {
      this.canvasW.set(vp.width);
      this.canvasH.set(vp.height);
      // Fit the page on every new page render
      this.applyFitZoom(vp.width, vp.height);
    });

    this.renderTask = page.render({ canvasContext: ctx, viewport: vp, canvas });
    try {
      await this.renderTask.promise;
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'RenderingCancelledException') throw err;
    } finally {
      this.renderTask = null;
    }

    this.zone.run(() => this.loading.set(false));
  }

  private cancelRender(): void {
    if (this.renderTask) { this.renderTask.cancel(); this.renderTask = null; }
  }

  // ── Zoom helpers ───────────────────────────────────────────────────────────

  /** Fit the canvas inside the viewport (centered, never bigger than 100%) */
  private applyFitZoom(cw: number, ch: number): void {
    const wrap = this.wrapRef?.nativeElement;
    if (!wrap) return;
    const padding = 48;
    const fitZ = Math.min(
      (wrap.clientWidth  - padding) / cw,
      (wrap.clientHeight - padding) / ch,
    );
    const z = Math.min(fitZ, 1); // never upscale on initial load
    this.zoom.set(z);
    // Center the canvas
    this.panX.set((wrap.clientWidth  - cw * z) / 2);
    this.panY.set((wrap.clientHeight - ch * z) / 2);
  }

  fitZoom(): void {
    this.applyFitZoom(this.canvasW(), this.canvasH());
  }

  zoomIn():  void { this.scaleAround(this.zoom() * 1.25); }
  zoomOut(): void { this.scaleAround(this.zoom() / 1.25); }

  /** Scale keeping the current viewport center fixed */
  private scaleAround(newZoom: number, anchorX?: number, anchorY?: number): void {
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    const wrap = this.wrapRef.nativeElement;
    const ax = anchorX ?? wrap.clientWidth  / 2;
    const ay = anchorY ?? wrap.clientHeight / 2;
    const ratio = newZoom / this.zoom();
    this.panX.update(px => ax - (ax - px) * ratio);
    this.panY.update(py => ay - (ay - py) * ratio);
    this.zoom.set(newZoom);
  }

  // ── Wheel (zoom) ───────────────────────────────────────────────────────────

  /** Non-passive wheel listener so we can preventDefault */
  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    if (this.mode() !== 'move') return;
    event.preventDefault();
    const wrap = this.wrapRef.nativeElement;
    const rect = wrap.getBoundingClientRect();
    const ax = event.clientX - rect.left;
    const ay = event.clientY - rect.top;
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    this.scaleAround(this.zoom() * factor, ax, ay);
  }

  // ── Pan (move mode only) ────────────────────────────────────────────────────

  onWrapMouseDown(event: MouseEvent): void {
    if (this.mode() !== 'move' || event.button !== 0) return;
    event.preventDefault();
    this.isPanning.set(true);
    this.panStartX = event.clientX - this.panX();
    this.panStartY = event.clientY - this.panY();
  }

  onWrapMouseMove(event: MouseEvent): void {
    if (!this.isPanning()) return;
    this.panX.set(event.clientX - this.panStartX);
    this.panY.set(event.clientY - this.panStartY);
  }

  onWrapMouseUp():    void { this.isPanning.set(false); }
  onWrapMouseLeave(): void { this.isPanning.set(false); }

  // ── Draw mode rectangle ────────────────────────────────────────────────────

  onDrawMouseDown(event: MouseEvent): void {
    if (this.mode() !== 'draw') return;
    const { x, y } = this.svgPos(event);
    this.drawState = { startX: x, startY: y, currentX: x, currentY: y };
    this.drawing.set(true);
    this.updatePreview();
  }

  onDrawMouseMove(event: MouseEvent): void {
    if (!this.drawState) return;
    const { x, y } = this.svgPos(event);
    this.drawState.currentX = x;
    this.drawState.currentY = y;
    this.updatePreview();
  }

  onDrawMouseUp(event: MouseEvent): void {
    if (!this.drawState) return;
    const { x, y } = this.svgPos(event);
    this.drawState.currentX = x;
    this.drawState.currentY = y;
    this.commitRect();
  }

  onDrawMouseLeave(): void {
    if (this.drawing()) this.commitRect();
  }

  private updatePreview(): void {
    const { startX, startY, currentX, currentY } = this.drawState!;
    this.preview.set({
      x: Math.min(startX, currentX), y: Math.min(startY, currentY),
      w: Math.abs(currentX - startX), h: Math.abs(currentY - startY),
    });
  }

  private commitRect(): void {
    const { startX, startY, currentX, currentY } = this.drawState!;
    this.drawState = null;
    this.drawing.set(false);
    this.preview.set(null);

    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);
    if (w < 6 || h < 6) return;

    const cw = this.canvasW(), ch = this.canvasH();
    const rect: AnnotationRect = {
      id:     crypto.randomUUID(),
      x:      Math.min(startX, currentX) / cw,
      y:      Math.min(startY, currentY) / ch,
      width:  w / cw,
      height: h / ch,
      type:   this.activeType(),
    };
    this.rects.update((r) => [...r, rect]);
    this.rectsChange.emit(this.rects());
  }

  removeRect(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.rects.update((r) => r.filter((r2) => r2.id !== id));
    this.rectsChange.emit(this.rects());
  }

  // ── SVG coordinate helper ──────────────────────────────────────────────────

  /**
   * Convert a mouse event to SVG canvas-space coordinates.
   * getBoundingClientRect() returns the VISUAL (zoomed) rect,
   * so divide by zoom to get canvas pixels.
   */
  private svgPos(event: MouseEvent): { x: number; y: number } {
    const r = this.overlayRef.nativeElement.getBoundingClientRect();
    return {
      x: (event.clientX - r.left) / this.zoom(),
      y: (event.clientY - r.top)  / this.zoom(),
    };
  }

  // ── Template helpers ───────────────────────────────────────────────────────

  color(type: RectType):  string { return RECT_COLORS[type]; }
  badgeW(type: RectType): number { return BADGE_WIDTHS[type]; }

  deleteBtnPos(rect: AnnotationRect): string {
    const x = (rect.x + rect.width)  * this.canvasW() - 20;
    const y =  rect.y                * this.canvasH() + 4;
    return `translate(${x},${y})`;
  }
}

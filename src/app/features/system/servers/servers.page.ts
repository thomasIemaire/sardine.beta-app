import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { DialogModule } from 'primeng/dialog';
import { PageComponent } from '../../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../../shared/components/header-page/header-page.component';
import { ServerRowComponent } from './server-card.component';
import { ServerDashboardComponent } from './server-detail-panel.component';
import { SparklineChartComponent } from './sparkline-chart.component';
import { GpuServer, MetricSeries, Server, ChartZoom } from './server.model';
import { ServersService } from './servers.service';

@Component({
  selector: 'app-servers',
  imports: [
    PageComponent,
    HeaderPageComponent,
    ServerRowComponent,
    ServerDashboardComponent,
    SparklineChartComponent,
    DialogModule,
  ],
  template: `
    <app-page>

      <!-- Header + facets: uniquement en vue liste -->
      @if (!selectedServerId()) {
        <app-header-page
          title="Serveurs"
          subtitle="Gérez les serveurs de l'application"
          [facets]="facets"
          defaultFacetId="cpus"
          (facetChange)="onFacetChange($event)"
        />
      }

      <div class="servers-body">

        <!-- ── Vue liste ── -->
        @if (!selectedServerId()) {

          <!-- Fleet summary -->
          <div class="fleet-bar">
            <div class="fleet-stats">
              @if (fleet().online) {
                <span class="fleet-item fleet-online">
                  <span class="fleet-dot online"></span>
                  {{ fleet().online }} en ligne
                </span>
              }
              @if (fleet().warning) {
                <span class="fleet-item fleet-warning">
                  <i class="fa-regular fa-triangle-exclamation"></i>
                  {{ fleet().warning }} alerte{{ fleet().warning > 1 ? 's' : '' }}
                </span>
              }
              @if (fleet().offline) {
                <span class="fleet-item fleet-offline">
                  <i class="fa-regular fa-circle-xmark"></i>
                  {{ fleet().offline }} hors ligne
                </span>
              }
            </div>
            @if (fleet().online > 0) {
              <div class="fleet-avg">
                <span class="fleet-avg-label">Charge moy.</span>
                <div class="fleet-avg-bar">
                  <div class="fleet-avg-fill" [style.width]="fleet().avgMain + '%'"></div>
                </div>
                <span class="fleet-avg-val">{{ fleet().avgMain }}%</span>
              </div>
            }
          </div>

          <!-- Server list -->
          <div class="server-list">
            @if (currentFacet === 'cpus') {
              @for (server of svc.cpuServers(); track server.id) {
                <app-server-row [server]="server" (rowClick)="selectServer($event)" />
              }
            }
            @if (currentFacet === 'gpus') {
              @for (server of svc.gpuServers(); track server.id) {
                <app-server-row [server]="server" (rowClick)="selectServer($event)" />
              }
            }
          </div>
        }

        <!-- ── Vue dashboard ── -->
        @if (selectedServer()) {
          <app-server-dashboard
            [server]="selectedServer()!"
            (close)="clearSelection()"
            (chartZoom)="openZoom($event)"
          />
        }

      </div>
    </app-page>

    <!-- ── Zoom dialog ── -->
    <p-dialog
      [visible]="!!activeZoom()"
      (visibleChange)="onDialogClose($event)"
      [header]="activeZoom()?.label ?? ''"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '680px' }"
      [closable]="true"
    >
      <div class="zoom-body">
        <div class="zoom-value" [style.color]="activeZoom()?.color">
          {{ zoomedDisplay() }}
        </div>
        <div class="zoom-stats">
          @let st = zoomedStats();
          <span class="zs"><span class="zs-k">MIN</span><strong>{{ zoomedFmt(st.min) }}</strong></span>
          <span class="zs"><span class="zs-k">MOY</span><strong>{{ zoomedFmt(st.avg) }}</strong></span>
          <span class="zs"><span class="zs-k">MAX</span><strong>{{ zoomedFmt(st.max) }}</strong></span>
        </div>
        <app-sparkline
          [values]="zoomedValues()"
          [color]="activeZoom()?.color ?? '#818cf8'"
          [chartHeight]="200"
          [showGrid]="true"
          [gridLabels]="zoomedGridLabels()"
        />
        <p class="zoom-caption">60 dernières secondes &nbsp;·&nbsp; Temps réel</p>
      </div>
    </p-dialog>
  `,
  styles: `
    .servers-body {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* ── Fleet bar ── */
    .fleet-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.625rem 1.5rem;
      border-bottom: 1px solid var(--surface-border);
      background: var(--p-surface-section, rgba(128,128,128,0.02));
      flex-shrink: 0;
      gap: 1rem;
    }

    .fleet-stats {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .fleet-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      font-weight: 500;

      i { font-size: 0.65rem; }
    }

    .fleet-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;

      &.online { background: #10b981; box-shadow: 0 0 0 2px #10b98120; }
    }

    .fleet-online  { color: #10b981; }
    .fleet-warning { color: #f59e0b; }
    .fleet-offline { color: var(--p-text-muted-color); }

    .fleet-avg {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .fleet-avg-label {
        font-size: 0.68rem;
        color: var(--p-text-muted-color);
      }

      .fleet-avg-bar {
        width: 80px;
        height: 4px;
        background: rgba(128,128,128,0.15);
        border-radius: 2px;
        overflow: hidden;
      }

      .fleet-avg-fill {
        height: 100%;
        background: #818cf8;
        border-radius: 2px;
        transition: width 1s ease;
      }

      .fleet-avg-val {
        font-size: 0.72rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        min-width: 32px;
      }
    }

    /* ── Server list ── */
    .server-list {
      flex: 1;
      overflow-y: auto;
    }

    /* ── Zoom dialog ── */
    .zoom-body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.25rem 0;
    }

    .zoom-value {
      font-size: 3.5rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }

    .zoom-stats {
      display: flex;
      gap: 1.5rem;
    }

    .zs {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;

      .zs-k {
        font-size: 0.55rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--p-text-muted-color);
        opacity: 0.6;
      }

      strong { font-size: 0.85rem; font-variant-numeric: tabular-nums; }
    }

    .zoom-caption {
      font-size: 0.68rem;
      color: var(--p-text-muted-color);
      margin: 0;
    }
  `,
})
export class ServersPage {
  readonly svc    = inject(ServersService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  facets: Facet[] = [
    { id: 'cpus', label: 'CPUs' },
    { id: 'gpus', label: 'GPUs' },
  ];
  currentFacet = 'cpus';

  // ── Sélection persistée dans l'URL (?server=gpu-1) ─────────────────────────

  readonly selectedServerId = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('server'))),
    { initialValue: this.route.snapshot.queryParamMap.get('server') },
  );

  readonly selectedServer = computed((): Server | null => {
    const id = this.selectedServerId();
    return id ? (this.svc.getById(id) ?? null) : null;
  });

  selectServer(server: Server): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { server: server.id },
      queryParamsHandling: 'merge',
    });
  }

  clearSelection(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { server: null },
      queryParamsHandling: 'merge',
    });
  }

  // ── Fleet stats ────────────────────────────────────────────────────────────

  readonly fleet = computed(() => {
    const list   = this.currentFacet === 'gpus' ? this.svc.gpuServers() : this.svc.cpuServers();
    const online  = list.filter((s) => s.status === 'online').length;
    const warning = list.filter((s) => s.status === 'warning').length;
    const offline = list.filter((s) => s.status === 'offline').length;
    const live    = list.filter((s) => s.status !== 'offline');
    const key     = this.currentFacet === 'gpus' ? 'gpu' : 'cpu';
    const avgMain = live.length
      ? Math.round(live.reduce((sum, s) => sum + ((s as unknown as Record<string, MetricSeries>)[key]?.value ?? 0), 0) / live.length)
      : 0;
    return { online, warning, offline, total: list.length, avgMain };
  });

  // ── Zoom dialog ────────────────────────────────────────────────────────────

  readonly activeZoom = signal<ChartZoom | null>(null);

  openZoom(zoom: ChartZoom): void   { this.activeZoom.set(zoom); }
  onDialogClose(v: boolean): void   { if (!v) this.activeZoom.set(null); }

  private readonly liveZoomServer = computed((): Server | null => {
    const z = this.activeZoom();
    return z ? (this.svc.getById(z.serverId) ?? null) : null;
  });

  private readonly liveZoomMetric = computed((): MetricSeries | null => {
    const z = this.activeZoom();
    const s = this.liveZoomServer();
    if (!z || !s) return null;
    return (s as unknown as Record<string, unknown>)[z.metricKey] as MetricSeries | null;
  });

  readonly zoomedValues  = computed((): number[] => this.liveZoomMetric()?.history ?? []);

  readonly zoomedDisplay = computed((): string => {
    const z = this.activeZoom();
    const m = this.liveZoomMetric();
    return z && m ? this.fmt(z.metricKey, m.value) : '';
  });

  readonly zoomedStats = computed(() => {
    const h = this.zoomedValues();
    if (!h.length) return { min: 0, avg: 0, max: 0 };
    return {
      min: Math.min(...h),
      avg: Math.round(h.reduce((a, b) => a + b, 0) / h.length),
      max: Math.max(...h),
    };
  });

  zoomedFmt(n: number): string {
    const z = this.activeZoom();
    return z ? this.fmt(z.metricKey, n) : `${n}%`;
  }

  readonly zoomedGridLabels = computed((): string[] => {
    const z = this.activeZoom();
    const s = this.liveZoomServer();
    if (!z) return ['100%', '50%', '0%'];
    switch (z.metricKey) {
      case 'ram':         return s ? [`${s.ramTotal} GB`, `${s.ramTotal / 2} GB`, '0'] : ['100%', '50%', '0%'];
      case 'vram':        return s ? [`${(s as GpuServer).vramTotal} GB`, `${(s as GpuServer).vramTotal / 2} GB`, '0'] : ['100%', '50%', '0%'];
      case 'temperature': return ['100°C', '50°C', '0°C'];
      case 'power':       return s ? [`${(s as GpuServer).powerMax} W`, `${(s as GpuServer).powerMax / 2} W`, '0'] : ['100%', '50%', '0%'];
      case 'diskRead':
      case 'diskWrite':   return ['500 MB/s', '250 MB/s', '0'];
      case 'netIn':
      case 'netOut':      return ['100 MB/s', '50 MB/s', '0'];
      default:            return ['100%', '50%', '0%'];
    }
  });

  private fmt(key: string, v: number): string {
    const s = this.liveZoomServer();
    switch (key) {
      case 'ram':         return s ? `${Math.round((v / 100) * s.ramTotal)} GB` : `${v}%`;
      case 'vram':        return s ? `${Math.round((v / 100) * (s as GpuServer).vramTotal)} GB` : `${v}%`;
      case 'temperature': return `${v}°C`;
      case 'power':       return s ? `${Math.round((v / 100) * (s as GpuServer).powerMax)} W` : `${v}%`;
      case 'diskRead':
      case 'diskWrite':   return `${Math.round((v / 100) * 500)} MB/s`;
      case 'netIn':
      case 'netOut':      return `${Math.round((v / 100) * 100)} MB/s`;
      default:            return `${v}%`;
    }
  }

  onFacetChange(facet: Facet): void {
    this.currentFacet = facet.id;
    this.clearSelection();
  }
}
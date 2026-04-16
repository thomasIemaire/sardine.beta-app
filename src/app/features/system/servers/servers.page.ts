import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { PageComponent } from '../../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../../shared/components/header-page/header-page.component';
import { ServerRowComponent } from './server-card.component';
import { ServerDashboardComponent } from './server-detail-panel.component';
import { SparklineChartComponent } from './sparkline-chart.component';
import { CpuServer, GpuServer, MetricSeries, Server, ChartZoom } from './server.model';

// ── Mock helpers ────────────────────────────────────────────────────────────

function randomHistory(mean: number, variance: number): number[] {
  const h: number[] = [];
  let v = mean;
  for (let i = 0; i < 60; i++) {
    v = Math.max(0, Math.min(100, v + (Math.random() - 0.5) * variance * 2));
    h.push(Math.round(v));
  }
  return h;
}

function mkMetric(mean: number, variance: number): MetricSeries {
  const history = randomHistory(mean, variance);
  return { value: history[history.length - 1], history };
}

function randomWalk(current: number, mean: number, variance: number): number {
  const next = current + (Math.random() - 0.5) * variance + (mean - current) * 0.08;
  return Math.max(0, Math.min(100, Math.round(next)));
}

function updateMetric(m: MetricSeries, mean: number, variance: number): MetricSeries {
  const value = randomWalk(m.value, mean, variance);
  return { value, history: [...m.history.slice(1), value] };
}

const CPU_MEANS = [
  { cpu: 72, ram: 65, diskRead: 45, diskWrite: 30, netIn: 35, netOut: 25 },
  { cpu: 45, ram: 50, diskRead: 60, diskWrite: 40, netIn: 55, netOut: 45 },
];

const GPU_MEANS = [
  { gpu: 85, vram: 70, temperature: 68, power: 78, cpu: 40, ram: 55 },
  { gpu: 94, vram: 88, temperature: 87, power: 91, cpu: 72, ram: 80 },
];

// ── Component ────────────────────────────────────────────────────────────────

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
              @for (server of cpuServers(); track server.id) {
                <app-server-row [server]="server" (rowClick)="selectServer($event)" />
              }
            }
            @if (currentFacet === 'gpus') {
              @for (server of gpuServers(); track server.id) {
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
export class ServersPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  facets: Facet[] = [
    { id: 'cpus', label: 'CPUs' },
    { id: 'gpus', label: 'GPUs' },
  ];
  currentFacet = 'cpus';

  // ── Selection ──────────────────────────────────────────────────────────────

  readonly selectedServerId = signal<string | null>(null);

  readonly selectedServer = computed((): Server | null => {
    const id = this.selectedServerId();
    if (!id) return null;
    return [...this.cpuServers(), ...this.gpuServers()].find((s) => s.id === id) ?? null;
  });

  selectServer(server: Server): void {
    this.selectedServerId.set(server.id);
  }

  clearSelection(): void {
    this.selectedServerId.set(null);
  }

  // ── Fleet stats ────────────────────────────────────────────────────────────

  readonly fleet = computed(() => {
    const list = this.currentFacet === 'gpus' ? this.gpuServers() : this.cpuServers();
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

  openZoom(zoom: ChartZoom): void {
    this.activeZoom.set(zoom);
  }

  onDialogClose(visible: boolean): void {
    if (!visible) this.activeZoom.set(null);
  }

  private readonly liveZoomServer = computed((): Server | null => {
    const z = this.activeZoom();
    if (!z) return null;
    return [...this.cpuServers(), ...this.gpuServers()].find((s) => s.id === z.serverId) ?? null;
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
      case 'ram':       return s ? [`${s.ramTotal} GB`, `${s.ramTotal / 2} GB`, '0'] : ['100%', '50%', '0%'];
      case 'vram':      return s ? [`${(s as GpuServer).vramTotal} GB`, `${(s as GpuServer).vramTotal / 2} GB`, '0'] : ['100%', '50%', '0%'];
      case 'temperature': return ['100°C', '50°C', '0°C'];
      case 'power':     return s ? [`${(s as GpuServer).powerMax} W`, `${(s as GpuServer).powerMax / 2} W`, '0'] : ['100%', '50%', '0%'];
      case 'diskRead':
      case 'diskWrite': return ['500 MB/s', '250 MB/s', '0'];
      case 'netIn':
      case 'netOut':    return ['100 MB/s', '50 MB/s', '0'];
      default:          return ['100%', '50%', '0%'];
    }
  });

  private fmt(key: string, v: number): string {
    const s = this.liveZoomServer();
    switch (key) {
      case 'ram':    return s ? `${Math.round((v / 100) * s.ramTotal)} GB` : `${v}%`;
      case 'vram':   return s ? `${Math.round((v / 100) * (s as GpuServer).vramTotal)} GB` : `${v}%`;
      case 'temperature': return `${v}°C`;
      case 'power':  return s ? `${Math.round((v / 100) * (s as GpuServer).powerMax)} W` : `${v}%`;
      case 'diskRead':
      case 'diskWrite': return `${Math.round((v / 100) * 500)} MB/s`;
      case 'netIn':
      case 'netOut': return `${Math.round((v / 100) * 100)} MB/s`;
      default:       return `${v}%`;
    }
  }

  // ── CPU mock data ──────────────────────────────────────────────────────────

  readonly cpuServers = signal<CpuServer[]>([
    {
      type: 'cpu', id: 'cpu-1', name: 'compute-node-01', status: 'online',
      location: 'Paris, FR', uptime: '14j 6h 23m',
      cpuModel: 'Intel Xeon Gold 6338', coreCount: 32, ramTotal: 512,
      cpu:       mkMetric(CPU_MEANS[0].cpu,       15),
      ram:       mkMetric(CPU_MEANS[0].ram,        8),
      diskRead:  mkMetric(CPU_MEANS[0].diskRead,  20),
      diskWrite: mkMetric(CPU_MEANS[0].diskWrite, 15),
      netIn:     mkMetric(CPU_MEANS[0].netIn,     18),
      netOut:    mkMetric(CPU_MEANS[0].netOut,    12),
    },
    {
      type: 'cpu', id: 'cpu-2', name: 'compute-node-02', status: 'online',
      location: 'Paris, FR', uptime: '7j 14h 5m',
      cpuModel: 'AMD EPYC 7763', coreCount: 64, ramTotal: 1024,
      cpu:       mkMetric(CPU_MEANS[1].cpu,       18),
      ram:       mkMetric(CPU_MEANS[1].ram,        9),
      diskRead:  mkMetric(CPU_MEANS[1].diskRead,  22),
      diskWrite: mkMetric(CPU_MEANS[1].diskWrite, 16),
      netIn:     mkMetric(CPU_MEANS[1].netIn,     20),
      netOut:    mkMetric(CPU_MEANS[1].netOut,    14),
    },
    {
      type: 'cpu', id: 'cpu-3', name: 'compute-node-03', status: 'offline',
      location: 'Lyon, FR', uptime: '—',
      cpuModel: 'Intel Xeon Silver 4316', coreCount: 20, ramTotal: 256,
      cpu: mkMetric(0,0), ram: mkMetric(0,0), diskRead: mkMetric(0,0),
      diskWrite: mkMetric(0,0), netIn: mkMetric(0,0), netOut: mkMetric(0,0),
    },
  ]);

  // ── GPU mock data ──────────────────────────────────────────────────────────

  readonly gpuServers = signal<GpuServer[]>([
    {
      type: 'gpu', id: 'gpu-1', name: 'gpu-node-01', status: 'online',
      location: 'Paris, FR', uptime: '3j 2h 15m',
      gpuModel: 'NVIDIA H100 80GB', gpuCount: 4, vramTotal: 320, ramTotal: 512, powerMax: 1600,
      gpu:         mkMetric(GPU_MEANS[0].gpu,         12),
      vram:        mkMetric(GPU_MEANS[0].vram,          8),
      temperature: mkMetric(GPU_MEANS[0].temperature,  4),
      power:       mkMetric(GPU_MEANS[0].power,        10),
      cpu:         mkMetric(GPU_MEANS[0].cpu,          14),
      ram:         mkMetric(GPU_MEANS[0].ram,           9),
    },
    {
      type: 'gpu', id: 'gpu-2', name: 'gpu-node-02', status: 'warning',
      location: 'Paris, FR', uptime: '1j 8h 44m',
      gpuModel: 'NVIDIA A100 40GB', gpuCount: 8, vramTotal: 320, ramTotal: 256, powerMax: 3200,
      gpu:         mkMetric(GPU_MEANS[1].gpu,          5),
      vram:        mkMetric(GPU_MEANS[1].vram,          4),
      temperature: mkMetric(GPU_MEANS[1].temperature,  3),
      power:       mkMetric(GPU_MEANS[1].power,         5),
      cpu:         mkMetric(GPU_MEANS[1].cpu,          14),
      ram:         mkMetric(GPU_MEANS[1].ram,           7),
    },
    {
      type: 'gpu', id: 'gpu-3', name: 'gpu-node-03', status: 'offline',
      location: 'Marseille, FR', uptime: '—',
      gpuModel: 'NVIDIA RTX 4090', gpuCount: 2, vramTotal: 48, ramTotal: 128, powerMax: 900,
      gpu: mkMetric(0,0), vram: mkMetric(0,0), temperature: mkMetric(0,0),
      power: mkMetric(0,0), cpu: mkMetric(0,0), ram: mkMetric(0,0),
    },
  ]);

  // ── Real-time tick ────────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = setInterval(() => this.tick(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(id));
  }

  private tick(): void {
    this.cpuServers.update((servers) =>
      servers.map((s, i) => {
        if (s.status === 'offline') return s;
        const m = CPU_MEANS[i];
        return {
          ...s,
          cpu:       updateMetric(s.cpu,       m.cpu,       15),
          ram:       updateMetric(s.ram,        m.ram,        6),
          diskRead:  updateMetric(s.diskRead,   m.diskRead,  22),
          diskWrite: updateMetric(s.diskWrite,  m.diskWrite, 16),
          netIn:     updateMetric(s.netIn,      m.netIn,     20),
          netOut:    updateMetric(s.netOut,     m.netOut,    14),
        };
      })
    );

    this.gpuServers.update((servers) =>
      servers.map((s, i) => {
        if (s.status === 'offline') return s;
        const m = GPU_MEANS[i];
        return {
          ...s,
          gpu:         updateMetric(s.gpu,         m.gpu,         10),
          vram:        updateMetric(s.vram,         m.vram,         5),
          temperature: updateMetric(s.temperature,  m.temperature,  3),
          power:       updateMetric(s.power,        m.power,        8),
          cpu:         updateMetric(s.cpu,          m.cpu,         14),
          ram:         updateMetric(s.ram,          m.ram,          7),
        };
      })
    );
  }

  onFacetChange(facet: Facet): void {
    this.currentFacet = facet.id;
    this.clearSelection();
  }
}
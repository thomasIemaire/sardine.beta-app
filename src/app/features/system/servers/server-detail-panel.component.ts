import { Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SparklineChartComponent } from './sparkline-chart.component';
import { Server, CpuServer, GpuServer, ChartZoom } from './server.model';

interface Panel {
  key: string;
  label: string;
  color: string;
  gridLabels:    () => string[];
  getValue:      () => number;
  getHistory:    () => number[];
  getMainLine:   () => string;
  getSubLine:    () => string;
  getBarColor:   () => string;
}

function hStats(h: number[]): { min: number; avg: number; max: number } {
  if (!h.length) return { min: 0, avg: 0, max: 0 };
  return {
    min: Math.min(...h),
    avg: Math.round(h.reduce((a, b) => a + b, 0) / h.length),
    max: Math.max(...h),
  };
}

@Component({
  selector: 'app-server-dashboard',
  imports: [ButtonModule, TagModule, SparklineChartComponent],
  template: `
    <div class="dashboard">

      <!-- ── Top bar ── -->
      <div class="dash-topbar">
        <div class="dash-nav">
          <p-button
            icon="fa-regular fa-arrow-left"
            label="Retour"
            severity="secondary"
            [text]="true"
            size="small"
            rounded
            (onClick)="close.emit()"
          />
          <span class="nav-sep">/</span>
          <span class="dash-title">
            <span class="dot" [class]="'dot-' + server().status"></span>
            {{ server().name }}
          </span>
        </div>
        <div class="dash-right">
          <p-tag [value]="server().type.toUpperCase()" severity="secondary" />
          <p-tag [value]="statusLabel()" [severity]="statusSeverity()" />
        </div>
      </div>

      <!-- ── Specs strip ── -->
      <div class="specs-strip">
        @if (server().type === 'gpu') {
          <span>{{ asGpu().gpuModel }}</span>
          <span class="sep">·</span>
          <span>×{{ asGpu().gpuCount }}</span>
          <span class="sep">·</span>
          <span>{{ asGpu().vramTotal }} GB VRAM</span>
        } @else {
          <span>{{ asCpu().cpuModel }}</span>
          <span class="sep">·</span>
          <span>{{ asCpu().coreCount }} cœurs</span>
          <span class="sep">·</span>
          <span>{{ server().ramTotal }} GB RAM</span>
        }
        <span class="sep">·</span>
        <span><i class="fa-regular fa-location-dot"></i> {{ server().location }}</span>
        @if (server().status !== 'offline') {
          <span class="sep">·</span>
          <span><i class="fa-regular fa-clock"></i> Actif {{ server().uptime }}</span>
        }
      </div>

      <!-- ── Panels grid ── -->
      <div class="panels-area">
        @if (server().status !== 'offline') {
          <div class="panels-grid">
            @for (p of panels(); track p.key) {
              <div class="metric-panel" [style.--pc]="p.getBarColor()" (click)="doZoom(p)">

                <div class="panel-label">{{ p.label }}</div>

                <!-- Big value -->
                <div class="panel-value">
                  <span class="val-main" [style.color]="p.getBarColor()">{{ p.getMainLine() }}</span>
                  @if (p.getSubLine()) {
                    <span class="val-sub">{{ p.getSubLine() }}</span>
                  }
                </div>

                <!-- min / avg / max -->
                @let st = computeStats(p.getHistory());
                <div class="panel-stats">
                  <div class="stat-item">
                    <span class="stat-k">MIN</span>
                    <span class="stat-v">{{ formatStat(p.key, st.min) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-k">MOY</span>
                    <span class="stat-v">{{ formatStat(p.key, st.avg) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-k">MAX</span>
                    <span class="stat-v">{{ formatStat(p.key, st.max) }}</span>
                  </div>
                </div>

                <!-- Bar -->
                <div class="panel-bar-track">
                  <div class="panel-bar-fill" [style.width]="p.getValue() + '%'" [style.background]="p.getBarColor()"></div>
                </div>

                <!-- Chart -->
                <app-sparkline [values]="p.getHistory()" [color]="p.color" [chartHeight]="72" [showGrid]="true" [gridLabels]="p.gridLabels()" />

                <!-- Expand hint -->
                <span class="panel-hint"><i class="fa-regular fa-expand"></i></span>

              </div>
            }
          </div>
        } @else {
          <div class="offline-state">
            <i class="fa-regular fa-circle-xmark"></i>
            <p>Serveur hors ligne</p>
            <span>Aucune télémétrie disponible</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

    .dashboard {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    /* ── Top bar ── */
    .dash-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 1.5rem 0.5rem 1rem;
      border-bottom: 1px solid var(--surface-border);
      flex-shrink: 0;
      gap: 1rem;
    }

    .dash-nav {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .nav-sep { color: var(--p-text-muted-color); opacity: 0.35; }
    }

    .dash-title {
      font-size: 0.9rem;
      font-weight: 600;
      font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .dash-right {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;

      &.dot-online  { background: #10b981; box-shadow: 0 0 0 3px #10b98120; }
      &.dot-warning { background: #f59e0b; box-shadow: 0 0 0 3px #f59e0b20; }
      &.dot-offline { background: #6b7280; }
    }

    /* ── Specs strip ── */
    .specs-strip {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.3rem 0.5rem;
      padding: 0.5rem 1.5rem;
      border-bottom: 1px solid var(--surface-border);
      font-size: 0.7rem;
      color: var(--p-text-muted-color);
      flex-shrink: 0;
      background: var(--p-surface-section, var(--p-surface-50, rgba(128,128,128,0.02)));

      i { margin-right: 0.2rem; font-size: 0.62rem; }
      .sep { opacity: 0.28; }
    }

    /* ── Panels area ── */
    .panels-area {
      flex: 1;
      overflow-y: auto;
      background: var(--p-surface-ground, var(--p-surface-100, rgba(128,128,128,0.03)));
      padding: 1.5rem;
    }

    .panels-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    /* ── Metric panel ── */
    .metric-panel {
      position: relative;
      background: var(--p-surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 10px;
      padding: 1.25rem 1.25rem 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        background: var(--pc, #818cf8);
        border-radius: 10px 10px 0 0;
      }

      &:hover {
        border-color: var(--pc, #818cf8);
        box-shadow: 0 4px 16px rgba(0,0,0,0.06);

        .panel-hint { opacity: 1; }
      }
    }

    .panel-label {
      font-size: 0.62rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--p-text-muted-color);
    }

    /* Big centered value */
    .panel-value {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.1rem;
      flex: 1;
      justify-content: center;
      padding: 0.25rem 0;

      .val-main {
        font-size: 2.25rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }

      .val-sub {
        font-size: 0.78rem;
        color: var(--p-text-muted-color);
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }
    }

    /* Stats row */
    .panel-stats {
      display: flex;
      gap: 1rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;

      .stat-k {
        font-size: 0.55rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--p-text-muted-color);
        opacity: 0.6;
      }

      .stat-v {
        font-size: 0.72rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
    }

    /* Progress bar */
    .panel-bar-track {
      height: 2px;
      background: rgba(128,128,128,0.1);
      border-radius: 1px;
      overflow: hidden;
    }

    .panel-bar-fill {
      height: 100%;
      border-radius: 1px;
      transition: width 0.6s ease;
    }

    /* Expand hint */
    .panel-hint {
      position: absolute;
      top: 0.75rem;
      right: 0.875rem;
      font-size: 0.6rem;
      color: var(--p-text-muted-color);
      opacity: 0;
      transition: opacity 0.15s;
    }

    /* ── Offline ── */
    .offline-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 0.5rem;
      color: var(--p-text-muted-color);

      i    { font-size: 2rem; }
      p    { margin: 0; font-weight: 600; }
      span { font-size: 0.8rem; }
    }
  `,
})
export class ServerDashboardComponent {
  readonly server    = input.required<Server>();
  readonly close     = output<void>();
  readonly chartZoom = output<ChartZoom>();

  readonly asGpu = computed(() => this.server() as GpuServer);
  readonly asCpu = computed(() => this.server() as CpuServer);

  readonly statusLabel = computed((): string => {
    switch (this.server().status) {
      case 'online':  return 'En ligne';
      case 'warning': return 'Alerte';
      case 'offline': return 'Hors ligne';
    }
  });

  readonly statusSeverity = computed((): 'success' | 'warn' | 'secondary' => {
    switch (this.server().status) {
      case 'online':  return 'success';
      case 'warning': return 'warn';
      case 'offline': return 'secondary';
    }
  });

  readonly panels = computed((): Panel[] => {
    const s = this.server();

    if (s.type === 'gpu') {
      const g = s as GpuServer;
      return [
        {
          key: 'gpu', label: 'Utilisation GPU', color: '#818cf8',
          gridLabels:  () => ['100%', '50%', '0%'],
          getValue:    () => g.gpu.value,
          getHistory:  () => g.gpu.history,
          getMainLine: () => `${g.gpu.value}%`,
          getSubLine:  () => '',
          getBarColor: () => '#818cf8',
        },
        {
          key: 'vram', label: 'VRAM', color: '#a78bfa',
          gridLabels:  () => [`${g.vramTotal} GB`, `${g.vramTotal / 2} GB`, '0'],
          getValue:    () => g.vram.value,
          getHistory:  () => g.vram.history,
          getMainLine: () => `${Math.round((g.vram.value / 100) * g.vramTotal)} GB`,
          getSubLine:  () => `/ ${g.vramTotal} GB`,
          getBarColor: () => '#a78bfa',
        },
        {
          key: 'temperature', label: 'Température', color: '#fb923c',
          gridLabels:  () => ['100°C', '50°C', '0°C'],
          getValue:    () => g.temperature.value,
          getHistory:  () => g.temperature.history,
          getMainLine: () => `${g.temperature.value}°C`,
          getSubLine:  () => g.temperature.value > 80 ? '⚠ Élevée' : '',
          getBarColor: () => g.temperature.value > 80 ? '#ef4444' : '#fb923c',
        },
        {
          key: 'power', label: 'Puissance', color: '#facc15',
          gridLabels:  () => [`${g.powerMax} W`, `${g.powerMax / 2} W`, '0'],
          getValue:    () => g.power.value,
          getHistory:  () => g.power.history,
          getMainLine: () => `${Math.round((g.power.value / 100) * g.powerMax)} W`,
          getSubLine:  () => `/ ${g.powerMax} W`,
          getBarColor: () => '#facc15',
        },
        {
          key: 'cpu', label: 'CPU (hôte)', color: '#818cf8',
          gridLabels:  () => ['100%', '50%', '0%'],
          getValue:    () => s.cpu.value,
          getHistory:  () => s.cpu.history,
          getMainLine: () => `${s.cpu.value}%`,
          getSubLine:  () => '',
          getBarColor: () => '#818cf8',
        },
        {
          key: 'ram', label: 'RAM (hôte)', color: '#34d399',
          gridLabels:  () => [`${s.ramTotal} GB`, `${s.ramTotal / 2} GB`, '0'],
          getValue:    () => s.ram.value,
          getHistory:  () => s.ram.history,
          getMainLine: () => `${Math.round((s.ram.value / 100) * s.ramTotal)} GB`,
          getSubLine:  () => `/ ${s.ramTotal} GB`,
          getBarColor: () => '#34d399',
        },
      ];
    }

    const c = s as CpuServer;
    return [
      {
        key: 'cpu', label: 'CPU', color: '#818cf8',
        gridLabels:  () => ['100%', '50%', '0%'],
        getValue:    () => s.cpu.value,
        getHistory:  () => s.cpu.history,
        getMainLine: () => `${s.cpu.value}%`,
        getSubLine:  () => '',
        getBarColor: () => '#818cf8',
      },
      {
        key: 'ram', label: 'RAM', color: '#34d399',
        gridLabels:  () => [`${s.ramTotal} GB`, `${s.ramTotal / 2} GB`, '0'],
        getValue:    () => s.ram.value,
        getHistory:  () => s.ram.history,
        getMainLine: () => `${Math.round((s.ram.value / 100) * s.ramTotal)} GB`,
        getSubLine:  () => `/ ${s.ramTotal} GB`,
        getBarColor: () => '#34d399',
      },
      {
        key: 'diskRead', label: 'Lecture disque', color: '#22d3ee',
        gridLabels:  () => ['500 MB/s', '250 MB/s', '0'],
        getValue:    () => c.diskRead.value,
        getHistory:  () => c.diskRead.history,
        getMainLine: () => `${Math.round((c.diskRead.value / 100) * 500)} MB/s`,
        getSubLine:  () => '',
        getBarColor: () => '#22d3ee',
      },
      {
        key: 'diskWrite', label: 'Écriture disque', color: '#22d3ee',
        gridLabels:  () => ['500 MB/s', '250 MB/s', '0'],
        getValue:    () => c.diskWrite.value,
        getHistory:  () => c.diskWrite.history,
        getMainLine: () => `${Math.round((c.diskWrite.value / 100) * 500)} MB/s`,
        getSubLine:  () => '',
        getBarColor: () => '#22d3ee',
      },
      {
        key: 'netIn', label: 'Réseau entrée', color: '#a78bfa',
        gridLabels:  () => ['100 MB/s', '50 MB/s', '0'],
        getValue:    () => c.netIn.value,
        getHistory:  () => c.netIn.history,
        getMainLine: () => `${Math.round((c.netIn.value / 100) * 100)} MB/s`,
        getSubLine:  () => '',
        getBarColor: () => '#a78bfa',
      },
      {
        key: 'netOut', label: 'Réseau sortie', color: '#a78bfa',
        gridLabels:  () => ['100 MB/s', '50 MB/s', '0'],
        getValue:    () => c.netOut.value,
        getHistory:  () => c.netOut.history,
        getMainLine: () => `${Math.round((c.netOut.value / 100) * 100)} MB/s`,
        getSubLine:  () => '',
        getBarColor: () => '#a78bfa',
      },
    ];
  });

  computeStats = hStats;

  formatStat(key: string, normalized: number): string {
    const s = this.server();
    switch (key) {
      case 'ram':    return `${Math.round((normalized / 100) * s.ramTotal)} GB`;
      case 'vram':   return `${Math.round((normalized / 100) * (s as GpuServer).vramTotal)} GB`;
      case 'temperature': return `${normalized}°C`;
      case 'power':  return `${Math.round((normalized / 100) * (s as GpuServer).powerMax)} W`;
      case 'diskRead':
      case 'diskWrite': return `${Math.round((normalized / 100) * 500)} MB/s`;
      case 'netIn':
      case 'netOut': return `${Math.round((normalized / 100) * 100)} MB/s`;
      default:       return `${normalized}%`;
    }
  }

  doZoom(p: Panel): void {
    this.chartZoom.emit({
      serverId:   this.server().id,
      serverType: this.server().type,
      metricKey:  p.key,
      label:      p.label,
      color:      p.color,
    });
  }
}
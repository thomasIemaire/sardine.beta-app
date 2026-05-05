import { Component, computed, input, output } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { SparklineChartComponent } from './sparkline-chart.component';
import { Server, CpuServer, GpuServer } from './server.model';

@Component({
  selector: 'app-server-row',
  imports: [TagModule, SparklineChartComponent],
  template: `
    <div class="server-row" [class.is-offline]="isOffline()" (click)="onRowClick()">

      <!-- Status dot -->
      <span class="dot" [class]="'dot-' + server().status"></span>

      <!-- Identity -->
      <div class="row-identity">
        <span class="row-name">{{ server().name }}</span>
        <span class="row-hw">{{ hwLine() }}</span>
      </div>

      <!-- Col 3 : sparkline -->
      @if (!isOffline()) {
        <div class="row-chart">
          <span class="row-chart-label">{{ mainLabel() }}</span>
          <app-sparkline [values]="mainHistory()" [color]="mainColor()" [chartHeight]="30" />
        </div>
      } @else {
        <span class="row-offline-info">Aucune donnée</span>
      }

      <!-- Col 4 : valeur principale -->
      @if (!isOffline()) {
        <span class="row-value" [style.color]="mainColor()">{{ mainValue() }}</span>
      } @else {
        <span></span>
      }

      <!-- Col 5 : métriques secondaires -->
      @if (!isOffline()) {
        <div class="row-secondary">{{ secondaryLine() }}</div>
      } @else {
        <span></span>
      }

      <!-- Meta: location · uptime -->
      <div class="row-meta">
        <span><i class="fa-regular fa-location-dot"></i> {{ server().location }}</span>
        @if (!isOffline()) {
          <span class="uptime"><i class="fa-regular fa-clock"></i> {{ server().uptime }}</span>
        }
      </div>

      <!-- Badges -->
      <div class="row-badges">
        <p-tag [value]="server().type.toUpperCase()" severity="secondary" />
        <p-tag [value]="statusLabel()" [severity]="statusSeverity()" />
      </div>

      <!-- Chevron -->
      @if (!isOffline()) {
        <i class="fa-regular fa-chevron-right row-chevron"></i>
      } @else {
        <span style="width: 12px"></span>
      }

    </div>
  `,
  styles: `
    .server-row {
      display: grid;
      grid-template-columns: 10px minmax(0, 1fr) 160px 72px minmax(0, 1fr) 160px 130px 14px;
      align-items: center;
      gap: 1.25rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--surface-border);
      cursor: pointer;
      transition: background 0.1s;
      min-height: 64px;

      &:last-child { border-bottom: none; }

      &:hover:not(.is-offline) {
        background: var(--p-surface-hover, rgba(128,128,128,0.04));

        .row-chevron { opacity: 1; transform: translateX(2px); }
      }

      &.is-offline {
        opacity: 0.45;
        cursor: default;
      }
    }

    /* Status dot */
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      align-self: center;

      &.dot-online  { background: #10b981; box-shadow: 0 0 0 3px #10b98120; }
      &.dot-warning { background: #f59e0b; box-shadow: 0 0 0 3px #f59e0b20; }
      &.dot-offline { background: #6b7280; }
    }

    /* Identity */
    .row-identity {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      overflow: hidden;

      .row-name {
        font-weight: 600;
        font-size: 0.85rem;
        font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .row-hw {
        font-size: 0.68rem;
        color: var(--p-text-muted-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    /* Sparkline */
    .row-chart {
      align-self: center;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;

      .row-chart-label {
        font-size: 0.6rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        color: var(--p-text-muted-color);
        text-transform: uppercase;
        line-height: 1;
      }
    }

    /* Main metric value */
    .row-value {
      font-size: 1.05rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    /* Offline placeholder */
    .row-offline-info {
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
      font-style: italic;
    }

    /* Secondary metrics text */
    .row-secondary {
      font-size: 0.68rem;
      color: var(--p-text-muted-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Location + uptime */
    .row-meta {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.68rem;
      color: var(--p-text-muted-color);

      i { margin-right: 0.2rem; font-size: 0.6rem; }

      .uptime { opacity: 0.75; }
    }

    /* Badges */
    .row-badges {
      display: flex;
      gap: 0.3rem;
      flex-shrink: 0;
    }

    /* Chevron */
    .row-chevron {
      font-size: 0.65rem;
      color: var(--p-text-muted-color);
      opacity: 0;
      transition: opacity 0.15s, transform 0.15s;
    }
  `,
})
export class ServerRowComponent {
  readonly server   = input.required<Server>();
  readonly rowClick = output<Server>();

  readonly isOffline = computed(() => this.server().status === 'offline');

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

  readonly hwLine = computed((): string => {
    const s = this.server();
    if (s.type === 'gpu') {
      const g = s as GpuServer;
      return `${g.gpuModel} · ×${g.gpuCount} · ${g.vramTotal} GB VRAM`;
    }
    const c = s as CpuServer;
    return `${c.cpuModel} · ${c.coreCount} cœurs · ${s.ramTotal} GB RAM`;
  });

  readonly mainLabel = computed((): string =>
    this.server().type === 'gpu' ? 'GPU' : 'CPU'
  );

  readonly mainHistory = computed((): number[] => {
    const s = this.server();
    return s.type === 'gpu' ? (s as GpuServer).gpu.history : s.cpu.history;
  });

  readonly mainColor = computed((): string =>
    this.server().type === 'gpu' ? '#818cf8' : '#818cf8'
  );

  readonly mainValue = computed((): string => {
    const s = this.server();
    const v = s.type === 'gpu' ? (s as GpuServer).gpu.value : s.cpu.value;
    return `${v}%`;
  });

  readonly secondaryLine = computed((): string => {
    const s = this.server();
    if (s.type === 'gpu') {
      const g = s as GpuServer;
      const vram = Math.round((g.vram.value / 100) * g.vramTotal);
      const temp = g.temperature.value;
      const pwr  = Math.round((g.power.value / 100) * g.powerMax);
      return `VRAM ${vram}/${g.vramTotal} GB  ·  ${temp}°C  ·  ${pwr} W`;
    }
    const c = s as CpuServer;
    const ram  = Math.round((s.ram.value / 100) * s.ramTotal);
    const diskR = Math.round((c.diskRead.value / 100) * 500);
    const diskW = Math.round((c.diskWrite.value / 100) * 500);
    return `RAM ${ram}/${s.ramTotal} GB  ·  Disque R ${diskR} / W ${diskW} MB/s`;
  });

  onRowClick(): void {
    if (this.isOffline()) return;
    this.rowClick.emit(this.server());
  }
}
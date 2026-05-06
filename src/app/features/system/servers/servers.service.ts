import { computed, Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, interval, startWith, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CpuServer,
  GpuServer,
  MetricSeries,
  Server,
  ServerHealth,
  ServerStatsDto,
  ServerStatus,
  ServerType,
} from './server.model';

const HISTORY_SIZE = 60;
const POLL_INTERVAL_MS = 2000;

function emptyMetric(): MetricSeries {
  return { value: 0, history: [] };
}

function pushMetric(m: MetricSeries, value: number): MetricSeries {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const next = m.history.length >= HISTORY_SIZE
    ? [...m.history.slice(1), v]
    : [...m.history, v];
  return { value: v, history: next };
}

function mapStatus(h: ServerHealth): ServerStatus {
  switch (h) {
    case 'ok':          return 'online';
    case 'unreachable': return 'offline';
    case 'error':       return 'warning';
  }
}

function formatUptime(uptimeS: number | null): string {
  if (uptimeS === null) return '—';
  const total = Math.max(0, Math.floor(uptimeS));
  const j = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (j > 0) return `${j}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function isGpuType(type: ServerType): boolean {
  return type === 'gpu_runpod' || type === 'gpu_local';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

@Injectable()
export class ServersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/servers`;

  readonly cpuServers = signal<CpuServer[]>([]);
  readonly gpuServers = signal<GpuServer[]>([]);

  readonly allServers = computed((): Server[] => [
    ...this.cpuServers(),
    ...this.gpuServers(),
  ]);

  getById(id: string): Server | undefined {
    return this.allServers().find((s) => s.id === id);
  }

  constructor() {
    interval(POLL_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() => this.http.get<ServerStatsDto[]>(`${this.base}/stats`).pipe(
        catchError(() => EMPTY),
      )),
      takeUntilDestroyed(),
    ).subscribe((stats) => this.applyStats(stats));
  }

  private applyStats(stats: ServerStatsDto[]): void {
    const prevCpus = new Map(this.cpuServers().map((s) => [s.id, s]));
    const prevGpus = new Map(this.gpuServers().map((s) => [s.id, s]));

    const cpus: CpuServer[] = [];
    const gpus: GpuServer[] = [];

    for (const stat of stats) {
      if (isGpuType(stat.server_type)) {
        const prev = prevGpus.get(stat.server_id) ?? this.makeGpuSkeleton(stat);
        gpus.push(this.mergeGpu(prev, stat));
      } else {
        const prev = prevCpus.get(stat.server_id) ?? this.makeCpuSkeleton(stat);
        cpus.push(this.mergeCpu(prev, stat));
      }
    }

    this.cpuServers.set(cpus);
    this.gpuServers.set(gpus);
  }

  private makeGpuSkeleton(stat: ServerStatsDto): GpuServer {
    return {
      type: 'gpu',
      id: stat.server_id,
      name: stat.server_name,
      status: 'offline',
      location: '—',
      uptime: '—',
      gpuModel: '—',
      gpuCount: 0,
      vramTotal: 0,
      ramTotal: 0,
      powerMax: 0,
      gpu: emptyMetric(),
      vram: emptyMetric(),
      temperature: emptyMetric(),
      power: emptyMetric(),
      cpu: emptyMetric(),
      ram: emptyMetric(),
    };
  }

  private makeCpuSkeleton(stat: ServerStatsDto): CpuServer {
    return {
      type: 'cpu',
      id: stat.server_id,
      name: stat.server_name,
      status: 'offline',
      location: '—',
      uptime: '—',
      cpuModel: '—',
      coreCount: 0,
      ramTotal: 0,
      cpu: emptyMetric(),
      ram: emptyMetric(),
      diskRead: emptyMetric(),
      diskWrite: emptyMetric(),
      netIn: emptyMetric(),
      netOut: emptyMetric(),
    };
  }

  private mergeGpu(prev: GpuServer, stat: ServerStatsDto): GpuServer {
    const status = mapStatus(stat.health);
    const uptime = formatUptime(stat.uptime_s);

    if (stat.health !== 'ok' || !stat.system || stat.gpus.length === 0) {
      return { ...prev, name: stat.server_name, status, uptime };
    }

    const totalVramTotal = stat.gpus.reduce((sum, g) => sum + g.vram_total_mb, 0);
    const totalVramUsed  = stat.gpus.reduce((sum, g) => sum + g.vram_used_mb, 0);
    const totalPowerDraw = stat.gpus.reduce((sum, g) => sum + g.power_draw_w, 0);
    const totalPowerMax  = stat.gpus.reduce((sum, g) => sum + g.power_limit_w, 0);
    const avgGpuUtil     = stat.gpus.reduce((sum, g) => sum + g.gpu_util_pct, 0) / stat.gpus.length;
    const avgTempC       = stat.gpus.reduce((sum, g) => sum + g.temperature_c, 0) / stat.gpus.length;

    const vramPct  = totalVramTotal > 0 ? (totalVramUsed  / totalVramTotal) * 100 : 0;
    const powerPct = totalPowerMax  > 0 ? (totalPowerDraw / totalPowerMax)  * 100 : 0;

    return {
      ...prev,
      name: stat.server_name,
      status,
      uptime,
      gpuModel: stat.gpus[0].name,
      gpuCount: stat.gpus.length,
      vramTotal: round1(totalVramTotal / 1024),
      ramTotal: round1(stat.system.memory.total_gb),
      powerMax: Math.round(totalPowerMax),
      gpu:         pushMetric(prev.gpu,         avgGpuUtil),
      vram:        pushMetric(prev.vram,        vramPct),
      temperature: pushMetric(prev.temperature, avgTempC),
      power:       pushMetric(prev.power,       powerPct),
      cpu:         pushMetric(prev.cpu,         stat.system.cpu.percent),
      ram:         pushMetric(prev.ram,         stat.system.memory.percent),
    };
  }

  private mergeCpu(prev: CpuServer, stat: ServerStatsDto): CpuServer {
    const status = mapStatus(stat.health);
    const uptime = formatUptime(stat.uptime_s);

    if (stat.health !== 'ok' || !stat.system) {
      return { ...prev, name: stat.server_name, status, uptime };
    }

    return {
      ...prev,
      name: stat.server_name,
      status,
      uptime,
      // platform.machine est l'archi (x86_64), pas le modèle CPU.
      // À remplacer quand le backend exposera platform.cpu_brand.
      cpuModel: prev.cpuModel === '—' ? '—' : prev.cpuModel,
      coreCount: stat.system.cpu.count_physical,
      ramTotal: round1(stat.system.memory.total_gb),
      cpu: pushMetric(prev.cpu, stat.system.cpu.percent),
      ram: pushMetric(prev.ram, stat.system.memory.percent),
      // I/O disque/réseau pas encore fournis par le backend (deltas psutil à ajouter).
      diskRead:  prev.diskRead,
      diskWrite: prev.diskWrite,
      netIn:     prev.netIn,
      netOut:    prev.netOut,
    };
  }
}

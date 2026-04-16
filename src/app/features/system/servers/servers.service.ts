import { computed, Injectable, signal } from '@angular/core';
import { CpuServer, GpuServer, MetricSeries, Server } from './server.model';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Mock means ───────────────────────────────────────────────────────────────

const CPU_MEANS = [
  { cpu: 72, ram: 65, diskRead: 45, diskWrite: 30, netIn: 35, netOut: 25 },
  { cpu: 45, ram: 50, diskRead: 60, diskWrite: 40, netIn: 55, netOut: 45 },
];

const GPU_MEANS = [
  { gpu: 85, vram: 70, temperature: 68, power: 78, cpu: 40, ram: 55 },
  { gpu: 94, vram: 88, temperature: 87, power: 91, cpu: 72, ram: 80 },
];

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ServersService {

  readonly cpuServers = signal<CpuServer[]>([
    {
      type: 'cpu', id: 'cpu-1', name: 'compute-node-01', status: 'online',
      location: 'Paris, FR', uptime: '14j 6h 23m',
      cpuModel: 'Intel Xeon Gold 6338', coreCount: 32, ramTotal: 512,
      cpu:       mkMetric(CPU_MEANS[0].cpu,       15),
      ram:       mkMetric(CPU_MEANS[0].ram,         8),
      diskRead:  mkMetric(CPU_MEANS[0].diskRead,   20),
      diskWrite: mkMetric(CPU_MEANS[0].diskWrite,  15),
      netIn:     mkMetric(CPU_MEANS[0].netIn,      18),
      netOut:    mkMetric(CPU_MEANS[0].netOut,     12),
    },
    {
      type: 'cpu', id: 'cpu-2', name: 'compute-node-02', status: 'online',
      location: 'Paris, FR', uptime: '7j 14h 5m',
      cpuModel: 'AMD EPYC 7763', coreCount: 64, ramTotal: 1024,
      cpu:       mkMetric(CPU_MEANS[1].cpu,       18),
      ram:       mkMetric(CPU_MEANS[1].ram,         9),
      diskRead:  mkMetric(CPU_MEANS[1].diskRead,   22),
      diskWrite: mkMetric(CPU_MEANS[1].diskWrite,  16),
      netIn:     mkMetric(CPU_MEANS[1].netIn,      20),
      netOut:    mkMetric(CPU_MEANS[1].netOut,     14),
    },
    {
      type: 'cpu', id: 'cpu-3', name: 'compute-node-03', status: 'offline',
      location: 'Lyon, FR', uptime: '—',
      cpuModel: 'Intel Xeon Silver 4316', coreCount: 20, ramTotal: 256,
      cpu: mkMetric(0, 0), ram: mkMetric(0, 0), diskRead: mkMetric(0, 0),
      diskWrite: mkMetric(0, 0), netIn: mkMetric(0, 0), netOut: mkMetric(0, 0),
    },
  ]);

  readonly gpuServers = signal<GpuServer[]>([
    {
      type: 'gpu', id: 'gpu-1', name: 'gpu-node-01', status: 'online',
      location: 'Paris, FR', uptime: '3j 2h 15m',
      gpuModel: 'NVIDIA H100 80GB', gpuCount: 4, vramTotal: 320, ramTotal: 512, powerMax: 1600,
      gpu:         mkMetric(GPU_MEANS[0].gpu,          12),
      vram:        mkMetric(GPU_MEANS[0].vram,           8),
      temperature: mkMetric(GPU_MEANS[0].temperature,   4),
      power:       mkMetric(GPU_MEANS[0].power,         10),
      cpu:         mkMetric(GPU_MEANS[0].cpu,           14),
      ram:         mkMetric(GPU_MEANS[0].ram,            9),
    },
    {
      type: 'gpu', id: 'gpu-2', name: 'gpu-node-02', status: 'warning',
      location: 'Paris, FR', uptime: '1j 8h 44m',
      gpuModel: 'NVIDIA A100 40GB', gpuCount: 8, vramTotal: 320, ramTotal: 256, powerMax: 3200,
      gpu:         mkMetric(GPU_MEANS[1].gpu,           5),
      vram:        mkMetric(GPU_MEANS[1].vram,           4),
      temperature: mkMetric(GPU_MEANS[1].temperature,   3),
      power:       mkMetric(GPU_MEANS[1].power,          5),
      cpu:         mkMetric(GPU_MEANS[1].cpu,           14),
      ram:         mkMetric(GPU_MEANS[1].ram,            7),
    },
    {
      type: 'gpu', id: 'gpu-3', name: 'gpu-node-03', status: 'offline',
      location: 'Marseille, FR', uptime: '—',
      gpuModel: 'NVIDIA RTX 4090', gpuCount: 2, vramTotal: 48, ramTotal: 128, powerMax: 900,
      gpu: mkMetric(0, 0), vram: mkMetric(0, 0), temperature: mkMetric(0, 0),
      power: mkMetric(0, 0), cpu: mkMetric(0, 0), ram: mkMetric(0, 0),
    },
  ]);

  readonly allServers = computed((): Server[] => [
    ...this.cpuServers(),
    ...this.gpuServers(),
  ]);

  getById(id: string): Server | undefined {
    return this.allServers().find((s) => s.id === id);
  }

  constructor() {
    setInterval(() => this.tick(), 1000);
  }

  private tick(): void {
    this.cpuServers.update((servers) =>
      servers.map((s, i) => {
        if (s.status === 'offline') return s;
        const m = CPU_MEANS[i];
        return {
          ...s,
          cpu:       updateMetric(s.cpu,       m.cpu,        15),
          ram:       updateMetric(s.ram,        m.ram,         6),
          diskRead:  updateMetric(s.diskRead,   m.diskRead,   22),
          diskWrite: updateMetric(s.diskWrite,  m.diskWrite,  16),
          netIn:     updateMetric(s.netIn,      m.netIn,      20),
          netOut:    updateMetric(s.netOut,     m.netOut,     14),
        };
      })
    );

    this.gpuServers.update((servers) =>
      servers.map((s, i) => {
        if (s.status === 'offline') return s;
        const m = GPU_MEANS[i];
        return {
          ...s,
          gpu:         updateMetric(s.gpu,          m.gpu,          10),
          vram:        updateMetric(s.vram,          m.vram,          5),
          temperature: updateMetric(s.temperature,  m.temperature,   3),
          power:       updateMetric(s.power,         m.power,         8),
          cpu:         updateMetric(s.cpu,           m.cpu,          14),
          ram:         updateMetric(s.ram,           m.ram,           7),
        };
      })
    );
  }
}
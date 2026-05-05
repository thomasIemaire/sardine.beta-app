export type ServerStatus = 'online' | 'offline' | 'warning';

export interface MetricSeries {
  value: number;    // current normalized value (0–100)
  history: number[]; // last 60 normalized values for sparkline
}

export interface CpuServer {
  type: 'cpu';
  id: string;
  name: string;
  status: ServerStatus;
  location: string;
  uptime: string;
  cpuModel: string;
  coreCount: number;
  ramTotal: number; // GB
  cpu: MetricSeries;
  ram: MetricSeries;
  diskRead: MetricSeries;
  diskWrite: MetricSeries;
  netIn: MetricSeries;
  netOut: MetricSeries;
}

export interface GpuServer {
  type: 'gpu';
  id: string;
  name: string;
  status: ServerStatus;
  location: string;
  uptime: string;
  gpuModel: string;
  gpuCount: number;
  vramTotal: number; // GB
  ramTotal: number;  // GB
  powerMax: number;  // W
  gpu: MetricSeries;
  vram: MetricSeries;
  temperature: MetricSeries; // 0–100 mapped to 0–100 °C
  power: MetricSeries;       // 0–100 % of powerMax
  cpu: MetricSeries;
  ram: MetricSeries;
}

export type Server = CpuServer | GpuServer;

export interface ChartZoom {
  serverId: string;
  serverType: 'cpu' | 'gpu';
  metricKey: string;
  label: string;
  color: string;
}

// ── Backend DTOs (réponse de /api/servers/stats) ─────────────────────────────

export type ServerType = 'gpu_runpod' | 'gpu_local' | 'cpu_worker';
export type ServerHealth = 'ok' | 'unreachable' | 'error';

export interface GpuStatDto {
  index: number;
  name: string;
  driver_version?: string;
  temperature_c: number;
  gpu_util_pct: number;
  memory_util_pct: number;
  vram_total_mb: number;
  vram_used_mb: number;
  vram_free_mb: number;
  power_draw_w: number;
  power_limit_w: number;
  fan_speed_pct?: number;
  clock_graphics_mhz?: number;
  clock_memory_mhz?: number;
}

export interface SystemStatDto {
  cpu: { count_logical: number; count_physical: number; percent: number; load_avg_1m?: number };
  memory: { total_gb: number; available_gb: number; used_gb: number; percent: number };
  swap: { total_gb: number; used_gb: number; percent: number };
  disk: { total_gb: number; used_gb: number; free_gb: number; percent: number };
}

export interface ServerStatsDto {
  server_id: string;
  server_name: string;
  server_type: ServerType;
  health: ServerHealth;
  health_label: string;
  fetched_at: string;
  latency_ms: number | null;
  error: string | null;
  uptime_s: number | null;
  platform: { system: string; release: string; python: string; machine: string } | null;
  gpus: GpuStatDto[];
  system: SystemStatDto | null;
}

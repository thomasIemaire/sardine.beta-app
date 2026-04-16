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
import { Component, computed, input } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import type {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';

@Component({
  selector: 'app-sparkline',
  imports: [NgApexchartsModule],
  template: `
    <apx-chart
      [series]="series()"
      [chart]="chartOpts()"
      [stroke]="stroke"
      [fill]="fill"
      [grid]="grid()"
      [xaxis]="xaxis"
      [yaxis]="yaxis()"
      [tooltip]="tooltip"
      [dataLabels]="dataLabels"
      [colors]="chartColors()"
    />
  `,
  styles: `
    :host { display: block; }
    :host ::ng-deep .apexcharts-canvas { background: transparent !important; }
    :host ::ng-deep .apexcharts-canvas svg { background: transparent !important; display: block; }
    :host ::ng-deep .apexcharts-theme-light { background: transparent !important; }
    :host ::ng-deep > div { line-height: 0; font-size: 0; }
  `,
})
export class SparklineChartComponent {
  readonly values      = input<number[]>([]);
  readonly color       = input<string>('#818cf8');
  readonly chartHeight = input<number>(44);
  readonly showGrid    = input<boolean>(false);
  readonly gridLabels  = input<string[]>([]);

  readonly safeLabels = computed((): [string, string, string] => {
    const l = this.gridLabels();
    return [l[0] ?? '100%', l[1] ?? '50%', l[2] ?? '0'];
  });

  readonly series = computed((): ApexAxisChartSeries => [
    { name: '', data: this.values() }
  ]);

  readonly chartOpts = computed((): ApexChart => ({
    type: 'area',
    height: this.chartHeight(),
    sparkline: { enabled: !this.showGrid() },
    toolbar: { show: false },
    zoom: { enabled: false },
    background: 'transparent',
    parentHeightOffset: 0,
    offsetX: 0,
    offsetY: 0,
    animations: {
      enabled: false,
      dynamicAnimation: { enabled: true, speed: 350 },
    },
  }));

  readonly stroke: ApexStroke = {
    curve: 'smooth',
    width: 1.5,
  };

  readonly fill: ApexFill = {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.28,
      opacityTo: 0.02,
      stops: [0, 100],
    },
  };

  readonly chartColors = computed((): string[] => [this.color()]);

  readonly grid = computed((): ApexGrid => {
    if (!this.showGrid()) return { show: false };
    return {
      show: true,
      borderColor: 'rgba(128,128,128,0.14)',
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 0, right: 0, top: 0, bottom: 0 },
    };
  });

  readonly xaxis: ApexXAxis = {
    labels:      { show: false },
    axisBorder:  { show: false },
    axisTicks:   { show: false },
    crosshairs:  { show: false },
    tooltip:     { enabled: false },
  };

  readonly yaxis = computed((): ApexYAxis => {
    if (!this.showGrid()) return { show: false, min: 0, max: 100 };
    const labels = this.safeLabels();
    return {
      show: true,
      opposite: true,
      min: 0,
      max: 100,
      tickAmount: 2,
      labels: {
        minWidth: 0,
        maxWidth: 54,
        offsetX: -4,
        style: {
          fontSize: '9px',
          fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
          colors: ['rgba(128,128,128,0.5)'],
        },
        formatter: (val: number) => {
          const v = Math.round(val);
          if (v >= 100) return labels[0];
          if (v >= 50)  return labels[1];
          return labels[2];
        },
      },
    };
  });

  readonly tooltip: ApexTooltip = { enabled: false };

  readonly dataLabels: ApexDataLabels = { enabled: false };
}
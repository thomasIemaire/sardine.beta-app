import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-sparkline',
  template: `
    <div class="sw">
      <svg
        [attr.viewBox]="'0 0 300 ' + chartHeight()"
        preserveAspectRatio="none"
        width="100%"
        [attr.height]="chartHeight()"
      >
        <defs>
          <linearGradient [id]="id" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" [attr.stop-color]="color()" stop-opacity="0.28" />
            <stop offset="100%" [attr.stop-color]="color()" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- Grid lines -->
        @if (showGrid()) {
          @for (g of gridLines(); track g.level) {
            <line
              x1="0" x2="300"
              [attr.y1]="g.y" [attr.y2]="g.y"
              stroke="rgba(128,128,128,0.14)"
              [attr.stroke-dasharray]="g.level === 0 ? '0' : '3,3'"
              stroke-width="0.8"
            />
          }
        }

        <!-- Sparkline -->
        @if (fillPath()) {
          <path [attr.d]="fillPath()" [attr.fill]="'url(#' + id + ')'" />
          <polyline
            [attr.points]="linePoints()"
            fill="none"
            [attr.stroke]="color()"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        }
      </svg>

      <!-- HTML labels (outside SVG to avoid scaling distortion) -->
      @if (showGrid()) {
        <div class="gl" [style.height.px]="chartHeight()">
          <span>{{ safeLabels()[0] }}</span>
          <span>{{ safeLabels()[1] }}</span>
          <span>{{ safeLabels()[2] }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; }

    .sw {
      display: flex;
      align-items: flex-start;
      gap: 4px;

      svg { flex: 1; min-width: 0; display: block; }
    }

    .gl {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 56px;
      flex-shrink: 0;
      font-size: 9px;
      font-family: ui-monospace, 'JetBrains Mono', monospace;
      color: rgba(128,128,128,0.5);
      text-align: right;
      padding: 1px 0;
      line-height: 1;
      white-space: nowrap;
    }
  `,
})
export class SparklineChartComponent {
  private static _counter = 0;
  readonly id = `sg-${++SparklineChartComponent._counter}`;

  readonly values      = input<number[]>([]);
  readonly color       = input<string>('#818cf8');
  readonly chartHeight = input<number>(44);

  readonly showGrid   = input<boolean>(false);

  /**
   * Labels at [max, mid, min] positions (100% / 50% / 0%).
   * e.g. ['512 GB', '256 GB', '0'] or ['100%', '50%', '0%']
   */
  readonly gridLabels = input<string[]>([]);

  private readonly W   = 300;
  private readonly PAD = 4;

  readonly safeLabels = computed((): [string, string, string] => {
    const l = this.gridLabels();
    return [l[0] ?? '100%', l[1] ?? '50%', l[2] ?? '0'];
  });

  readonly gridLines = computed(() => {
    if (!this.showGrid()) return [];
    const H   = this.chartHeight();
    const PAD = this.PAD;
    return [100, 75, 50, 25, 0].map((level) => {
      const y = H - PAD - (level / 100) * (H - PAD * 2);
      return { level, y };
    });
  });

  readonly linePoints = computed(() => {
    const vals = this.values();
    const H    = this.chartHeight();
    const PAD  = this.PAD;
    const W    = this.W;
    if (vals.length < 2) return '';
    const step = W / (vals.length - 1);
    return vals.map((v, i) => {
      const x = i * step;
      const y = H - PAD - (Math.max(0, Math.min(100, v)) / 100) * (H - PAD * 2);
      return `${x},${y}`;
    }).join(' ');
  });

  readonly fillPath = computed(() => {
    const vals = this.values();
    const H    = this.chartHeight();
    const PAD  = this.PAD;
    const W    = this.W;
    if (vals.length < 2) return '';
    const step = W / (vals.length - 1);
    const pts  = vals.map((v, i) => {
      const x = i * step;
      const y = H - PAD - (Math.max(0, Math.min(100, v)) / 100) * (H - PAD * 2);
      return `${x},${y}`;
    }).join(' L ');
    return `M 0,${H} L ${pts} L ${(vals.length - 1) * step},${H} Z`;
  });
}
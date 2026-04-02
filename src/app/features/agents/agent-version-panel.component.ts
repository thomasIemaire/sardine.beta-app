import { Component, input, output, inject, signal, computed, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { Agent } from '../../shared/components/agent-card/agent-card.component';
import { AgentService, ApiAgentVersion } from '../../core/services/agent.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

// ── graph geometry ──────────────────────────────────────────────
const COL_W = 16;
const DOT_R = 4;
const ROW_H = 52;

interface VersionRow {
  id: string;
  versionNumber: number;
  schemaData: Record<string, unknown>;
  parentVersionId: string | null;
  createdBy: string;
  createdAt: Date;
  isCurrent: boolean;
  column: number;
}

interface GraphEdge { path: string; col: number; }

function assignColumns(versions: VersionRow[]): void {
  // versions are ordered newest-first.
  // Each lane tracks the id of the node it's heading toward (its expected parent).
  // When a node is placed, it takes the lane already targeting it;
  // if none exists it opens a new lane. Any other lane also targeting this node
  // is freed (merge point).
  const lanes: (string | null)[] = [];

  for (const v of versions) {
    let col = lanes.indexOf(v.id);

    if (col === -1) {
      col = lanes.indexOf(null);
      if (col === -1) col = lanes.length;
    }

    v.column = col;

    if (col < lanes.length) {
      lanes[col] = v.parentVersionId;
    } else {
      lanes.push(v.parentVersionId);
    }

    // Free any other lanes also waiting for this node
    for (let l = 0; l < lanes.length; l++) {
      if (l !== col && lanes[l] === v.id) lanes[l] = null;
    }
  }
}

function buildGraph(rows: VersionRow[]): { w: number; edges: GraphEdge[] } {
  if (rows.length === 0) return { w: DOT_R * 2, edges: [] };
  const byId = new Map(rows.map((r, i) => [r.id, i]));
  const maxCol = Math.max(...rows.map((r) => r.column));
  const w = (maxCol + 1) * COL_W + DOT_R * 2;
  const edges: GraphEdge[] = [];

  rows.forEach((row, i) => {
    if (!row.parentVersionId) return;
    const pi = byId.get(row.parentVersionId);
    if (pi == null) return;
    const parent = rows[pi];
    const x = row.column * COL_W + DOT_R;
    const y = i * ROW_H + ROW_H / 2;
    const px = parent.column * COL_W + DOT_R;
    const py = pi * ROW_H + ROW_H / 2;

    let path: string;
    if (row.column === parent.column) {
      path = `M ${x},${y} L ${px},${py}`;
    } else {
      const my = (y + py) / 2;
      path = `M ${x},${y} C ${x},${my} ${px},${my} ${px},${py}`;
    }
    edges.push({ path, col: row.column });
  });

  return { w, edges };
}

const BRANCH_COLORS = [
  'var(--p-primary-color)',
  'var(--green-color-500)',
  'var(--yellow-color-500)',
  'var(--red-color-400)',
  'var(--p-text-muted-color)',
];

@Component({
  selector: 'app-agent-version-panel',
  imports: [DatePipe, ButtonModule, TooltipModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">Versions</span>
        <p-button icon="fa-regular fa-xmark" severity="secondary" [text]="true" rounded size="small" (onClick)="close.emit()" />
      </div>

      <div class="version-tree">
        @if (loading()) {
          <div class="version-loading">
            <i class="fa-regular fa-spinner-third fa-spin"></i>
          </div>
        } @else if (rows().length === 0) {
          <div class="version-empty">Aucune version disponible.</div>
        } @else {
          <!-- graph SVG overlay (lines only) -->
          <svg class="graph-svg" [attr.width]="graph().w" [attr.height]="totalHeight()">
            @for (edge of graph().edges; track $index) {
              <path
                [attr.d]="edge.path"
                [attr.stroke]="branchColor(edge.col)"
                stroke-width="1.5"
                fill="none"
                stroke-linecap="round"
              />
            }
          </svg>

          @for (row of rows(); track row.id) {
            <div class="version-row" [class.current]="row.isCurrent">
              <!-- dot column -->
              <div class="dot-col" [style.width.px]="graph().w">
                <svg [attr.width]="graph().w" height="100%" overflow="visible">
                  @if (row.isCurrent) {
                    <circle
                      [attr.cx]="row.column * 16 + 4"
                      cy="50%"
                      [attr.r]="DOT_R + 3"
                      [attr.fill]="branchColor(row.column)"
                      fill-opacity="0.2"
                    />
                  }
                  <circle
                    [attr.cx]="row.column * 16 + 4"
                    cy="50%"
                    [attr.r]="row.isCurrent ? DOT_R + 1 : DOT_R"
                    [attr.fill]="branchColor(row.column)"
                  />
                </svg>
              </div>

              <!-- info -->
              <div class="version-info">
                <div class="version-top">
                  <span class="version-tag" [style.color]="branchColor(row.column)">v{{ row.versionNumber }}</span>
                  @if (row.isCurrent) {
                    <span class="current-badge">HEAD</span>
                  }
                </div>
                <div class="version-meta">
                  <span>{{ row.createdAt | date:'dd/MM/yy HH:mm' }}</span>
                </div>
              </div>

              <!-- checkout button -->
              @if (!row.isCurrent) {
                <p-button
                  icon="fa-regular fa-check"
                  severity="secondary"
                  [text]="true"
                  rounded
                  size="small"
                  pTooltip="Définir comme version active"
                  tooltipPosition="left"
                  [loading]="checkingOut() === row.id"
                  (onClick)="checkout(row)"
                />
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styleUrl: './agent-version-panel.component.scss',
})
export class AgentVersionPanelComponent {
  private readonly agentService = inject(AgentService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly messageService = inject(MessageService);

  agent = input.required<Agent>();
  close = output();
  checkedOut = output<void>();

  protected readonly DOT_R = DOT_R;

  readonly loading = signal(false);
  readonly checkingOut = signal<string | null>(null);
  private readonly versions = signal<ApiAgentVersion[]>([]);

  rows = computed<VersionRow[]>(() => {
    const activeId = this.agent().activeVersionId ?? null;
    const raw = this.versions();

    // Sort newest-first by created_at (most reliable field from API)
    const sorted = [...raw].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const rows: VersionRow[] = sorted.map((v, i) => ({
      id: v.id,
      versionNumber: v.version_number ?? (sorted.length - i),
      schemaData: v.schema_data,
      parentVersionId: v.parent_version_id,
      createdBy: v.created_by,
      createdAt: new Date(v.created_at),
      isCurrent: v.id === activeId,
      column: 0,
    }));

    assignColumns(rows);
    return rows;
  });

  graph = computed(() => buildGraph(this.rows()));
  totalHeight = computed(() => this.rows().length * ROW_H);

  constructor() {
    effect(() => {
      // reload whenever the selected agent changes
      const agentId = this.agent().id;
      if (agentId) this.load();
    });
  }

  branchColor(col: number): string {
    return BRANCH_COLORS[col % BRANCH_COLORS.length];
  }

  private load(): void {
    const orgId = this.contextSwitcher.selectedId();
    const agentId = this.agent().id;
    if (!orgId || !agentId) return;

    this.loading.set(true);
    this.agentService.getAgentVersions(orgId, agentId).subscribe({
      next: (v) => { this.versions.set(v); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  checkout(row: VersionRow): void {
    const orgId = this.contextSwitcher.selectedId();
    const agentId = this.agent().id;
    if (!orgId || !agentId || this.checkingOut()) return;

    this.checkingOut.set(row.id);
    this.agentService.checkoutVersion(orgId, agentId, row.id).subscribe({
      next: () => {
        this.checkingOut.set(null);
        this.messageService.add({ severity: 'success', summary: 'Version activée', detail: `v${row.versionNumber} est maintenant la version active.` });
        this.checkedOut.emit();
      },
      error: () => {
        this.checkingOut.set(null);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de changer de version.' });
      },
    });
  }
}

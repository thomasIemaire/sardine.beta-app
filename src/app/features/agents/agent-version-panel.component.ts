import { Component, input, output, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Agent } from '../../shared/components/agent-card/agent-card.component';

export interface VersionNode {
  id: string;
  tag: string;
  message: string;
  author: { name: string; initials: string };
  date: Date;
  isCurrent: boolean;
  column: number;       // column index of the dot (0-based)
  parents: string[];    // parent version ids
  branchName?: string;
}

// ── graph geometry ──────────────────────────────────────────────
const COL_W = 16;   // px between branch columns
const DOT_R = 4;    // dot radius
const ROW_H = 52;   // px per row (must match CSS .version-row height)

interface GraphEdge { path: string; col: number; }

function buildGraph(nodes: VersionNode[]): { w: number; edges: GraphEdge[] } {
  if (nodes.length === 0) return { w: DOT_R * 2, edges: [] };
  const byId = new Map(nodes.map((n, i) => [n.id, i]));
  const maxCol = Math.max(...nodes.map(n => n.column));
  const w = (maxCol + 1) * COL_W + DOT_R * 2;
  const edges: GraphEdge[] = [];

  nodes.forEach((node, i) => {
    const x = node.column * COL_W + DOT_R;
    const y = i * ROW_H + ROW_H / 2;

    for (const pid of node.parents) {
      const pi = byId.get(pid);
      if (pi == null) continue;
      const parent = nodes[pi];
      const px = parent.column * COL_W + DOT_R;
      const py = pi * ROW_H + ROW_H / 2;

      let path: string;
      if (node.column === parent.column) {
        // straight vertical
        path = `M ${x},${y} L ${px},${py}`;
      } else {
        // S-curve (cubic bezier) — smoother than elbow
        const my = (y + py) / 2;
        path = `M ${x},${y} C ${x},${my} ${px},${my} ${px},${py}`;
      }
      edges.push({ path, col: node.column });
    }
  });

  return { w, edges };
}

// ── branch colours ──────────────────────────────────────────────
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

        @for (node of versions(); track node.id) {
          <div class="version-row" [class.current]="node.isCurrent">
            <!-- dot column -->
            <div class="dot-col" [style.width.px]="graph().w">
              <svg [attr.width]="graph().w" height="100%" overflow="visible">
                @if (node.isCurrent) {
                  <circle
                    [attr.cx]="node.column * 16 + 4"
                    cy="50%"
                    [attr.r]="DOT_R + 3"
                    [attr.fill]="branchColor(node.column)"
                    fill-opacity="0.2"
                  />
                }
                <circle
                  [attr.cx]="node.column * 16 + 4"
                  cy="50%"
                  [attr.r]="node.isCurrent ? DOT_R + 1 : DOT_R"
                  [attr.fill]="branchColor(node.column)"
                />
              </svg>
            </div>

            <!-- info -->
            <div class="version-info">
              <div class="version-top">
                <span class="version-tag" [style.color]="branchColor(node.column)">{{ node.tag }}</span>
                @if (node.isCurrent) {
                  <span class="current-badge">HEAD</span>
                }
                @if (node.branchName) {
                  <span class="branch-badge" [pTooltip]="node.branchName" tooltipPosition="left">
                    <i class="fa-regular fa-code-branch"></i>
                    <span class="branch-badge-text">{{ node.branchName }}</span>
                  </span>
                }
              </div>
              <div class="version-meta">
                <span class="meta-avatar">{{ node.author.initials }}</span>
                <span>{{ node.date | date:'dd/MM/yy' }}</span>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

    .panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid var(--surface-border);
      flex-shrink: 0;
    }

    .panel-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--p-text-color);
    }

    .version-tree {
      flex: 1;
      overflow-y: auto;
      position: relative;
    }

    .graph-svg {
      position: absolute;
      top: 0;
      left: 1rem;
      pointer-events: none;
      z-index: 1;
    }

    .version-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0 1rem;
      height: 52px;
      cursor: pointer;
      transition: background 0.15s;
      position: relative;

      &:hover { background: var(--background-color-100); }
      &.current { background: var(--primary-color-50); }
    }

    .dot-col {
      flex-shrink: 0;
      height: 100%;
      position: relative;
      z-index: 2;
    }

    .version-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .version-top {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      min-width: 0;
    }

    .version-tag {
      font-size: 0.75rem;
      font-weight: 700;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .branch-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.625rem;
      font-weight: 500;
      color: var(--p-text-muted-color);
      background: var(--background-color-100);
      border: 1px solid var(--surface-border);
      border-radius: 2rem;
      padding: 0.0625rem 0.375rem;
      min-width: 0;
      max-width: 7rem;
      overflow: hidden;

      i { font-size: 0.5rem; flex-shrink: 0; }
    }

    .branch-badge-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .current-badge {
      font-size: 0.5625rem;
      font-weight: 700;
      color: var(--p-primary-color);
      background: var(--primary-color-100);
      border: 1px solid var(--primary-color-200);
      border-radius: 2rem;
      padding: 0.0625rem 0.375rem;
      flex-shrink: 0;
    }

    .version-meta {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.625rem;
      color: var(--p-text-muted-color);
    }

    .meta-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      background: var(--primary-color-100);
      color: var(--primary-color-700);
      font-size: 0.4375rem;
      font-weight: 700;
    }
  `,
})
export class AgentVersionPanelComponent {
  agent = input.required<Agent>();
  close = output();

  protected readonly DOT_R = DOT_R;

  versions = computed<VersionNode[]>(() => [
    { id: 'head',   tag: 'Support complet PDF',            message: '', author: { name: 'Thomas Lemaire', initials: 'TL' }, date: new Date('2026-03-20'), isCurrent: true,  column: 0, parents: ['merge1'] },
    { id: 'merge1', tag: 'Fusion extraction avancée',      message: '', author: { name: 'Thomas Lemaire', initials: 'TL' }, date: new Date('2026-03-18'), isCurrent: false, column: 0, parents: ['mainC', 'feat2'] },
    { id: 'feat2',  tag: 'Tables & structures',            message: '', author: { name: 'Marie Dupont',   initials: 'MD' }, date: new Date('2026-03-14'), isCurrent: false, column: 1, parents: ['feat1', 'fix2'], branchName: 'feature/extraction' },
    { id: 'fix2',   tag: 'Encodage caractères spéciaux',   message: '', author: { name: 'Marie Dupont',   initials: 'MD' }, date: new Date('2026-03-12'), isCurrent: false, column: 2, parents: ['fix1'],           branchName: 'feature/parser' },
    { id: 'mainC',  tag: 'Correction validation schéma',   message: '', author: { name: 'Thomas Lemaire', initials: 'TL' }, date: new Date('2026-03-10'), isCurrent: false, column: 0, parents: ['mainB'] },
    { id: 'fix1',   tag: 'Nouveau parseur XML',            message: '', author: { name: 'Marie Dupont',   initials: 'MD' }, date: new Date('2026-03-08'), isCurrent: false, column: 2, parents: ['feat1'],           branchName: 'feature/parser' },
    { id: 'mainB',  tag: 'Mise à jour dépendances',        message: '', author: { name: 'Thomas Lemaire', initials: 'TL' }, date: new Date('2026-03-06'), isCurrent: false, column: 0, parents: ['prev'] },
    { id: 'feat1',  tag: 'Détection colonnes dynamiques',  message: '', author: { name: 'Thomas Lemaire', initials: 'TL' }, date: new Date('2026-03-05'), isCurrent: false, column: 1, parents: ['prev'],            branchName: 'feature/extraction' },
    { id: 'prev',   tag: 'Optimisation performances',      message: '', author: { name: 'Thomas Lemaire', initials: 'TL' }, date: new Date('2026-03-01'), isCurrent: false, column: 0, parents: ['init'] },
    { id: 'init',   tag: 'Version initiale',               message: '', author: { name: 'Thomas Lemaire', initials: 'TL' }, date: new Date('2026-02-15'), isCurrent: false, column: 0, parents: [] },
  ]);

  graph = computed(() => buildGraph(this.versions()));
  totalHeight = computed(() => this.versions().length * ROW_H);

  branchColor(col: number): string {
    return BRANCH_COLORS[col % BRANCH_COLORS.length];
  }
}

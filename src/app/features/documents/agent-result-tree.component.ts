import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { AgentService } from '../../core/services/agent.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

export type AgentResultValue = string | number | boolean | null | AgentResultObject;
export interface AgentResultObject { [key: string]: AgentResultValue; }

export interface AgentResultEntry {
  key: string;
  /** Chemin complet pointé (ex. "seller.name") pour le feedback. */
  fieldKey: string;
  value: AgentResultValue;
  isObject: boolean;
  children: AgentResultEntry[];
}

export function toEntries(obj: AgentResultObject, prefix = ''): AgentResultEntry[] {
  return Object.entries(obj).map(([key, value]) => {
    const fieldKey = prefix ? `${prefix}.${key}` : key;
    const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
    return {
      key,
      fieldKey,
      value,
      isObject,
      children: isObject ? toEntries(value as AgentResultObject, fieldKey) : [],
    };
  });
}

export function entriesToObject(entries: AgentResultEntry[]): AgentResultObject {
  const obj: AgentResultObject = {};
  for (const entry of entries) {
    obj[entry.key] = entry.isObject ? entriesToObject(entry.children) : entry.value;
  }
  return obj;
}

@Component({
  selector: 'app-agent-result-tree',
  standalone: true,
  imports: [FormsModule, InputTextModule, TooltipModule],
  template: `
    @for (entry of entries(); track entry.fieldKey) {
      @if (entry.isObject) {
        <div class="art-group">
          <div class="art-group-label" (click)="toggle(entry.key)">
            <i class="fa-regular fa-chevron-right art-chevron" [class.art-chevron--open]="isOpen(entry.key)"></i>
            <span class="art-group-key">{{ entry.key }}</span>
          </div>
          @if (isOpen(entry.key)) {
            <div class="art-children">
              <app-agent-result-tree
                [entries]="entry.children"
                [agentId]="agentId()"
                [fileId]="fileId()"
                (change)="onChildChange()"
              />
            </div>
          }
        </div>
      } @else {
        <div class="art-row">
          <div class="art-row-header">
            <span class="art-key">{{ entry.key }}</span>
            <div class="art-feedback">
              <button
                class="art-fb-btn"
                [class.art-fb-btn--correct]="feedbackState()[entry.fieldKey] === 'correct'"
                [class.art-fb-btn--submitting]="feedbackState()[entry.fieldKey] === 'submitting'"
                (click)="submitFeedback(entry, true)"
                pTooltip="Correct"
                tooltipPosition="top"
              >
                <i class="fa-solid fa-thumbs-up"></i>
              </button>
              <button
                class="art-fb-btn"
                [class.art-fb-btn--wrong]="feedbackState()[entry.fieldKey] === 'incorrect'"
                [class.art-fb-btn--submitting]="feedbackState()[entry.fieldKey] === 'submitting'"
                (click)="submitFeedback(entry, false)"
                pTooltip="Incorrect"
                tooltipPosition="top"
              >
                <i class="fa-solid fa-thumbs-down"></i>
              </button>
            </div>
          </div>
          <input
            pInputText
            pSize="small"
            class="art-input"
            [ngModel]="stringify(entry.value)"
            (ngModelChange)="onValueChange(entry, $event)"
          />
        </div>
      }
    }
  `,
  styles: `
    :host { display: block; }

    .art-row {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.375rem 0;
      border-bottom: 1px solid var(--p-surface-border);
      min-width: 0;
      &:last-child { border-bottom: none; }
    }

    .art-row-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .art-key {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--p-text-muted-color);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      white-space: nowrap;
    }

    .art-input { width: 100%; }

    .art-feedback {
      display: flex;
      gap: 0.125rem;
      flex-shrink: 0;
    }

    .art-fb-btn {
      width: 1.5rem;
      height: 1.5rem;
      border: none;
      border-radius: 50%;
      background: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6875rem;
      color: var(--p-text-muted-color);
      transition: color 0.15s, background 0.15s;

      &:hover { background: var(--p-content-hover-background); color: var(--p-text-color); }
      &--correct { color: #10b981; background: #10b98120; }
      &--wrong   { color: #ef4444; background: #ef444420; }
      &--submitting { opacity: 0.4; pointer-events: none; }
    }

    .art-group {
      padding: 0.125rem 0;
      border-bottom: 1px solid var(--p-surface-border);
      &:last-child { border-bottom: none; }
    }

    .art-group-label {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0;
      cursor: pointer;
      user-select: none;
      &:hover .art-group-key { color: var(--p-primary-500); }
    }

    .art-group-key {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--p-text-muted-color);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .art-chevron {
      font-size: 0.5rem;
      color: var(--p-text-muted-color);
      transition: rotate 0.15s;
      width: 0.75rem;
      flex-shrink: 0;
      &--open { rotate: 90deg; }
    }

    .art-children {
      padding-left: 0.875rem;
      margin-bottom: 0.25rem;
    }
  `,
})
export class AgentResultTreeComponent {
  readonly entries = input.required<AgentResultEntry[]>();
  /** ID de l'agent auquel appartiennent ces champs (pour soumettre le feedback). */
  readonly agentId = input('');
  /** ID du fichier en cours de visualisation. */
  readonly fileId = input('');
  readonly change = output<void>();

  private readonly agentService = inject(AgentService);
  private readonly contextSwitcher = inject(ContextSwitcherService);

  readonly feedbackState = signal<Record<string, 'correct' | 'incorrect' | 'submitting'>>({});

  private openKeys = new Set<string>();

  isOpen(key: string): boolean { return this.openKeys.has(key); }

  toggle(key: string): void {
    if (this.openKeys.has(key)) this.openKeys.delete(key);
    else this.openKeys.add(key);
  }

  onValueChange(entry: AgentResultEntry, raw: string): void {
    entry.value = raw;
    this.change.emit();
  }

  onChildChange(): void { this.change.emit(); }

  submitFeedback(entry: AgentResultEntry, isCorrect: boolean): void {
    const orgId = this.contextSwitcher.selectedId();
    const agentId = this.agentId();
    const fileId = this.fileId();
    if (!orgId || !agentId || !fileId) return;

    const current = this.feedbackState()[entry.fieldKey];
    const target = isCorrect ? 'correct' : 'incorrect';
    if (current === target) return; // déjà renseigné

    const prev = current;
    this.feedbackState.update(s => ({ ...s, [entry.fieldKey]: 'submitting' }));

    this.agentService.submitFeedback(orgId, agentId, fileId, [{
      fieldKey: entry.fieldKey,
      fieldValue: this.stringify(entry.value),
      isCorrect,
    }]).subscribe({
      next: () => this.feedbackState.update(s => ({ ...s, [entry.fieldKey]: target })),
      error: () => {
        // Rétablit l'état précédent en cas d'erreur
        this.feedbackState.update(s => {
          const next = { ...s };
          if (prev) next[entry.fieldKey] = prev;
          else delete next[entry.fieldKey];
          return next;
        });
      },
    });
  }

  stringify(value: AgentResultValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  }
}

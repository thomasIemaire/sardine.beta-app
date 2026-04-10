import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

export type AgentResultValue = string | number | boolean | null | AgentResultObject;
export interface AgentResultObject { [key: string]: AgentResultValue; }

export interface AgentResultEntry {
  key: string;
  value: AgentResultValue;
  isObject: boolean;
  children: AgentResultEntry[];
}

export function toEntries(obj: AgentResultObject): AgentResultEntry[] {
  return Object.entries(obj).map(([key, value]) => {
    const isObject = value !== null && typeof value === 'object';
    return {
      key,
      value,
      isObject,
      children: isObject ? toEntries(value as AgentResultObject) : [],
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
  imports: [FormsModule, InputTextModule],
  template: `
    @for (entry of entries(); track entry.key) {
      @if (entry.isObject) {
        <div class="art-group">
          <div class="art-group-label" (click)="toggle(entry.key)">
            <i class="fa-regular fa-chevron-right art-chevron" [class.art-chevron--open]="isOpen(entry.key)"></i>
            <span class="art-key">{{ entry.key }}</span>
          </div>
          @if (isOpen(entry.key)) {
            <div class="art-children">
              <app-agent-result-tree [entries]="entry.children" (change)="onChildChange()" />
            </div>
          }
        </div>
      } @else {
        <div class="art-row">
          <span class="art-key">{{ entry.key }}</span>
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
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
      border-bottom: 1px solid var(--p-surface-border);
      min-width: 0;
      &:last-child { border-bottom: none; }
    }

    .art-key {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--p-text-muted-color);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      white-space: nowrap;
      flex-shrink: 0;
      min-width: 6rem;
    }

    .art-input {
      flex: 1;
      min-width: 0;
      font-size: 0.8125rem !important;
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
      &:hover .art-key { color: var(--p-primary-500); }
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
      padding-left: 1rem;
      border-left: 2px solid var(--p-surface-border);
      margin-left: 0.375rem;
      margin-bottom: 0.25rem;
    }
  `,
})
export class AgentResultTreeComponent {
  readonly entries = input.required<AgentResultEntry[]>();
  readonly change = output<void>();

  private openKeys = new Set<string>();

  isOpen(key: string): boolean {
    return this.openKeys.has(key);
  }

  toggle(key: string): void {
    if (this.openKeys.has(key)) {
      this.openKeys.delete(key);
    } else {
      this.openKeys.add(key);
    }
  }

  onValueChange(entry: AgentResultEntry, raw: string): void {
    entry.value = raw;
    this.change.emit();
  }

  onChildChange(): void {
    this.change.emit();
  }

  stringify(value: AgentResultValue): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  }
}

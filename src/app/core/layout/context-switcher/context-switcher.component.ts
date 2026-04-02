import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ContextSwitcherService, CtxOrganization } from './context-switcher.service';
import { SelectableComponent } from '../../../shared/components/selectable/selectable.component';

@Component({
  selector: 'app-context-switcher',
  imports: [FormsModule, ButtonModule, ToggleSwitchModule, SelectableComponent],
  template: `
    <div class="cs-backdrop" (click)="service.isManualOpen() && close()"></div>

    <div class="cs-body">
      <p class="cs-title">Quelle organisation souhaitez-vous utiliser ?</p>

      <div class="cs-grid">
        @for (org of displayedOrgs(); track org.id) {
          <div class="cs-item" [class.is-locked]="org.locked" (click)="!org.locked && select(org)">
            <app-selectable [selected]="service.selectedId() === org.id && !org.locked" borderRadius="1.7rem">
              <div class="cs-avatar" [class.cs-avatar--locked]="org.locked">
                @if (org.locked) { <i class="fa-regular fa-lock"></i> } @else { {{ org.initials }} }
              </div>
            </app-selectable>
            <div class="cs-names">
              <span class="cs-name" [class.cs-name--muted]="org.locked">{{ org.name }}</span>
              @if (org.subtitle) {
                <span class="cs-subtitle">{{ org.subtitle }}</span>
              }
              @if (org.locked) {
                <span class="cs-subtitle">Accès suspendu</span>
              }
            </div>
          </div>
        }

        @if (hasOverflow()) {
          <div class="cs-item cs-item--overflow">
            <div class="cs-overflow-avatar">
              <span>+{{ remainingCount() }}</span>
            </div>
            <div class="cs-names">
              <span class="cs-name cs-name--muted">autres</span>
            </div>
          </div>
        }
      </div>

      @if (showSearch()) {
        <div class="cs-search">
          <input
            type="text"
            placeholder="Rechercher une organisation…"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            autofocus
          />
        </div>
      }

      <div class="cs-footer">
        @if (!service.isManualOpen()) {
          <label class="cs-remember">
            <p-toggle-switch [(ngModel)]="saveAsDefault" />
            <span>Se souvenir de ce choix</span>
          </label>
        }

        @if (service.isManualOpen()) {
          <p-button
            icon="fa-regular fa-xmark"
            label="Fermer"
            severity="secondary"
            [text]="true"
            rounded
            size="small"
            (onClick)="close()"
          />
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      animation: fade-in 0.15s ease both;
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .cs-backdrop {
      position: absolute;
      inset: 0;
      background: var(--background-color-0);
    }

    .cs-body {
      // position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
    }

    .cs-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--p-text-color);
      text-align: center;
      margin: 0;
    }

    .cs-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1.5rem;
    }

    .cs-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.625rem;
      cursor: pointer;

      &--overflow { cursor: default; }
      &.is-locked { cursor: not-allowed; opacity: 0.55; }
    }

    .cs-avatar {
      width: 96px;
      height: 96px;
      border-radius: 1.5rem;
      background: var(--background-color-100);
      border: 1px solid var(--surface-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--p-text-color);
      text-transform: uppercase;
      user-select: none;

      &--locked { color: var(--p-text-muted-color); }
    }

    .cs-overflow-avatar {
      width: 96px;
      height: 96px;
      border-radius: 1.5rem;
      background: var(--background-color-100);
      border: 1px solid var(--surface-border);
      display: flex;
      align-items: center;
      justify-content: center;

      span {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--p-text-muted-color);
      }
    }

    .cs-names {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.1rem;
      max-width: 96px;
    }

    .cs-name {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--p-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      user-select: none;

      &--muted { color: var(--p-text-muted-color); font-weight: 400; }
    }

    .cs-subtitle {
      font-size: 0.625rem;
      color: var(--p-text-muted-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      user-select: none;
    }

    .cs-search {
      input {
        text-align: center;
        border: none;
        border-bottom: 1px solid var(--surface-border);
        outline: none;
        width: 256px;
        padding: 0.625rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--p-text-color);
        font-family: inherit;
        background: transparent;
      }
    }

    .cs-footer {
      position: absolute;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
    }

    .cs-remember {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--p-text-muted-color);
      user-select: none;
    }
  `,
})
export class ContextSwitcherComponent {
  readonly service = inject(ContextSwitcherService);
  readonly MAX_DISPLAYED = 4;

  saveAsDefault = false;
  readonly searchQuery = signal('');

  readonly filteredOrgs = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const orgs = this.service.organizations();
    return q ? orgs.filter(o => o.name.toLowerCase().includes(q) || (o.subtitle?.toLowerCase().includes(q) ?? false)) : orgs;
  });

  readonly showSearch = computed(() => this.service.organizations().length > this.MAX_DISPLAYED);
  readonly hasOverflow = computed(() => this.filteredOrgs().length > this.MAX_DISPLAYED);
  readonly remainingCount = computed(() => this.filteredOrgs().length - this.MAX_DISPLAYED);
  readonly displayedOrgs = computed(() => this.filteredOrgs().slice(0, this.MAX_DISPLAYED));

  select(org: CtxOrganization): void {
    this.service.select(org, this.saveAsDefault);
    setTimeout(() => this.service.close(), 150);
  }

  close(): void {
    this.service.close();
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
}

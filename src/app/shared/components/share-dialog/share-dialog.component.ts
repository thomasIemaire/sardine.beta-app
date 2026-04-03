import { Component, effect, inject, input, model, signal } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { SharingService } from '../../../core/services/sharing.service';
import { OrganizationService, ApiOrganization } from '../../../core/services/organization.service';
import { ContextSwitcherService } from '../../../core/layout/context-switcher/context-switcher.service';
import { OrgAvatarComponent } from '../org-avatar/org-avatar.component';

interface OrgRow {
  id: string;
  name: string;
  initials: string;
  alreadyShared: boolean;
  selected: boolean;
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

@Component({
  selector: 'app-share-dialog',
  imports: [DialogModule, ButtonModule, CheckboxModule, FormsModule, OrgAvatarComponent],
  template: `
    <p-dialog
      [header]="dialogHeader"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '420px' }"
      appendTo="body"
      [draggable]="false"
      [resizable]="false"
      (onShow)="onShow()"
    >
      @if (loading()) {
        <div class="share-loading">
          <i class="fa-regular fa-spinner-third fa-spin"></i>
          <span>Chargement…</span>
        </div>
      } @else if (rows().length === 0) {
        <p class="share-empty">Aucune autre organisation disponible.</p>
      } @else {
        <p class="share-hint">Sélectionnez les organisations avec lesquelles partager cet élément.</p>
        <div class="share-list">
          @for (row of rows(); track row.id) {
            <label class="share-row" [class.share-row--on]="row.selected">
              <app-org-avatar [initials]="row.initials" />
              <span class="share-name">{{ row.name }}</span>
              @if (row.alreadyShared && !row.selected) {
                <span class="share-badge share-badge--removing">Retrait</span>
              } @else if (!row.alreadyShared && row.selected) {
                <span class="share-badge share-badge--adding">Nouveau</span>
              } @else if (row.alreadyShared) {
                <span class="share-badge share-badge--shared">Partagé</span>
              }
              <p-checkbox [binary]="true" [(ngModel)]="row.selected" />
            </label>
          }
        </div>
      }

      <ng-template #footer>
        <p-button label="Annuler" severity="secondary" [text]="true" size="small" (onClick)="cancel()" />
        <p-button
          label="Enregistrer"
          icon="fa-regular fa-share-nodes"
          size="small"
          [loading]="saving()"
          [disabled]="loading() || rows().length === 0"
          (onClick)="save()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    .share-loading, .share-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      padding: 1.5rem 0;
      font-size: .875rem;
      color: var(--p-text-muted-color);
    }

    .share-hint {
      font-size: .8125rem;
      color: var(--p-text-muted-color);
      margin: 0 0 .75rem;
    }

    .share-list {
      display: flex;
      flex-direction: column;
      gap: .25rem;
    }

    .share-row {
      display: flex;
      align-items: center;
      gap: .625rem;
      padding: .5rem .625rem;
      border: 1px solid var(--p-content-border-color);
      border-radius: var(--p-border-radius-md);
      cursor: pointer;
      transition: border-color .15s, background .15s;

      &:hover { background: var(--p-content-hover-background); }

      &--on {
        border-color: var(--p-primary-color);
        background: color-mix(in srgb, var(--p-primary-color) 5%, transparent);
      }
    }

    .share-name {
      flex: 1;
      font-size: .875rem;
      color: var(--p-text-color);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .share-badge {
      font-size: .625rem;
      font-weight: 600;
      padding: .125rem .375rem;
      border-radius: 99px;
      white-space: nowrap;
      flex-shrink: 0;

      &--shared {
        background: color-mix(in srgb, var(--p-primary-color) 10%, transparent);
        color: var(--p-primary-color);
        border: 1px solid color-mix(in srgb, var(--p-primary-color) 25%, transparent);
      }

      &--adding {
        background: color-mix(in srgb, var(--green-color-500, #22c55e) 12%, transparent);
        color: var(--green-color-600, #16a34a);
        border: 1px solid color-mix(in srgb, var(--green-color-500, #22c55e) 30%, transparent);
      }

      &--removing {
        background: color-mix(in srgb, var(--red-color-400, #f87171) 12%, transparent);
        color: var(--red-color-500, #ef4444);
        border: 1px solid color-mix(in srgb, var(--red-color-400, #f87171) 30%, transparent);
      }
    }
  `,
})
export class ShareDialogComponent {
  private readonly sharingService = inject(SharingService);
  private readonly orgService = inject(OrganizationService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly messageService = inject(MessageService);

  visible = model(false);
  itemType = input.required<'agents' | 'flows'>();
  itemId = input.required<string>();
  itemName = input.required<string>();

  get dialogHeader(): string { return `Partager "${this.itemName()}"`; }

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly rows = signal<OrgRow[]>([]);

  constructor() {
    effect(() => {
      if (!this.visible()) this.rows.set([]);
    });
  }

  onShow(): void {
    this.load();
  }

  private load(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;

    this.loading.set(true);
    this.rows.set([]);

    forkJoin({
      orgs: this.orgService.getMyOrganizations(),
      shares: this.sharingService.getShares(orgId, this.itemType(), this.itemId()),
    }).subscribe({
      next: ({ orgs, shares }) => {
        const sharedWithIds = new Set(shares.map((s) => s.shared_with_org_id));
        const rows: OrgRow[] = orgs
          .filter((o: ApiOrganization) => o.id !== orgId && o.is_active_member)
          .map((o: ApiOrganization) => ({
            id: o.id,
            name: o.name,
            initials: initials(o.name),
            alreadyShared: sharedWithIds.has(o.id),
            selected: sharedWithIds.has(o.id),
          }));
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les organisations.' });
      },
    });
  }

  save(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId || this.saving()) return;

    const current = this.rows();
    const toAdd = current.filter((r) => r.selected && !r.alreadyShared).map((r) => r.id);
    const toRemove = current.filter((r) => !r.selected && r.alreadyShared).map((r) => r.id);

    if (toAdd.length === 0 && toRemove.length === 0) {
      this.visible.set(false);
      return;
    }

    this.saving.set(true);

    const all$: Observable<unknown>[] = [];

    if (toAdd.length > 0) {
      all$.push(this.sharingService.addShares(orgId, this.itemType(), this.itemId(), toAdd));
    }
    for (const targetId of toRemove) {
      all$.push(this.sharingService.removeShare(orgId, this.itemType(), this.itemId(), targetId));
    }

    forkJoin(all$).subscribe({
      next: () => {
        this.saving.set(false);
        this.visible.set(false);
        const parts: string[] = [];
        if (toAdd.length) parts.push(`partagé avec ${toAdd.length} organisation${toAdd.length > 1 ? 's' : ''}`);
        if (toRemove.length) parts.push(`retiré de ${toRemove.length} organisation${toRemove.length > 1 ? 's' : ''}`);
        this.messageService.add({ severity: 'success', summary: 'Partage mis à jour', detail: parts.join(' · ') });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue lors du partage.' });
      },
    });
  }

  cancel(): void {
    this.visible.set(false);
  }
}

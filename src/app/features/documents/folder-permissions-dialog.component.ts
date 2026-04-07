import { Component, inject, input, model, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  PermissionService,
  FolderTeamPermission,
  FolderMemberPermission,
} from '../../core/services/permission.service';

import { TeamService, ApiTeamNode } from '../../core/services/team.service';
import { OrganizationService, ApiOrgMember } from '../../core/services/organization.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

interface TeamRow extends FolderTeamPermission {
  saving: boolean;
}

interface MemberRow extends FolderMemberPermission {
  saving: boolean;
}

interface TeamOption {
  label: string;
  value: string;
}

interface MemberOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-folder-permissions-dialog',
  imports: [
    FormsModule,
    ButtonModule, ToggleSwitchModule, DialogModule, SelectModule, TooltipModule, ToastModule,
  ],
  providers: [MessageService],
  template: `
    <p-toast />

    <p-dialog
      [(visible)]="visible"
      [header]="'Permissions — ' + folderName()"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '540px' }"
      (onShow)="load()"
      (onHide)="reset()"
    >
      @if (loading()) {
        <div class="fp-loading">
          <i class="fa-regular fa-spinner fa-spin"></i>
          Chargement...
        </div>
      } @else {
        <!-- Teams section -->
        <section class="fp-section">
          <div class="fp-section-header">
            <span class="fp-section-title">Équipes</span>
            <span class="fp-section-count">{{ teamRows().length }}</span>
          </div>

          @if (teamRows().length > 0) {
            <div class="fp-table">
              <div class="fp-table-header">
                <span class="fp-col-name">Équipe</span>
                <span class="fp-col-perm">Lecture</span>
                <span class="fp-col-perm">Écriture</span>
                <span class="fp-col-action"></span>
              </div>
              @for (row of teamRows(); track row.team_id) {
                <div class="fp-row" [class.fp-row--saving]="row.saving">
                  <span class="fp-col-name fp-name">{{ row.team_name }}</span>
                  <span class="fp-col-perm">
                    <p-toggleswitch
                      [(ngModel)]="row.can_read"
                      [disabled]="row.saving"
                      (ngModelChange)="onTeamPermChange(row)"
                    />
                  </span>
                  <span class="fp-col-perm">
                    <p-toggleswitch
                      [(ngModel)]="row.can_write"
                      [disabled]="row.saving"
                      (ngModelChange)="onTeamPermChange(row)"
                    />
                  </span>
                  <span class="fp-col-action">
                    <p-button
                      icon="fa-regular fa-trash"
                      [text]="true"
                      severity="danger"
                      size="small"
                      rounded
                      [disabled]="row.saving"
                      pTooltip="Retirer l'accès"
                      tooltipPosition="left"
                      (onClick)="removeTeam(row)"
                    />
                  </span>
                </div>
              }
            </div>
          } @else {
            <p class="fp-empty">Aucune équipe n'a accès à ce dossier.</p>
          }

          <!-- Add team -->
          <div class="fp-add-row">
            <p-select
              [options]="availableTeams()"
              [(ngModel)]="selectedTeamId"
              optionLabel="label"
              optionValue="value"
              placeholder="Ajouter une équipe..."
              [filter]="true"
              filterPlaceholder="Rechercher..."
              [style]="{ flex: 1 }"
              size="small"
              appendTo="body"
            />
            <p-button
              label="Ajouter"
              icon="fa-regular fa-plus"
              size="small"
              rounded
              [disabled]="!selectedTeamId || addingTeam()"
              [loading]="addingTeam()"
              (onClick)="addTeam()"
            />
          </div>
        </section>

        <div class="fp-divider"></div>

        <!-- Members section -->
        <section class="fp-section">
          <div class="fp-section-header">
            <span class="fp-section-title">Membres individuels</span>
            <span class="fp-section-count">{{ memberRows().length }}</span>
          </div>

          @if (memberRows().length > 0) {
            <div class="fp-table">
              <div class="fp-table-header">
                <span class="fp-col-name">Membre</span>
                <span class="fp-col-perm">Lecture</span>
                <span class="fp-col-perm">Écriture</span>
                <span class="fp-col-action"></span>
              </div>
              @for (row of memberRows(); track row.user_id) {
                <div class="fp-row" [class.fp-row--saving]="row.saving">
                  <div class="fp-col-name fp-member">
                    <span class="fp-member-name">{{ row.first_name }} {{ row.last_name }}</span>
                    @if (row.email) {
                      <span class="fp-member-email">{{ row.email }}</span>
                    }
                  </div>
                  <span class="fp-col-perm">
                    <p-toggleswitch
                      [(ngModel)]="row.can_read"
                      [disabled]="row.saving"
                      (ngModelChange)="onMemberPermChange(row)"
                    />
                  </span>
                  <span class="fp-col-perm">
                    <p-toggleswitch
                      [(ngModel)]="row.can_write"
                      [disabled]="row.saving"
                      (ngModelChange)="onMemberPermChange(row)"
                    />
                  </span>
                  <span class="fp-col-action">
                    <p-button
                      icon="fa-regular fa-trash"
                      [text]="true"
                      severity="danger"
                      size="small"
                      rounded
                      [disabled]="row.saving"
                      pTooltip="Retirer l'accès"
                      tooltipPosition="left"
                      (onClick)="removeMember(row)"
                    />
                  </span>
                </div>
              }
            </div>
          } @else {
            <p class="fp-empty">Aucun membre individuel n'a de permission explicite.</p>
          }

          <!-- Add member -->
          <div class="fp-add-row">
            <p-select
              [options]="availableMembers()"
              [(ngModel)]="selectedMemberId"
              optionLabel="label"
              optionValue="value"
              placeholder="Ajouter un membre..."
              [filter]="true"
              filterPlaceholder="Rechercher..."
              [style]="{ flex: 1 }"
              size="small"
              appendTo="body"
            />
            <p-button
              label="Ajouter"
              icon="fa-regular fa-plus"
              size="small"
              rounded
              [disabled]="!selectedMemberId || addingMember()"
              [loading]="addingMember()"
              (onClick)="addMember()"
            />
          </div>
        </section>
      }

      <ng-template pTemplate="footer">
        <div class="fp-footer-hint">
          <i class="fa-regular fa-circle-info"></i>
          Les droits s'appliquent en union — un utilisateur hérite du niveau le plus élevé parmi ses équipes et permissions individuelles.
        </div>
      </ng-template>
    </p-dialog>
  `,
  styles: `
    .fp-loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 2rem;
      justify-content: center;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    .fp-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .fp-section-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .fp-section-title {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--p-text-color);
    }

    .fp-section-count {
      font-size: 0.6875rem;
      font-weight: 600;
      padding: 0.1rem 0.4rem;
      border-radius: 99px;
      background: var(--background-color-200);
      color: var(--p-text-muted-color);
    }

    .fp-table {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      overflow: hidden;
    }

    .fp-table-header {
      display: grid;
      grid-template-columns: 1fr 6rem 6rem 2.5rem;
      align-items: center;
      padding: 0.375rem 0.75rem;
      background: var(--background-color-50);
      border-bottom: 1px solid var(--surface-border);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--p-text-muted-color);
    }

    .fp-row {
      display: grid;
      grid-template-columns: 1fr 6rem 6rem 2.5rem;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--surface-border);
      transition: background 0.1s;

      &:last-child { border-bottom: none; }
      &:hover { background: var(--background-color-50); }
      &--saving { opacity: 0.6; pointer-events: none; }
    }

    .fp-col-name { min-width: 0; }
    .fp-col-perm { display: flex; align-items: center; }
    .fp-col-action { display: flex; justify-content: flex-end; }

    .fp-name {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--p-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .fp-member {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;
    }

    .fp-member-name {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--p-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .fp-member-email {
      font-size: 0.6875rem;
      color: var(--p-text-muted-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .fp-empty {
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
      margin: 0;
      padding: 0.25rem 0;
    }

    .fp-add-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }

    .fp-divider {
      height: 1px;
      background: var(--surface-border);
      margin: 1rem 0;
    }

    .fp-footer-hint {
      display: flex;
      align-items: flex-start;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
      line-height: 1.5;
      text-align: left;

      i { flex-shrink: 0; margin-top: 0.1rem; }
    }
  `,
})
export class FolderPermissionsDialogComponent {
  readonly visible = model(false);
  readonly folderId = input.required<string>();
  readonly folderName = input('Dossier');

  private readonly permService = inject(PermissionService);
  private readonly teamService = inject(TeamService);
  private readonly orgService = inject(OrganizationService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly teamRows = signal<TeamRow[]>([]);
  readonly memberRows = signal<MemberRow[]>([]);
  readonly addingTeam = signal(false);
  readonly addingMember = signal(false);

  // All available teams/members (for the add dropdowns)
  private allTeams: ApiTeamNode[] = [];
  private allMembers: ApiOrgMember[] = [];

  readonly availableTeams = signal<TeamOption[]>([]);
  readonly availableMembers = signal<MemberOption[]>([]);

  selectedTeamId: string | null = null;
  selectedMemberId: string | null = null;

  load(): void {
    const orgId = this.contextSwitcher.selectedId();
    const folderId = this.folderId();
    if (!orgId || !folderId) return;

    this.loading.set(true);

    // Load breakdown + teams + members in parallel
    Promise.all([
      lastValueFrom(this.permService.getFolderBreakdown(orgId, folderId)),
      lastValueFrom(this.teamService.getTeamTree(orgId)),
      lastValueFrom(this.orgService.getOrgMembers(orgId)),
    ]).then(([breakdown, teams, members]) => {
      const teamPerms: FolderTeamPermission[] = breakdown?.teams ?? [];
      const memberPerms: FolderMemberPermission[] = breakdown?.members ?? [];

      this.teamRows.set(teamPerms.map(p => ({ ...p, saving: false })));
      this.memberRows.set(memberPerms.map(p => ({ ...p, saving: false })));

      // Store all for dropdown filtering
      this.allTeams = this.flattenTeamTree(teams ?? []);
      this.allMembers = members ?? [];

      this.refreshDropdowns();
      this.loading.set(false);
    }).catch((err) => {
      console.error('[FolderPermissions] load error', err);
      this.loading.set(false);
      this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les permissions.' });
    });
  }

  reset(): void {
    this.teamRows.set([]);
    this.memberRows.set([]);
    this.selectedTeamId = null;
    this.selectedMemberId = null;
    this.availableTeams.set([]);
    this.availableMembers.set([]);
  }

  // ── Teams ─────────────────────────────────────────────────────────────────

  onTeamPermChange(row: TeamRow): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    row.saving = true;
    this.teamRows.update(rows => [...rows]); // trigger change detection

    this.permService.setTeamPermission(orgId, row.team_id, this.folderId(), row.can_read, row.can_write).subscribe({
      next: () => {
        row.saving = false;
        this.teamRows.update(rows => [...rows]);
      },
      error: () => {
        row.saving = false;
        this.teamRows.update(rows => [...rows]);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de modifier la permission.' });
      },
    });
  }

  removeTeam(row: TeamRow): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    row.saving = true;
    this.teamRows.update(rows => [...rows]);

    this.permService.removeTeamPermission(orgId, row.team_id, this.folderId()).subscribe({
      next: () => {
        this.teamRows.update(rows => rows.filter(r => r.team_id !== row.team_id));
        this.refreshDropdowns();
        this.messageService.add({ severity: 'success', summary: 'Accès retiré', detail: row.team_name });
      },
      error: () => {
        row.saving = false;
        this.teamRows.update(rows => [...rows]);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible de retirer l'accès." });
      },
    });
  }

  addTeam(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId || !this.selectedTeamId) return;

    const teamId = this.selectedTeamId;
    const teamName = this.allTeams.find(t => t.id === teamId)?.name ?? teamId;
    this.addingTeam.set(true);

    this.permService.setTeamPermission(orgId, teamId, this.folderId(), true, false).subscribe({
      next: (perm) => {
        this.teamRows.update(rows => [...rows, { ...perm, team_name: perm.team_name ?? teamName, saving: false }]);
        this.selectedTeamId = null;
        this.addingTeam.set(false);
        this.refreshDropdowns();
      },
      error: () => {
        this.addingTeam.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'ajouter l'équipe." });
      },
    });
  }

  // ── Members ───────────────────────────────────────────────────────────────

  onMemberPermChange(row: MemberRow): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    row.saving = true;
    this.memberRows.update(rows => [...rows]);

    this.permService.setMemberPermission(orgId, row.user_id, this.folderId(), row.can_read, row.can_write).subscribe({
      next: () => {
        row.saving = false;
        this.memberRows.update(rows => [...rows]);
      },
      error: () => {
        row.saving = false;
        this.memberRows.update(rows => [...rows]);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de modifier la permission.' });
      },
    });
  }

  removeMember(row: MemberRow): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId) return;
    row.saving = true;
    this.memberRows.update(rows => [...rows]);

    this.permService.removeMemberPermission(orgId, row.user_id, this.folderId()).subscribe({
      next: () => {
        this.memberRows.update(rows => rows.filter(r => r.user_id !== row.user_id));
        this.refreshDropdowns();
        this.messageService.add({ severity: 'success', summary: 'Accès retiré', detail: `${row.first_name} ${row.last_name}` });
      },
      error: () => {
        row.saving = false;
        this.memberRows.update(rows => [...rows]);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible de retirer l'accès." });
      },
    });
  }

  addMember(): void {
    const orgId = this.contextSwitcher.selectedId();
    if (!orgId || !this.selectedMemberId) return;

    const userId = this.selectedMemberId;
    const member = this.allMembers.find(m => m.user_id === userId);
    this.addingMember.set(true);

    this.permService.setMemberPermission(orgId, userId, this.folderId(), true, false).subscribe({
      next: (perm) => {
        this.memberRows.update(rows => [
          ...rows,
          {
            ...perm,
            first_name: perm.first_name ?? member?.first_name ?? '',
            last_name: perm.last_name ?? member?.last_name ?? '',
            email: perm.email ?? member?.email ?? null,
            saving: false,
          },
        ]);
        this.selectedMemberId = null;
        this.addingMember.set(false);
        this.refreshDropdowns();
      },
      error: () => {
        this.addingMember.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible d'ajouter le membre." });
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private flattenTeamTree(nodes: ApiTeamNode[]): ApiTeamNode[] {
    const result: ApiTeamNode[] = [];
    const walk = (list: ApiTeamNode[]) => {
      for (const node of list) {
        result.push(node);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(nodes);
    return result;
  }

  private refreshDropdowns(): void {
    const currentTeamIds = new Set(this.teamRows().map(r => r.team_id));
    this.availableTeams.set(
      this.allTeams
        .filter(t => !t.is_root && !currentTeamIds.has(t.id))
        .map(t => ({ label: t.name, value: t.id }))
    );

    const currentMemberIds = new Set(this.memberRows().map(r => r.user_id));
    this.availableMembers.set(
      this.allMembers
        .filter(m => !currentMemberIds.has(m.user_id))
        .map(m => ({ label: `${m.first_name} ${m.last_name}`, value: m.user_id }))
    );
  }
}

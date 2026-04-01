import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { UserAvatarComponent } from '../../shared/components/user-avatar/user-avatar.component';
import { Team } from './settings.page';
import { TeamService, ApiTeamMember } from '../../core/services/team.service';
import { OrganizationService, ApiOrgMember } from '../../core/services/organization.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

@Component({
  selector: 'app-team-panel',
  imports: [FormsModule, ButtonModule, DividerModule, SelectModule, InputTextModule, TooltipModule, UserAvatarComponent],
  template: `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title-group">
          @if (renaming()) {
            <input
              pInputText
              pSize="small"
              [(ngModel)]="renameValue"
              (keyup.enter)="confirmRename()"
              (keyup.escape)="renaming.set(false)"
              [disabled]="renameSaving()"
            />
            <p-button icon="fa-regular fa-check" severity="secondary" [text]="true" rounded size="small" [loading]="renameSaving()" (onClick)="confirmRename()" />
            <p-button icon="fa-regular fa-xmark" severity="secondary" [text]="true" rounded size="small" [disabled]="renameSaving()" (onClick)="renaming.set(false)" />
          } @else {
            <div class="panel-title-info">
              <span class="panel-title">{{ team().name }}</span>
            </div>
            <p-button icon="fa-regular fa-pen" severity="secondary" [text]="true" rounded size="small" pTooltip="Renommer" (onClick)="startRename()" />
          }
        </div>

        <div class="panel-header-actions">
          @if (!confirmingDelete()) {
            <p-button icon="fa-regular fa-trash" severity="danger" [text]="true" rounded size="small" pTooltip="Supprimer l'équipe" (onClick)="confirmingDelete.set(true)" />
          } @else {
            <span class="delete-confirm-label">Supprimer ?</span>
            <p-button label="Oui" severity="danger" size="small" rounded [loading]="deleting()" (onClick)="deleteTeam()" />
            <p-button label="Non" severity="secondary" size="small" rounded [text]="true" [disabled]="deleting()" (onClick)="confirmingDelete.set(false)" />
          }
          <p-button icon="fa-regular fa-xmark" severity="secondary" [text]="true" rounded size="small" (onClick)="close.emit()" />
        </div>
      </div>

      <div class="panel-body">

        <section class="panel-section">
          <div class="section-header">
            <span class="section-label">Membres</span>
            @if (!loadingMembers()) {
              <span class="section-count">{{ members().length }}</span>
            }
            <div class="section-header-actions">
              @if (!addingMember()) {
                <p-button icon="fa-regular fa-plus" label="Ajouter" severity="secondary" [text]="true" rounded size="small" [disabled]="loadingOrgMembers()" (onClick)="startAddMember()" />
              }
            </div>
          </div>

          @if (addingMember()) {
            <div class="add-member-row">
              <p-select
                [(ngModel)]="selectedMemberToAdd"
                [options]="addableMembersOptions()"
                optionLabel="label"
                optionValue="value"
                placeholder="Choisir un membre…"
                [filter]="true"
                filterPlaceholder="Rechercher…"
                size="small"
                [fluid]="true"
                appendTo="body"
              />
              <p-button icon="fa-regular fa-check" size="small" rounded [disabled]="!selectedMemberToAdd" [loading]="addingSaving()" (onClick)="confirmAddMember()" />
              <p-button icon="fa-regular fa-xmark" severity="secondary" [text]="true" size="small" rounded [disabled]="addingSaving()" (onClick)="cancelAddMember()" />
            </div>
          }

          @if (loadingMembers()) {
            <p class="empty-hint"><i class="fa-regular fa-spinner fa-spin"></i> Chargement…</p>
          } @else {
            <div class="members-list">
              @for (m of members(); track m.user_id) {
                <div class="member-row">
                  <span class="member-avatar">
                    <app-user-avatar [userId]="m.user_id" [initials]="initials(m)" />
                  </span>
                  <div class="member-info">
                    <span class="member-name">{{ m.first_name }} {{ m.last_name }}</span>
                    @if (m.email) {
                      <span class="member-hint">{{ m.email }}</span>
                    } @else if (m.inherited) {
                      <span class="member-hint">Hérité</span>
                    }
                  </div>
                  <p-select
                    [ngModel]="m.role"
                    (ngModelChange)="changeRole(m, $event)"
                    [options]="roleOptions"
                    optionLabel="label"
                    optionValue="value"
                    size="small"
                    [style]="{ minWidth: '9rem' }"
                    appendTo="body"
                  />
                  <p-button
                    [icon]="m.status === 1 ? 'fa-regular fa-toggle-on' : 'fa-regular fa-toggle-off'"
                    [severity]="m.status === 1 ? 'success' : 'secondary'"
                    [text]="true"
                    rounded
                    size="small"
                    [pTooltip]="m.status === 1 ? 'Désactiver' : 'Activer'"
                    (onClick)="toggleStatus(m)"
                  />
                </div>
              } @empty {
                <p class="empty-hint">Aucun membre dans cette équipe.</p>
              }
            </div>
          }
        </section>

        <p-divider />
        <section class="panel-section">
          <div class="section-header">
            <span class="section-label">Sous-équipes</span>
            @if (team().children?.length) {
              <span class="section-count">{{ team().children!.length }}</span>
            }
            <div class="section-header-actions">
              <p-button icon="fa-regular fa-plus" label="Ajouter" severity="secondary" [text]="true" rounded size="small" (onClick)="addSubTeam.emit()" />
            </div>
          </div>
          @if (team().children?.length) {
            <div class="subteams-list">
              @for (sub of team().children!; track sub.id) {
                <div class="subteam-row">
                  <span class="subteam-name">{{ sub.name }}</span>
                </div>
              }
            </div>
          } @else {
            <p class="empty-hint">Aucune sous-équipe.</p>
          }
        </section>

      </div>
    </div>
  `,
  styleUrl: './team-panel.component.scss',
})
export class TeamPanelComponent {
  private readonly teamService = inject(TeamService);
  private readonly orgService = inject(OrganizationService);
  private readonly contextSwitcher = inject(ContextSwitcherService);

  team = input.required<Team>();
  close = output();
  teamChanged = output<string>();
  teamDeleted = output();
  addSubTeam = output();

  readonly members = signal<ApiTeamMember[]>([]);
  readonly loadingMembers = signal(false);

  readonly renaming = signal(false);
  readonly renameSaving = signal(false);
  renameValue = '';

  readonly confirmingDelete = signal(false);
  readonly deleting = signal(false);

  readonly orgMembers = signal<ApiOrgMember[]>([]);
  readonly loadingOrgMembers = signal(false);
  readonly addingMember = signal(false);
  readonly addingSaving = signal(false);
  selectedMemberToAdd: string | null = null;

  readonly roleOptions = [
    { label: 'Propriétaire', value: 1 },
    { label: 'Membre', value: 2 },
  ];

  readonly addableMembersOptions = () => {
    const currentIds = new Set(this.members().map((m) => m.user_id));
    return this.orgMembers()
      .filter((m) => !currentIds.has(m.user_id))
      .map((m) => ({ label: `${m.first_name} ${m.last_name}`, value: m.user_id }));
  };

  constructor() {
    effect(() => {
      const t = this.team();
      const org = this.contextSwitcher.selectedOrganization();
      if (!org) return;
      this.loadMembers(org.id, t.id);
    });
  }

  private loadMembers(orgId: string, teamId: string): void {
    this.loadingMembers.set(true);
    this.teamService.getMembers(orgId, teamId).subscribe({
      next: (list) => { this.members.set(list); this.loadingMembers.set(false); },
      error: () => this.loadingMembers.set(false),
    });
  }

  initials(m: ApiTeamMember): string {
    return `${m.first_name[0] ?? ''}${m.last_name[0] ?? ''}`.toUpperCase();
  }

  startRename(): void {
    this.renameValue = this.team().name;
    this.renaming.set(true);
  }

  confirmRename(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org || !this.renameValue.trim()) return;
    this.renameSaving.set(true);
    this.teamService.updateTeam(org.id, this.team().id, this.renameValue.trim()).subscribe({
      next: () => {
        this.renameSaving.set(false);
        this.renaming.set(false);
        this.teamChanged.emit(this.renameValue.trim());
      },
      error: () => this.renameSaving.set(false),
    });
  }

  deleteTeam(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    this.deleting.set(true);
    this.teamService.deleteTeam(org.id, this.team().id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.teamDeleted.emit();
      },
      error: () => {
        this.deleting.set(false);
        this.confirmingDelete.set(false);
      },
    });
  }

  startAddMember(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    this.selectedMemberToAdd = null;
    this.addingMember.set(true);
    if (this.orgMembers().length === 0) {
      this.loadingOrgMembers.set(true);
      this.orgService.getOrgMembers(org.id).subscribe({
        next: (list) => { this.orgMembers.set(list); this.loadingOrgMembers.set(false); },
        error: () => this.loadingOrgMembers.set(false),
      });
    }
  }

  cancelAddMember(): void {
    this.addingMember.set(false);
    this.selectedMemberToAdd = null;
  }

  confirmAddMember(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org || !this.selectedMemberToAdd) return;
    this.addingSaving.set(true);
    this.teamService.addMember(org.id, this.team().id, this.selectedMemberToAdd).subscribe({
      next: () => {
        this.addingSaving.set(false);
        this.addingMember.set(false);
        this.selectedMemberToAdd = null;
        this.loadMembers(org.id, this.team().id);
      },
      error: () => this.addingSaving.set(false),
    });
  }

  changeRole(m: ApiTeamMember, role: 1 | 2): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    this.teamService.changeMemberRole(org.id, this.team().id, m.user_id, role).subscribe({
      next: () => {
        this.members.update((list) =>
          list.map((item) => item.user_id === m.user_id ? { ...item, role, role_label: role === 1 ? 'Propriétaire' : 'Membre' } : item)
        );
      },
    });
  }

  toggleStatus(m: ApiTeamMember): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    const newStatus: 0 | 1 = m.status === 1 ? 0 : 1;
    this.teamService.changeMemberStatus(org.id, this.team().id, m.user_id, newStatus).subscribe({
      next: () => {
        this.members.update((list) =>
          list.map((item) => item.user_id === m.user_id ? { ...item, status: newStatus, status_label: newStatus === 1 ? 'Actif' : 'Inactif' } : item)
        );
      },
    });
  }
}

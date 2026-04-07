import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';
import { OrganizationService, ApiKeyRead, ApiKeyCreated, ApiOrgMember, ApiOrganization } from '../../core/services/organization.service';
import { environment } from '../../../environments/environment';
import { TeamService, ApiTeamNode } from '../../core/services/team.service';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ContextMenu } from 'primeng/contextmenu';
import { PaginatorState } from 'primeng/paginator';
import { MessageService, MenuItem } from 'primeng/api';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { DataListComponent, ListColumn } from '../../shared/components/data-list/data-list.component';
import type { ActiveFilter, ActiveSort, FilterDefinition, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import { MemberRowComponent } from '../../shared/components/member-row/member-row.component';
import { OrgRowComponent } from '../../shared/components/org-row/org-row.component';
import { OrgAvatarComponent } from '../../shared/components/org-avatar/org-avatar.component';
import { TeamPanelComponent } from './team-panel.component';
import { CreateTeamDialogComponent } from './create-team-dialog.component';
import { CreateOrgDialogComponent } from './create-org-dialog.component';
import { InviteMembersDialogComponent } from './invite-members-dialog.component';

export interface Team {
  id: string;
  name: string;
  is_root: boolean;
  is_member: boolean;
  children?: Team[];
}

interface FlatTeamRow {
  team: Team;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}


interface FacetConfig {
  searchPlaceholder: string;
  actionLabel: string;
  actionIcon: string;
}

@Component({
  selector: 'app-settings',
  imports: [DatePipe, FormsModule, ButtonModule, InputTextModule, ToastModule, TooltipModule, ContextMenu, PageComponent, HeaderPageComponent, DataListComponent, MemberRowComponent, OrgRowComponent, TeamPanelComponent, CreateTeamDialogComponent, CreateOrgDialogComponent, InviteMembersDialogComponent, OrgAvatarComponent],
  providers: [MessageService],
  template: `
    <p-toast position="bottom-right" [life]="3000" />
    <p-contextmenu #memberCm />

    <app-page>
      <app-header-page
        title="Administration"
        subtitle="Gérez votre organisation"
        [facets]="facets()"
        [defaultFacetId]="defaultFacetId()"
        (facetChange)="onFacetChange($event)"
      />

      @if (currentFacet === 'members') {
        <app-data-list
          [searchPlaceholder]="currentConfig!.searchPlaceholder"
          [showViewMode]="false"
          [(search)]="search"
          [(filters)]="activeFilters"
          [filterDefinitions]="memberFilterDefs"
          [(sorts)]="activeSorts"
          [sortDefinitions]="memberSortDefs"
          [columns]="memberColumns"
          [listCompactBreakpoint]="600"
          [listTemplate]="memberListTpl"
          emptyIcon="fa-regular fa-users"
          emptyTitle="Aucun membre"
          emptySubtitle="Aucun résultat pour cette recherche."
          [totalRecords]="filteredMembers.length"
          [paginatorFirst]="pageFirst"
          [paginatorRows]="pageSize"
          [rowsPerPageOptions]="[10, 25, 50]"
          (pageChange)="onPageChange($event)"
          viewMode="list"
        >
          <p-button [label]="currentConfig!.actionLabel" [icon]="currentConfig!.actionIcon" rounded size="small" toolbar-actions (onClick)="showInviteDialog.set(true)" />
        </app-data-list>

        <ng-template #memberListTpl>
          @for (member of paginatedMembers; track member.user_id) {
            <app-member-row [member]="member" (menuOpen)="onMemberMenuOpen($event, member)" />
          }
        </ng-template>
      }

      @if (currentFacet === 'organizations') {
        <app-data-list
          [searchPlaceholder]="currentConfig!.searchPlaceholder"
          [showViewMode]="false"
          [(search)]="search"
          [(filters)]="activeFilters"
          [filterDefinitions]="orgFilterDefs"
          [(sorts)]="activeSorts"
          [sortDefinitions]="orgSortDefs"
          [columns]="orgColumns"
          [listCompactBreakpoint]="600"
          [listTemplate]="orgListTpl"
          emptyIcon="fa-regular fa-building"
          emptyTitle="Aucune organisation"
          emptySubtitle="Aucun résultat pour cette recherche."
          [totalRecords]="filteredOrganizations.length"
          [paginatorFirst]="pageFirst"
          [paginatorRows]="pageSize"
          [rowsPerPageOptions]="[10, 25, 50]"
          (pageChange)="onPageChange($event)"
          viewMode="list"
        >
          <p-button [label]="currentConfig!.actionLabel" [icon]="currentConfig!.actionIcon" rounded size="small" toolbar-actions (onClick)="showCreateOrgDialog.set(true)" />
        </app-data-list>

        <ng-template #orgListTpl>
          @for (org of paginatedOrganizations; track org.id) {
            <app-org-row [org]="org" />
          }
        </ng-template>
      }

      @if (currentFacet === 'teams') {
        <div class="teams-layout">
          <div class="teams-main">
            <app-data-list
              searchPlaceholder="Rechercher une équipe…"
              [showViewMode]="false"
              [(search)]="teamsSearch"
              [(sorts)]="teamActiveSorts"
              [sortDefinitions]="teamSortDefs"
              [columns]="teamColumns"
              [listCompactBreakpoint]="600"
              [listTemplate]="teamListTpl"
              emptyIcon="fa-regular fa-users-slash"
              emptyTitle="Aucune équipe"
              emptySubtitle="Aucun résultat pour cette recherche."
              [totalRecords]="flatTeamRows.length"
              [paginatorFirst]="teamsPageFirst"
              [paginatorRows]="teamsPageSize"
              [rowsPerPageOptions]="[10, 25, 50]"
              (pageChange)="onTeamsPageChange($event)"
              viewMode="list"
            >
              <p-button label="Nouvelle équipe" icon="fa-regular fa-users-medical" rounded size="small" toolbar-actions (onClick)="showCreateTeamDialog.set(true)" />
            </app-data-list>
          </div>

          @if (selectedTeam) {
            <div class="teams-panel">
              <app-team-panel
                [team]="selectedTeam"
                (close)="selectTeam(selectedTeam!)"
                (teamChanged)="onTeamRenamed($event)"
                (teamDeleted)="onTeamDeleted()"
                (addSubTeam)="onAddSubTeam()"
              />
            </div>
          }
        </div>

        <ng-template #teamListTpl>
          @for (row of paginatedTeamRows; track row.team.id) {
            <div class="team-row" [class.is-selected]="selectedTeam?.id === row.team.id" (click)="selectTeam(row.team)">
              @if (row.hasChildren) {
                <button class="team-chevron" [class.is-expanded]="row.isExpanded" [style.margin-left.rem]="row.depth * 2.5" (click)="toggleTeam(row.team.id); $event.stopPropagation()" type="button">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              } @else {
                <span class="team-dot" [style.margin-left.rem]="row.depth * 1.5"></span>
              }

              <div class="team-info">
                <span class="team-name">{{ row.team.name }}</span>
              </div>

              <div class="team-actions">
                <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" (onClick)="$event.stopPropagation()" />
              </div>
            </div>
          }
        </ng-template>
      }

      @if (currentFacet === 'settings') {
        <div class="org-body">
          @if (contextSwitcher.selectedOrganization(); as org) {
            <div class="org-section">
              <div class="org-avatar-block">
                <app-org-avatar [initials]="selectedOrgInitials()" size="3.5rem" fontSize="0.875rem" radius="0.625rem" />
                <div class="org-avatar-info">
                  <span class="org-avatar-name">{{ org.name }}</span>
                  <span class="org-avatar-meta">{{ org.status_label }} · Créé le {{ org.created_at | date:'dd/MM/yyyy' }}</span>
                </div>
              </div>
            </div>

            <div class="org-section">
              <h3 class="org-section-title">Informations de l'organisation</h3>
              <div class="org-form">
                <div class="org-field org-field--full">
                  <label class="org-label">Nom</label>
                  <input pInputText pSize="small" [(ngModel)]="orgName" placeholder="Nom de l'organisation" />
                </div>
                <div class="org-field org-field--full">
                  <label class="org-label">Email de contact <span class="org-label-hint">(optionnel)</span></label>
                  <input pInputText pSize="small" type="email" [(ngModel)]="orgContactEmail" placeholder="contact@exemple.fr" />
                </div>
                <div class="org-field org-field--full">
                  <label class="org-label">Référence externe <span class="org-label-hint">(optionnel)</span></label>
                  <input pInputText pSize="small" [(ngModel)]="orgExternalRef" placeholder="ERP-001" />
                </div>
              </div>
            </div>

            <div class="org-section">
              <div class="org-section-header">
                <h3 class="org-section-title">Clés API</h3>
                <p-button label="Nouvelle clé" icon="fa-regular fa-plus" [text]="true" severity="secondary" size="small" rounded (onClick)="showGenerateForm.set(!showGenerateForm())" />
              </div>
              <p class="org-section-hint">
                Utilisez ces clés pour authentifier les appels à l'API Sardine.
                <a class="org-doc-link" [href]="apiDocsUrl" target="_blank" rel="noopener noreferrer">
                  <i class="fa-regular fa-arrow-up-right-from-square"></i> Documentation API
                </a>
              </p>

              @if (showGenerateForm()) {
                <div class="api-key-form">
                  <input pInputText pSize="small" [(ngModel)]="newKeyName" placeholder="Nom de la clé (ex : Production)" (keyup.enter)="generateKey()" />
                  <p-button label="Créer" size="small" rounded [disabled]="!newKeyName.trim()" (onClick)="generateKey()" />
                  <p-button icon="fa-regular fa-xmark" severity="secondary" [text]="true" size="small" rounded (onClick)="showGenerateForm.set(false); newKeyName = ''" />
                </div>
              }

              @if (newlyGeneratedKey()) {
                <div class="api-key-reveal">
                  <div class="api-key-reveal__header">
                    <i class="fa-regular fa-triangle-exclamation"></i>
                    <span>Copiez cette clé maintenant, elle ne sera plus jamais affichée.</span>
                  </div>
                  <div class="api-key-reveal__value">
                    <code>{{ newlyGeneratedKey()!.token }}</code>
                    <p-button icon="fa-regular fa-copy" [text]="true" size="small" rounded pTooltip="Copier" (onClick)="copyNewKey()" />
                  </div>
                  <div class="api-key-reveal__footer">
                    <p-button label="J'ai copié la clé" icon="fa-regular fa-check" size="small" rounded (onClick)="newlyGeneratedKey.set(null)" />
                  </div>
                </div>
              }

              @if (apiKeys().length > 0) {
                <div class="api-keys-list">
                  @for (key of apiKeys(); track key.id) {
                    <div class="api-keys-list__row" [class.is-revoked]="key.status === 0">
                      <div class="akl-main">
                        <span class="akl-name">{{ key.name }}</span>
                        <code class="akl-prefix">{{ key.prefix }}••••••••</code>
                      </div>
                      <span class="akl-date">{{ key.created_at | date: 'dd/MM/yyyy' }}</span>
                      <span class="key-status" [class.is-active]="key.status === 1">
                        <span class="key-status__dot"></span>
                        {{ key.status_label }}
                      </span>
                      <div class="akl-actions">
                        @if (key.status === 1) {
                          <p-button icon="fa-regular fa-ban" [text]="true" size="small" rounded pTooltip="Révoquer" tooltipPosition="left" (onClick)="revokeKey(key)" />
                        }
                        <p-button icon="fa-regular fa-trash" severity="danger" [text]="true" size="small" rounded pTooltip="Supprimer" tooltipPosition="left" (onClick)="deleteKey(key)" />
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="api-keys-empty">Aucune clé API. Créez-en une pour commencer.</p>
              }
            </div>

            <div class="org-actions">
              <p-button label="Enregistrer les modifications" icon="fa-regular fa-check" rounded size="small" [loading]="orgSaving()" (onClick)="saveOrg()" />
            </div>
          }
        </div>
      }
    </app-page>

    <app-invite-members-dialog [(visible)]="showInviteDialog" (invited)="loadMembers()" />
    <app-create-org-dialog [(visible)]="showCreateOrgDialog" (created)="onOrgCreated($event)" />
    <app-create-team-dialog [(visible)]="showCreateTeamDialog" [parentTeamId]="createParentTeamId() ?? rootTeamId()" (created)="onTeamCreated($event)" (visibleChange)="!$event && createParentTeamId.set(null)" />
  `,
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly contextSwitcher = inject(ContextSwitcherService);

  readonly isPersonal = computed(() => {
    const orgs = this.contextSwitcher.organizations();
    const id = this.contextSwitcher.selectedId();
    return orgs.find((o) => o.id === id)?.isPersonal ?? false;
  });

  readonly facets = computed<Facet[]>(() => {
    const personal = this.isPersonal();
    return [
      { id: 'members',       label: 'Membres',        disabled: personal },
      { id: 'teams',         label: 'Équipes',         disabled: personal },
      { id: 'organizations', label: 'Organisations',   disabled: personal },
      { id: 'settings',      label: 'Paramètres' },
    ];
  });

  readonly defaultFacetId = computed(() => this.isPersonal() ? 'settings' : 'members');

  readonly selectedOrgInitials = computed(() => {
    const orgs = this.contextSwitcher.organizations();
    const id = this.contextSwitcher.selectedId();
    return orgs.find((o) => o.id === id)?.initials ?? '';
  });

  facetConfigs: Record<string, FacetConfig> = {
    members: { searchPlaceholder: 'Rechercher un membre...', actionLabel: 'Ajouter un membre', actionIcon: 'fa-regular fa-user-plus' },
    teams: { searchPlaceholder: 'Rechercher une équipe...', actionLabel: 'Ajouter une équipe', actionIcon: 'fa-regular fa-users-medical' },
    organizations: { searchPlaceholder: 'Rechercher une organisation...', actionLabel: 'Ajouter une organisation', actionIcon: 'fa-regular fa-plus' },
  };

  currentConfig: FacetConfig | null = this.facetConfigs['members'];
  currentFacet = 'members';
  search = '';
  activeFilters: ActiveFilter[] = [];
  activeSorts: ActiveSort[] = [];
  pageFirst = 0;
  private _pageSize = parseInt(localStorage.getItem('pageSize:settings') ?? '10', 10);
  get pageSize(): number { return this._pageSize; }
  set pageSize(value: number) { this._pageSize = value; localStorage.setItem('pageSize:settings', String(value)); }

  memberColumns: ListColumn[] = [
    { label: 'Membre', cssClass: 'col-flex' },
    { label: 'Rôle', cssClass: 'col-role' },
    { label: 'Statut', cssClass: 'col-status' },
    { label: '', cssClass: 'col-actions' },
  ];

  teamColumns: ListColumn[] = [
    { label: 'Équipe', cssClass: 'col-flex' },
    { label: '', cssClass: 'col-actions' },
  ];

  readonly teamSortDefs: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
  ];
  teamActiveSorts: ActiveSort[] = [];

  orgColumns: ListColumn[] = [
    { label: 'Référence', cssClass: 'col-ref' },
    { label: 'Organisation', cssClass: 'col-flex' },
    { label: 'Statut', cssClass: 'col-status' },
    { label: '', cssClass: 'col-actions' },
  ];

  readonly memberFilterDefs: FilterDefinition[] = [
    { id: 'role', label: 'Rôle', type: 'select', options: [
      { value: '1', label: 'Propriétaire' },
      { value: '2', label: 'Membre' },
    ]},
    { id: 'status', label: 'Statut', type: 'select', options: [
      { value: '1', label: 'Actif' },
      { value: '0', label: 'Inactif' },
    ]},
  ];

  readonly memberSortDefs: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'role', label: 'Rôle' },
  ];

  readonly orgFilterDefs: FilterDefinition[] = [
    { id: 'status', label: 'Statut', type: 'select', options: [
      { value: '1', label: 'Active' },
      { value: '0', label: 'Inactive' },
    ]},
  ];

  readonly orgSortDefs: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
  ];

  readonly orgMembers = signal<ApiOrgMember[]>([]);
  readonly loadingMembers = signal(false);
  readonly showInviteDialog = signal(false);

  readonly childOrgs = signal<ApiOrganization[]>([]);
  readonly loadingChildOrgs = signal(false);
  readonly showCreateOrgDialog = signal(false);

  get filteredMembers(): ApiOrgMember[] {
    const q = this.search.toLowerCase();
    let result = this.orgMembers().filter((m) =>
      !q || `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) || m.role_label.toLowerCase().includes(q)
    );
    for (const f of this.activeFilters) {
      if (f.definitionId === 'role') result = result.filter((m) => String(m.role) === f.value);
      if (f.definitionId === 'status') result = result.filter((m) => String(m.status) === f.value);
    }
    for (const s of this.activeSorts) {
      const dir = s.direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        if (s.definitionId === 'name') return dir * `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`);
        if (s.definitionId === 'role') return dir * (a.role - b.role);
        return 0;
      });
    }
    return result;
  }

  get paginatedMembers(): ApiOrgMember[] {
    return this.filteredMembers.slice(this.pageFirst, this.pageFirst + this.pageSize);
  }

  get filteredOrganizations(): ApiOrganization[] {
    const q = this.search.toLowerCase();
    let result = this.childOrgs().filter((o) =>
      !q || o.name.toLowerCase().includes(q) || (o.external_reference ?? '').toLowerCase().includes(q)
    );
    for (const f of this.activeFilters) {
      if (f.definitionId === 'status') result = result.filter((o) => f.value === '1' ? o.status === 1 : o.status === 0);
    }
    for (const s of this.activeSorts) {
      const dir = s.direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        if (s.definitionId === 'name') return dir * a.name.localeCompare(b.name);
        return 0;
      });
    }
    return result;
  }

  get paginatedOrganizations(): ApiOrganization[] {
    return this.filteredOrganizations.slice(this.pageFirst, this.pageFirst + this.pageSize);
  }

  onOrgCreated(org: ApiOrganization): void {
    this.childOrgs.update((list) => [...list, org]);
    this.contextSwitcher.appendOrganization(org);
  }

  loadChildOrgs(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    this.loadingChildOrgs.set(true);
    this.orgService.getChildOrganizations(org.id).subscribe({
      next: (list) => { this.childOrgs.set(list); this.loadingChildOrgs.set(false); },
      error: () => this.loadingChildOrgs.set(false),
    });
  }

  // ── Teams ──
  readonly teams = signal<Team[]>([]);
  readonly loadingTeams = signal(false);
  readonly showCreateTeamDialog = signal(false);
  teamsSearch = '';
  selectedTeam: Team | null = null;
  private teamsExpandedIds: string[] = [];
  teamsPageFirst = 0;
  teamsPageSize = 10;

  selectTeam(team: Team): void {
    if (this.selectedTeam?.id === team.id) {
      this.selectedTeam = null;
      this.router.navigate([], { relativeTo: this.route, replaceUrl: true, queryParams: { select: null }, queryParamsHandling: 'merge' });
    } else {
      this.selectedTeam = team;
      this.router.navigate([], { relativeTo: this.route, replaceUrl: true, queryParams: { select: team.id }, queryParamsHandling: 'merge' });
    }
  }

  private findTeamById(teams: Team[], id: string): Team | null {
    for (const t of teams) {
      if (t.id === id) return t;
      if (t.children) {
        const found = this.findTeamById(t.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private mapTeamNode(node: ApiTeamNode): Team {
    return {
      id: node.id,
      name: node.name,
      is_root: node.is_root,
      is_member: node.is_member,
      children: node.children?.map((c) => this.mapTeamNode(c)),
    };
  }

  loadTeams(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    this.loadingTeams.set(true);
    this.teamService.getTeamTree(org.id).subscribe({
      next: (nodes) => {
        const mapped = nodes.map((n) => this.mapTeamNode(n));
        this.teams.set(mapped);
        this.loadingTeams.set(false);

        const selectId = this.route.snapshot.queryParamMap.get('select');
        if (selectId && !this.selectedTeam) {
          const team = this.findTeamById(mapped, selectId);
          if (team) this.selectedTeam = team;
        }
      },
      error: () => this.loadingTeams.set(false),
    });
  }

  private sortedTeams(teams: Team[]): Team[] {
    if (!this.teamActiveSorts.length) return teams;
    const { definitionId, direction } = this.teamActiveSorts[0];
    const dir = direction === 'asc' ? 1 : -1;
    return [...teams].sort((a, b) => {
      if (definitionId === 'name') return dir * a.name.localeCompare(b.name);
      return 0;
    });
  }

  readonly rootTeamId = computed(() => this.teams().find((t) => t.is_root)?.id ?? null);
  readonly createParentTeamId = signal<string | null>(null);

  private get topLevelTeams(): Team[] {
    const roots = this.teams().filter((t) => t.is_root);
    return roots.length ? (roots[0].children ?? []) : this.teams().filter((t) => !t.is_root);
  }

  get flatTeamRows(): FlatTeamRow[] {
    const expanded = new Set(this.teamsExpandedIds);
    const search = this.teamsSearch.toLowerCase().trim();

    if (search) {
      const rows: FlatTeamRow[] = [];
      const flattenAll = (teams: Team[], depth: number) => {
        for (const team of this.sortedTeams(teams)) {
          if (team.name.toLowerCase().includes(search))
            rows.push({ team, depth, hasChildren: !!(team.children?.length), isExpanded: false });
          if (team.children?.length) flattenAll(team.children, depth + 1);
        }
      };
      flattenAll(this.topLevelTeams, 0);
      return rows;
    }

    const rows: FlatTeamRow[] = [];
    const flatten = (teams: Team[], depth: number) => {
      for (const team of this.sortedTeams(teams)) {
        const hasChildren = !!(team.children?.length);
        const isExpanded = expanded.has(team.id);
        rows.push({ team, depth, hasChildren, isExpanded });
        if (hasChildren && isExpanded) flatten(team.children!, depth + 1);
      }
    };
    flatten(this.topLevelTeams, 0);
    return rows;
  }

  get paginatedTeamRows(): FlatTeamRow[] {
    return this.flatTeamRows.slice(this.teamsPageFirst, this.teamsPageFirst + this.teamsPageSize);
  }

  onTeamsPageChange(event: PaginatorState): void {
    this.teamsPageFirst = event.first ?? 0;
    if (event.rows != null) this.teamsPageSize = event.rows;
  }

  onAddSubTeam(): void {
    this.createParentTeamId.set(this.selectedTeam!.id);
    this.showCreateTeamDialog.set(true);
  }

  onTeamCreated(_teamId: string): void {
    this.createParentTeamId.set(null);
    this.loadTeams();
  }

  onTeamRenamed(newName: string): void {
    if (this.selectedTeam) {
      this.selectedTeam = { ...this.selectedTeam, name: newName };
    }
    this.loadTeams();
  }

  onTeamDeleted(): void {
    this.selectedTeam = null;
    this.router.navigate([], { relativeTo: this.route, replaceUrl: true, queryParams: { select: null }, queryParamsHandling: 'merge' });
    this.loadTeams();
  }

  toggleTeam(id: string): void {
    if (this.teamsExpandedIds.includes(id)) {
      this.teamsExpandedIds = this.teamsExpandedIds.filter(i => i !== id);
    } else {
      this.teamsExpandedIds = [...this.teamsExpandedIds, id];
    }
  }

  private readonly orgService = inject(OrganizationService);
  private readonly teamService = inject(TeamService);

  readonly apiDocsUrl = environment.apiUrl.replace('/api', '/docs');

  orgName = '';
  orgContactEmail = '';
  orgExternalRef = '';
  orgSaving = signal(false);

  apiKeys = signal<ApiKeyRead[]>([]);
  newlyGeneratedKey = signal<ApiKeyCreated | null>(null);
  showGenerateForm = signal(false);
  newKeyName = '';

  constructor(private messageService: MessageService) {
    effect(() => {
      if (this.isPersonal()) {
        this.currentFacet = 'settings';
        this.currentConfig = null;
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { facet: 'settings' },
          queryParamsHandling: 'merge',
        });
      }
    });

    effect(() => {
      const org = this.contextSwitcher.selectedOrganization();
      if (org) {
        this.orgName = org.name;
        this.orgContactEmail = org.contact_email ?? '';
        this.orgExternalRef = org.external_reference ?? '';
        this.loadApiKeys();
        this.loadTeams();
        this.loadMembers();
        this.loadChildOrgs();
      }
    });
  }

  saveOrg(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    this.orgSaving.set(true);
    this.orgService.updateOrganization(org.id, {
      name: this.orgName,
      contact_email: this.orgContactEmail || null,
      external_reference: this.orgExternalRef || null,
    }).subscribe({
      next: () => {
        this.orgSaving.set(false);
        this.messageService.add({ severity: 'success', summary: 'Enregistré', detail: 'Les informations ont été mises à jour.' });
      },
      error: () => {
        this.orgSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de sauvegarder les modifications.' });
      },
    });
  }

  private readonly memberCm = viewChild<ContextMenu>('memberCm');

  onMemberMenuOpen(event: MouseEvent, member: ApiOrgMember): void {
    const cm = this.memberCm();
    if (!cm) return;
    cm.model = [
      member.role === 2
        ? { label: 'Promouvoir en Propriétaire', icon: 'fa-regular fa-shield-check', command: () => this.onMemberRoleChange({ userId: member.user_id, role: 1 }) }
        : { label: 'Rétrograder en Membre',      icon: 'fa-regular fa-shield-minus',  command: () => this.onMemberRoleChange({ userId: member.user_id, role: 2 }) },
      { separator: true },
      member.status === 1
        ? { label: 'Désactiver', icon: 'fa-regular fa-user-slash', command: () => this.onMemberStatusChange({ userId: member.user_id, status: 0 }) }
        : { label: 'Activer',    icon: 'fa-regular fa-user-check', command: () => this.onMemberStatusChange({ userId: member.user_id, status: 1 }) },
    ] as MenuItem[];
    cm.show(event);
  }

  onMemberRoleChange(event: { userId: string; role: 1 | 2 }): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    this.orgService.updateMemberRole(org.id, event.userId, event.role).subscribe({
      next: (updated) => {
        this.orgMembers.update((list) => list.map((m) => m.user_id === updated.user_id ? updated : m));
        const label = event.role === 1 ? 'Propriétaire' : 'Membre';
        this.messageService.add({ severity: 'success', summary: 'Rôle mis à jour', detail: `Le membre est maintenant ${label}.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de modifier le rôle du membre.' }),
    });
  }

  onMemberStatusChange(event: { userId: string; status: 0 | 1 }): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    this.orgService.updateMemberStatus(org.id, event.userId, event.status).subscribe({
      next: (updated) => {
        this.orgMembers.update((list) => list.map((m) => m.user_id === updated.user_id ? updated : m));
        this.messageService.add({ severity: 'success', summary: 'Statut mis à jour', detail: `Le membre a été ${event.status === 1 ? 'activé' : 'désactivé'}.` });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de modifier le statut du membre.' }),
    });
  }

  loadMembers(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    this.loadingMembers.set(true);
    this.orgService.getOrgMembers(org.id).subscribe({
      next: (list) => { this.orgMembers.set(list); this.loadingMembers.set(false); },
      error: () => this.loadingMembers.set(false),
    });
  }

  private loadApiKeys(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    this.orgService.getApiKeys(org.id).subscribe((res) => this.apiKeys.set(res.items));
  }

  generateKey(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!this.newKeyName.trim() || !org) return;
    this.orgService.createApiKey(org.id, this.newKeyName.trim()).subscribe({
      next: (created) => {
        this.apiKeys.update((keys) => [created, ...keys]);
        this.newlyGeneratedKey.set(created);
        this.showGenerateForm.set(false);
        this.newKeyName = '';
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de créer la clé.' }),
    });
  }

  revokeKey(key: ApiKeyRead): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    this.orgService.revokeApiKey(org.id, key.id).subscribe({
      next: (updated) => this.apiKeys.update((keys) => keys.map((k) => k.id === updated.id ? updated : k)),
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de révoquer la clé.' }),
    });
  }

  deleteKey(key: ApiKeyRead): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org) return;
    this.orgService.deleteApiKey(org.id, key.id).subscribe({
      next: () => {
        this.apiKeys.update((keys) => keys.filter((k) => k.id !== key.id));
        if (this.newlyGeneratedKey()?.id === key.id) this.newlyGeneratedKey.set(null);
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de supprimer la clé.' }),
    });
  }

  copyNewKey(): void {
    const entry = this.newlyGeneratedKey();
    if (!entry) return;
    navigator.clipboard.writeText(entry.token).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Clé copiée', detail: 'La clé a été copiée dans le presse-papier.' });
    });
  }

  onFacetChange(facet: Facet): void {
    this.currentFacet = facet.id;
    this.currentConfig = this.facetConfigs[facet.id] ?? null;
    this.search = '';
    this.activeFilters = [];
    this.activeSorts = [];
    this.pageFirst = 0;
    this.teamsPageFirst = 0;
    this.selectedTeam = null;
    this.router.navigate([], { relativeTo: this.route, replaceUrl: true, queryParams: { select: null }, queryParamsHandling: 'merge' });
  }

  onPageChange(event: PaginatorState): void {
    this.pageFirst = event.first ?? 0;
    if (event.rows != null) this.pageSize = event.rows;
  }
}

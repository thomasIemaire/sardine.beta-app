import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorState } from 'primeng/paginator';
import { MessageService } from 'primeng/api';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { DataListComponent, ListColumn } from '../../shared/components/data-list/data-list.component';
import type { ActiveFilter, ActiveSort, FilterDefinition, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import { MemberRowComponent, Member } from '../../shared/components/member-row/member-row.component';
import { OrgRowComponent, Organization } from '../../shared/components/org-row/org-row.component';
import { TeamPanelComponent } from './team-panel.component';

export interface Team {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: Date;
  children?: Team[];
}

interface FlatTeamRow {
  team: Team;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

const TEAMS: Team[] = [
  {
    id: 't1', name: 'Engineering', description: 'Équipe technique', memberCount: 12, createdAt: new Date('2024-03-10'),
    children: [
      {
        id: 't1-1', name: 'Frontend', memberCount: 5, createdAt: new Date('2024-04-01'),
        children: [
          { id: 't1-1-1', name: 'Design System', memberCount: 2, createdAt: new Date('2024-06-15') },
        ],
      },
      {
        id: 't1-2', name: 'Backend', memberCount: 7, createdAt: new Date('2024-04-01'),
        children: [
          { id: 't1-2-1', name: 'API', memberCount: 3, createdAt: new Date('2024-05-20') },
          { id: 't1-2-2', name: 'Infrastructure', memberCount: 4, createdAt: new Date('2024-07-08') },
        ],
      },
    ],
  },
  {
    id: 't2', name: 'Marketing', memberCount: 8, createdAt: new Date('2024-03-22'),
    children: [
      { id: 't2-1', name: 'Contenu', memberCount: 3, createdAt: new Date('2024-05-05') },
      { id: 't2-2', name: 'Growth', memberCount: 5, createdAt: new Date('2024-08-12') },
    ],
  },
  { id: 't3', name: 'Support', memberCount: 6, createdAt: new Date('2024-02-14') },
  {
    id: 't4', name: 'Produit', memberCount: 10, createdAt: new Date('2024-09-01'),
    children: [
      { id: 't4-1', name: 'UX Research', memberCount: 4, createdAt: new Date('2024-09-15') },
      { id: 't4-2', name: 'Product Management', memberCount: 6, createdAt: new Date('2024-10-03') },
    ],
  },
];

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  status: 'active' | 'revoked';
}

interface FacetConfig {
  searchPlaceholder: string;
  actionLabel: string;
  actionIcon: string;
}

@Component({
  selector: 'app-settings',
  imports: [DatePipe, FormsModule, ButtonModule, InputTextModule, ToastModule, TooltipModule, PageComponent, HeaderPageComponent, DataListComponent, MemberRowComponent, OrgRowComponent, TeamPanelComponent],
  providers: [MessageService],
  template: `
    <p-toast position="bottom-right" [life]="3000" />

    <app-page>
      <app-header-page
        title="Administration"
        subtitle="Gérez votre organisation"
        [facets]="facets"
        defaultFacetId="members"
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
          <p-button [label]="currentConfig!.actionLabel" [icon]="currentConfig!.actionIcon" rounded size="small" toolbar-actions />
        </app-data-list>

        <ng-template #memberListTpl>
          @for (member of paginatedMembers; track member.id) {
            <app-member-row [member]="member" />
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
          <p-button [label]="currentConfig!.actionLabel" [icon]="currentConfig!.actionIcon" rounded size="small" toolbar-actions />
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
              <p-button label="Nouvelle équipe" icon="fa-regular fa-users-medical" rounded size="small" toolbar-actions />
            </app-data-list>
          </div>

          @if (selectedTeam) {
            <div class="teams-panel">
              <app-team-panel [team]="selectedTeam" (close)="selectedTeam = null" />
            </div>
          }
        </div>

        <ng-template #teamListTpl>
          @for (row of paginatedTeamRows; track row.team.id) {
            <div class="team-row" [class.is-selected]="selectedTeam === row.team" (click)="selectTeam(row.team)">
              @if (row.hasChildren) {
                <button class="team-chevron" [class.is-expanded]="row.isExpanded" [style.margin-left.rem]="row.depth * 2.5" (click)="toggleTeam(row.team.id); $event.stopPropagation()" type="button">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              } @else {
                <span class="team-dot" [style.margin-left.rem]="row.depth * 1.5"></span>
              }

              <div class="team-info">
                <span class="team-name">{{ row.team.name }}</span>
                @if (row.team.description) {
                  <span class="team-desc">{{ row.team.description }}</span>
                }
              </div>

              <span class="team-date">{{ row.team.createdAt | date:'dd/MM/yyyy' }}</span>

              <span class="team-members-count">
                <i class="fa-regular fa-user"></i>
                {{ row.team.memberCount }}
              </span>

              <div class="team-actions">
                <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" (onClick)="$event.stopPropagation()" />
              </div>
            </div>
          }
        </ng-template>
      }

      @if (currentFacet === 'settings') {
        <div class="org-body">
          <div class="org-section">
            <div class="org-avatar-block">
              <div class="org-avatar">SD</div>
              <div class="org-avatar-info">
                <span class="org-avatar-name">Sendoc</span>
                <p-button label="Changer le logo" severity="secondary" size="small" rounded />
              </div>
            </div>
          </div>

          <div class="org-section">
            <h3 class="org-section-title">Informations de l'organisation</h3>
            <div class="org-form">
              <div class="org-field org-field--full">
                <label class="org-label">Nom de l'organisation</label>
                <input pInputText pSize="small" [(ngModel)]="orgName" placeholder="Nom" />
              </div>
              <div class="org-field org-field--full">
                <label class="org-label">Email de contact</label>
                <input pInputText pSize="small" [(ngModel)]="orgEmail" placeholder="contact@sendoc.fr" type="email" />
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
              <a class="org-doc-link" href="https://docs.sardine.ai/api" target="_blank" rel="noopener noreferrer">
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
                  <code>{{ newlyGeneratedKey()!.fullValue }}</code>
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
                  <div class="api-keys-list__row" [class.is-revoked]="key.status === 'revoked'">
                    <div class="akl-main">
                      <span class="akl-name">{{ key.name }}</span>
                      <code class="akl-prefix">{{ key.prefix }}••••••••</code>
                    </div>
                    <span class="akl-date">{{ key.createdAt | date: 'dd/MM/yyyy' }}</span>
                    <span class="key-status" [class.is-active]="key.status === 'active'">
                      <span class="key-status__dot"></span>
                      {{ key.status === 'active' ? 'Active' : 'Révoquée' }}
                    </span>
                    <div class="akl-actions">
                      @if (key.status === 'active') {
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
            <p-button label="Enregistrer les modifications" icon="fa-regular fa-check" rounded size="small" />
          </div>
        </div>
      }
    </app-page>
  `,
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  facets: Facet[] = [
    { id: 'members', label: 'Membres' },
    { id: 'teams', label: 'Équipes' },
    { id: 'organizations', label: 'Organisations' },
    { id: 'settings', label: 'Paramètres' },
  ];

  facetConfigs: Record<string, FacetConfig> = {
    members: { searchPlaceholder: 'Rechercher un membre...', actionLabel: 'Ajouter un membre', actionIcon: 'fa-regular fa-user-plus' },
    teams: { searchPlaceholder: 'Rechercher une équipe...', actionLabel: 'Ajouter une équipe', actionIcon: 'fa-regular fa-users-medical' },
    organizations: { searchPlaceholder: 'Rechercher une organisation...', actionLabel: 'Ajouter une organisation', actionIcon: 'fa-regular fa-plus' },
  };

  readonly contextSwitcher = inject(ContextSwitcherService);

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
    { label: 'Créé le', cssClass: 'col-date' },
    { label: 'Membres', cssClass: 'col-count' },
    { label: '', cssClass: 'col-actions' },
  ];

  readonly teamSortDefs: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'createdAt', label: 'Date de création' },
  ];
  teamActiveSorts: ActiveSort[] = [];

  orgColumns: ListColumn[] = [
    { label: 'Organisation', cssClass: 'col-flex' },
    { label: 'Type', cssClass: 'col-type' },
    { label: 'Membres', cssClass: 'col-count' },
    { label: 'Statut', cssClass: 'col-status' },
    { label: '', cssClass: 'col-actions' },
  ];

  readonly memberFilterDefs: FilterDefinition[] = [
    { id: 'role', label: 'Rôle', type: 'select', options: [
      { value: 'Administrateur', label: 'Administrateur' },
      { value: 'Éditeur', label: 'Éditeur' },
      { value: 'Lecteur', label: 'Lecteur' },
    ]},
    { id: 'status', label: 'Statut', type: 'select', options: [
      { value: 'active', label: 'Actif' },
      { value: 'inactive', label: 'Inactif' },
    ]},
  ];

  readonly memberSortDefs: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'role', label: 'Rôle' },
  ];

  readonly orgFilterDefs: FilterDefinition[] = [
    { id: 'type', label: 'Type', type: 'select', options: [
      { value: 'Organisation principale', label: 'Organisation principale' },
      { value: 'Client', label: 'Client' },
      { value: 'Partenaire', label: 'Partenaire' },
    ]},
    { id: 'status', label: 'Statut', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]},
  ];

  readonly orgSortDefs: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'members', label: 'Membres' },
  ];

  readonly members: Member[] = [
    { id: '1', firstName: 'Thomas',  lastName: 'Lemaire', email: 'thomas.lemaire@sendoc.fr',  role: 'Administrateur', active: true },
    { id: '2', firstName: 'Marie',   lastName: 'Dupont',  email: 'marie.dupont@sendoc.fr',    role: 'Éditeur',        active: true },
    { id: '3', firstName: 'Lucas',   lastName: 'Martin',  email: 'lucas.martin@sendoc.fr',    role: 'Lecteur',        active: true },
    { id: '4', firstName: 'Camille', lastName: 'Bernard', email: 'camille.bernard@sendoc.fr', role: 'Éditeur',        active: false },
    { id: '5', firstName: 'Julie',   lastName: 'Moreau',  email: 'julie.moreau@sendoc.fr',    role: 'Lecteur',        active: true },
  ];

  readonly organizations: Organization[] = [
    { id: '1', name: 'Sendoc',       initials: 'SD', type: 'Organisation principale', membersCount: 5,  active: true  },
    { id: '2', name: 'Terre du sud', initials: 'TS', type: 'Client',                  membersCount: 3,  active: true  },
    { id: '3', name: "T'Rhéa",       initials: 'TR', type: 'Client',                  membersCount: 2,  active: true  },
    { id: '4', name: 'Agri Conseil', initials: 'AC', type: 'Partenaire',              membersCount: 1,  active: false },
  ];

  get filteredMembers(): Member[] {
    const q = this.search.toLowerCase();
    let result = this.members.filter((m) =>
      !q || `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
    );
    for (const f of this.activeFilters) {
      if (f.definitionId === 'role') result = result.filter((m) => m.role === f.value);
      if (f.definitionId === 'status') result = result.filter((m) => f.value === 'active' ? m.active : !m.active);
    }
    for (const s of this.activeSorts) {
      const dir = s.direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        if (s.definitionId === 'name') return dir * `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`);
        if (s.definitionId === 'role') return dir * a.role.localeCompare(b.role);
        return 0;
      });
    }
    return result;
  }

  get paginatedMembers(): Member[] {
    return this.filteredMembers.slice(this.pageFirst, this.pageFirst + this.pageSize);
  }

  get filteredOrganizations(): Organization[] {
    const q = this.search.toLowerCase();
    let result = this.organizations.filter((o) =>
      !q || o.name.toLowerCase().includes(q) || o.type.toLowerCase().includes(q)
    );
    for (const f of this.activeFilters) {
      if (f.definitionId === 'type') result = result.filter((o) => o.type === f.value);
      if (f.definitionId === 'status') result = result.filter((o) => f.value === 'active' ? o.active : !o.active);
    }
    for (const s of this.activeSorts) {
      const dir = s.direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        if (s.definitionId === 'name') return dir * a.name.localeCompare(b.name);
        if (s.definitionId === 'members') return dir * (a.membersCount - b.membersCount);
        return 0;
      });
    }
    return result;
  }

  get paginatedOrganizations(): Organization[] {
    return this.filteredOrganizations.slice(this.pageFirst, this.pageFirst + this.pageSize);
  }

  // ── Teams ──
  teamsSearch = '';
  selectedTeam: Team | null = null;
  private teamsExpandedIds: string[] = [];
  teamsPageFirst = 0;
  teamsPageSize = 10;

  selectTeam(team: Team): void {
    this.selectedTeam = this.selectedTeam === team ? null : team;
  }

  private sortedTeams(teams: Team[]): Team[] {
    if (!this.teamActiveSorts.length) return teams;
    const { definitionId, direction } = this.teamActiveSorts[0];
    const dir = direction === 'asc' ? 1 : -1;
    return [...teams].sort((a, b) => {
      if (definitionId === 'name') return dir * a.name.localeCompare(b.name);
      if (definitionId === 'createdAt') return dir * (a.createdAt.getTime() - b.createdAt.getTime());
      return 0;
    });
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
      flattenAll(TEAMS, 0);
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
    flatten(TEAMS, 0);
    return rows;
  }

  get paginatedTeamRows(): FlatTeamRow[] {
    return this.flatTeamRows.slice(this.teamsPageFirst, this.teamsPageFirst + this.teamsPageSize);
  }

  onTeamsPageChange(event: PaginatorState): void {
    this.teamsPageFirst = event.first ?? 0;
    if (event.rows != null) this.teamsPageSize = event.rows;
  }

  toggleTeam(id: string): void {
    if (this.teamsExpandedIds.includes(id)) {
      this.teamsExpandedIds = this.teamsExpandedIds.filter(i => i !== id);
    } else {
      this.teamsExpandedIds = [...this.teamsExpandedIds, id];
    }
  }

  orgName = 'Sendoc';
  orgDomain = 'sendoc.fr';
  orgEmail = 'contact@sendoc.fr';

  apiKeys = signal<ApiKey[]>([
    { id: '1', name: 'Production', prefix: 'srd_a3f8c2e1', createdAt: new Date('2026-01-15'), status: 'active' },
  ]);
  newlyGeneratedKey = signal<{ key: ApiKey; fullValue: string } | null>(null);
  showGenerateForm = signal(false);
  newKeyName = '';

  constructor(private messageService: MessageService) {}

  generateKey(): void {
    if (!this.newKeyName.trim()) return;
    const fullValue = this.buildKeyValue();
    const prefix = fullValue.substring(0, 12);
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: this.newKeyName.trim(),
      prefix,
      createdAt: new Date(),
      status: 'active',
    };
    this.apiKeys.update(keys => [...keys, newKey]);
    this.newlyGeneratedKey.set({ key: newKey, fullValue });
    this.showGenerateForm.set(false);
    this.newKeyName = '';
  }

  revokeKey(key: ApiKey): void {
    this.apiKeys.update(keys => keys.map(k => k.id === key.id ? { ...k, status: 'revoked' } : k));
  }

  deleteKey(key: ApiKey): void {
    this.apiKeys.update(keys => keys.filter(k => k.id !== key.id));
    if (this.newlyGeneratedKey()?.key.id === key.id) this.newlyGeneratedKey.set(null);
  }

  copyNewKey(): void {
    const entry = this.newlyGeneratedKey();
    if (!entry) return;
    navigator.clipboard.writeText(entry.fullValue).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Clé copiée', detail: 'La clé a été copiée dans le presse-papier.' });
    });
  }

  private buildKeyValue(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'srd_';
    for (let i = 0; i < 48; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
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
  }

  onPageChange(event: PaginatorState): void {
    this.pageFirst = event.first ?? 0;
    if (event.rows != null) this.pageSize = event.rows;
  }
}

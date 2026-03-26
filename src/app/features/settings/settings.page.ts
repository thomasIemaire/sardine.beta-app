import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { MessageService } from 'primeng/api';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { ToolbarComponent, ActiveFilter, ActiveSort, FilterDefinition, SortDefinition } from '../../shared/components/toolbar/toolbar.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Administrateur' | 'Éditeur' | 'Lecteur';
  active: boolean;
}

interface Organization {
  id: string;
  name: string;
  initials: string;
  type: string;
  membersCount: number;
  active: boolean;
}

interface FacetConfig {
  searchPlaceholder: string;
  actionLabel: string;
  actionIcon: string;
}

@Component({
  selector: 'app-settings',
  imports: [FormsModule, ButtonModule, InputTextModule, ToastModule, TooltipModule, Paginator, PageComponent, HeaderPageComponent, ToolbarComponent, EmptyStateComponent],
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

      @if (currentConfig) {
        <div class="settings-toolbar">
          <app-toolbar
            [searchPlaceholder]="currentConfig.searchPlaceholder"
            [showViewMode]="false"
            [(search)]="search"
            [(filters)]="activeFilters"
            [filterDefinitions]="currentFilterDefs"
            [(sorts)]="activeSorts"
            [sortDefinitions]="currentSortDefs"
          >
            <p-button [label]="currentConfig.actionLabel" [icon]="currentConfig.actionIcon" rounded size="small" />
          </app-toolbar>
        </div>
      }

      @if (currentFacet === 'members') {
        @if (filteredMembers.length > 0) {
          <div class="admin-list">
            <div class="admin-list__header">
              <span class="admin-col admin-col--member">Membre</span>
              <span class="admin-col admin-col--role">Rôle</span>
              <span class="admin-col admin-col--status">Statut</span>
              <span class="admin-col admin-col--actions"></span>
            </div>
            @for (member of paginatedMembers; track member.id) {
              <div class="admin-list__row">
                <div class="admin-col admin-col--member">
                  <div class="admin-avatar">{{ member.firstName[0] }}{{ member.lastName[0] }}</div>
                  <div class="admin-member-info">
                    <span class="admin-member-name">{{ member.firstName }} {{ member.lastName }}</span>
                    <span class="admin-member-email">{{ member.email }}</span>
                  </div>
                </div>
                <div class="admin-col admin-col--role">
                  <span class="admin-badge" [attr.data-role]="member.role">{{ member.role }}</span>
                </div>
                <div class="admin-col admin-col--status">
                  <span class="admin-status" [class.is-active]="member.active">
                    <span class="admin-status__dot"></span>
                    {{ member.active ? 'Actif' : 'Inactif' }}
                  </span>
                </div>
                <div class="admin-col admin-col--actions">
                  <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" />
                </div>
              </div>
            }
          </div>
          <div class="admin-paginator">
            <p-paginator [first]="pageFirst" [rows]="pageSize" [totalRecords]="filteredMembers.length" [rowsPerPageOptions]="[10, 25, 50]" (onPageChange)="onPageChange($event)" />
          </div>
        } @else {
          <app-empty-state icon="fa-regular fa-users" title="Aucun membre" subtitle="Aucun résultat pour cette recherche." />
        }
      }

      @if (currentFacet === 'organizations') {
        @if (filteredOrganizations.length > 0) {
          <div class="admin-list">
            <div class="admin-list__header">
              <span class="admin-col admin-col--org">Organisation</span>
              <span class="admin-col admin-col--type">Type</span>
              <span class="admin-col admin-col--members">Membres</span>
              <span class="admin-col admin-col--status">Statut</span>
              <span class="admin-col admin-col--actions"></span>
            </div>
            @for (org of paginatedOrganizations; track org.id) {
              <div class="admin-list__row">
                <div class="admin-col admin-col--org">
                  <div class="admin-org-logo">{{ org.initials }}</div>
                  <span class="admin-member-name">{{ org.name }}</span>
                </div>
                <div class="admin-col admin-col--type">
                  <span class="admin-type">{{ org.type }}</span>
                </div>
                <div class="admin-col admin-col--members">
                  <span class="admin-count"><i class="fa-regular fa-user"></i> {{ org.membersCount }}</span>
                </div>
                <div class="admin-col admin-col--status">
                  <span class="admin-status" [class.is-active]="org.active">
                    <span class="admin-status__dot"></span>
                    {{ org.active ? 'Active' : 'Inactive' }}
                  </span>
                </div>
                <div class="admin-col admin-col--actions">
                  <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" />
                </div>
              </div>
            }
          </div>
          <div class="admin-paginator">
            <p-paginator [first]="pageFirst" [rows]="pageSize" [totalRecords]="filteredOrganizations.length" [rowsPerPageOptions]="[10, 25, 50]" (onPageChange)="onPageChange($event)" />
          </div>
        } @else {
          <app-empty-state icon="fa-regular fa-building" title="Aucune organisation" subtitle="Aucun résultat pour cette recherche." />
        }
      }

      @if (currentFacet === 'teams') {
        <app-empty-state icon="fa-regular fa-users-medical" title="Aucune équipe" subtitle="Créez votre première équipe." />
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
                <label class="org-label">Domaine</label>
                <input pInputText pSize="small" [(ngModel)]="orgDomain" placeholder="ex: sendoc.fr" />
              </div>
              <div class="org-field org-field--full">
                <label class="org-label">Email de contact</label>
                <input pInputText pSize="small" [(ngModel)]="orgEmail" placeholder="contact@sendoc.fr" type="email" />
              </div>
            </div>
          </div>

          <div class="org-section">
            <h3 class="org-section-title">Clé API</h3>
            <p class="org-section-hint">Utilisez cette clé pour authentifier les appels à l'API Sardine depuis vos applications.</p>
            <div class="org-api-row">
              <div class="org-api-key">
                @if (apiKeyVisible()) {
                  <span class="org-api-key__value">{{ apiKey }}</span>
                } @else {
                  <span class="org-api-key__masked">••••••••••••••••••••••••••••••••</span>
                }
              </div>
              <div class="org-api-actions">
                <p-button [icon]="apiKeyVisible() ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'" severity="secondary" [text]="true" rounded size="small" [pTooltip]="apiKeyVisible() ? 'Masquer' : 'Afficher'" (onClick)="apiKeyVisible.set(!apiKeyVisible())" />
                <p-button icon="fa-regular fa-copy" severity="secondary" [text]="true" rounded size="small" pTooltip="Copier la clé" (onClick)="copyApiKey()" />
                <p-button icon="fa-regular fa-rotate" severity="danger" [text]="true" rounded size="small" pTooltip="Regénérer la clé" (onClick)="regenerateApiKey()" />
              </div>
            </div>
          </div>

          <div class="org-actions">
            <p-button label="Enregistrer les modifications" icon="fa-regular fa-check" rounded size="small" />
          </div>
        </div>
      }
    </app-page>
  `,
  styles: `
    .settings-toolbar { padding: 1rem; flex-shrink: 0; }

    /* ── List ── */
    .admin-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      border-top: 1px solid var(--surface-border);
    }

    .admin-list__header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 1rem;
      background: var(--background-color-50);
      border-bottom: 1px solid var(--surface-border);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .admin-list__row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.625rem 1rem;
      border-bottom: 1px solid var(--surface-border);
      transition: background 0.15s;

      &:last-child { border-bottom: none; }
      &:hover { background: var(--background-color-50); }
    }

    .admin-col {
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
      font-weight: 500;

      &--member, &--org { flex: 1; min-width: 0; display: flex; align-items: center; gap: 0.75rem; }
      &--role { width: 120px; flex-shrink: 0; }
      &--type { width: 140px; flex-shrink: 0; color: var(--p-text-color); font-size: 0.75rem; }
      &--members { width: 80px; flex-shrink: 0; }
      &--status { width: 80px; flex-shrink: 0; }
      &--actions { width: 2rem; flex-shrink: 0; }
    }

    /* Avatar */
    .admin-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      min-width: 1.75rem;
      border-radius: 100%;
      background: var(--primary-color-100);
      color: var(--primary-color-700);
      font-size: 0.5rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .admin-org-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      min-width: 1.75rem;
      border-radius: 0.375rem;
      background: var(--background-color-100);
      border: 1px solid var(--surface-border);
      font-size: 0.5rem;
      font-weight: 700;
      color: var(--p-text-color);
      text-transform: uppercase;
    }

    .admin-member-info {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;
    }

    .admin-member-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--p-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .admin-member-email {
      font-size: 0.6875rem;
      color: var(--p-text-muted-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Badge rôle */
    .admin-badge {
      display: inline-flex;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.2rem 0.625rem;
      border-radius: 2rem;

      &[data-role='Administrateur'] { background: var(--primary-color-100); color: var(--primary-color-700); }
      &[data-role='Éditeur']        { background: var(--yellow-color-200);  color: var(--yellow-color-700); }
      &[data-role='Lecteur']        { background: var(--background-color-100); color: var(--p-text-muted-color); }
    }

    /* Status */
    .admin-status {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.6875rem;
      color: var(--p-text-muted-color);

      &__dot {
        width: 0.4rem;
        height: 0.4rem;
        border-radius: 100%;
        background: var(--p-text-muted-color);
        flex-shrink: 0;
      }

      &.is-active {
        color: var(--green-color-600);
        .admin-status__dot { background: var(--green-color-500); }
      }
    }

    .admin-count {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--p-text-color);

      i { font-size: 0.625rem; color: var(--p-text-muted-color); }
    }

    /* ── Settings tab ── */
    .org-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 640px;
      width: 100%;
      margin-inline: auto;
    }

    .org-section { display: flex; flex-direction: column; gap: 1rem; }

    .org-section-title {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--p-text-color);
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .org-section-hint { font-size: 0.75rem; color: var(--p-text-muted-color); margin: 0; }

    .org-avatar-block { display: flex; align-items: center; gap: 1rem; }

    .org-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 0.625rem;
      background: var(--primary-color-100);
      color: var(--primary-color-700);
      font-size: 0.875rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .org-avatar-info { display: flex; flex-direction: column; gap: 0.375rem; }
    .org-avatar-name { font-size: 1rem; font-weight: 600; color: var(--p-text-color); }

    .org-form { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

    .org-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      &--full { grid-column: 1 / -1; }
      input { width: 100%; }
    }

    .org-label { font-size: 0.75rem; font-weight: 500; color: var(--p-text-muted-color); }

    .org-api-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      border: 1px solid var(--surface-border);
      border-radius: 0.625rem;
      background: var(--background-color-50);
    }

    .org-api-key { flex: 1; min-width: 0; overflow: hidden; }

    .org-api-key__value { font-size: 0.6875rem; font-family: monospace; color: var(--p-text-color); word-break: break-all; }
    .org-api-key__masked { font-size: 0.6875rem; color: var(--p-text-muted-color); letter-spacing: 0.1em; }

    .org-api-actions { display: flex; align-items: center; gap: 0.125rem; flex-shrink: 0; }
    .org-actions { display: flex; justify-content: flex-end; }

    .admin-paginator {
      position: sticky;
      bottom: 0;
      margin-top: auto;
      background: var(--background-color-0);
      border-top: 1px solid var(--surface-border);
    }

    :host ::ng-deep .admin-paginator .p-paginator {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0.75rem 1rem;
      background-color: var(--background-color-50);
    }
  `,
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

  currentConfig: FacetConfig | null = this.facetConfigs['members'];
  currentFacet = 'members';
  search = '';
  activeFilters: ActiveFilter[] = [];
  activeSorts: ActiveSort[] = [];
  pageFirst = 0;
  pageSize = 10;

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

  get currentFilterDefs(): FilterDefinition[] {
    return this.currentFacet === 'members' ? this.memberFilterDefs : this.orgFilterDefs;
  }

  get currentSortDefs(): SortDefinition[] {
    return this.currentFacet === 'members' ? this.memberSortDefs : this.orgSortDefs;
  }

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

  orgName = 'Sendoc';
  orgDomain = 'sendoc.fr';
  orgEmail = 'contact@sendoc.fr';

  readonly apiKey = 'srd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  readonly apiKeyVisible = signal(false);

  constructor(private messageService: MessageService) {}

  onFacetChange(facet: Facet): void {
    this.currentFacet = facet.id;
    this.currentConfig = this.facetConfigs[facet.id] ?? null;
    this.search = '';
    this.activeFilters = [];
    this.activeSorts = [];
    this.pageFirst = 0;
  }

  onPageChange(event: PaginatorState): void {
    this.pageFirst = event.first ?? 0;
    this.pageSize = event.rows ?? this.pageSize;
  }

  copyApiKey(): void {
    navigator.clipboard.writeText(this.apiKey).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Clé copiée', detail: 'La clé API a été copiée dans le presse-papier.' });
    });
  }

  regenerateApiKey(): void {
    this.messageService.add({ severity: 'warn', summary: 'Fonctionnalité à venir', detail: 'La regénération de clé sera disponible prochainement.' });
  }
}

import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
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
import { ElementSizeDirective } from '../../shared/directives/element-size.directive';
import { MemberRowComponent, Member } from '../../shared/components/member-row/member-row.component';
import { OrgRowComponent, Organization } from '../../shared/components/org-row/org-row.component';

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
  imports: [DatePipe, FormsModule, ButtonModule, InputTextModule, ToastModule, TooltipModule, Paginator, PageComponent, HeaderPageComponent, ToolbarComponent, EmptyStateComponent, ElementSizeDirective, MemberRowComponent, OrgRowComponent],
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
          <div class="settings-list-container" [appElementSize]="{ compact: 600 }">
            <div class="settings-list-header">
              <span class="slh-col slh-main">Membre</span>
              <span class="slh-col slh-role">Rôle</span>
              <span class="slh-col slh-status">Statut</span>
              <span class="slh-col slh-actions"></span>
            </div>
            <div class="settings-list">
              @for (member of paginatedMembers; track member.id) {
                <app-member-row [member]="member" />
              }
            </div>
          </div>
          <div class="settings-paginator">
            <span class="paginator-count">{{ filteredMembers.length }} résultat{{ filteredMembers.length > 1 ? 's' : '' }}</span>
            <p-paginator [first]="pageFirst" [rows]="pageSize" [totalRecords]="filteredMembers.length" [rowsPerPageOptions]="[10, 25, 50]" (onPageChange)="onPageChange($event)" />
          </div>
        } @else {
          <app-empty-state icon="fa-regular fa-users" title="Aucun membre" subtitle="Aucun résultat pour cette recherche." />
        }
      }

      @if (currentFacet === 'organizations') {
        @if (filteredOrganizations.length > 0) {
          <div class="settings-list-container" [appElementSize]="{ compact: 600 }">
            <div class="settings-list-header">
              <span class="slh-col slh-main">Organisation</span>
              <span class="slh-col slh-type">Type</span>
              <span class="slh-col slh-count">Membres</span>
              <span class="slh-col slh-status">Statut</span>
              <span class="slh-col slh-actions"></span>
            </div>
            <div class="settings-list">
              @for (org of paginatedOrganizations; track org.id) {
                <app-org-row [org]="org" />
              }
            </div>
          </div>
          <div class="settings-paginator">
            <span class="paginator-count">{{ filteredOrganizations.length }} résultat{{ filteredOrganizations.length > 1 ? 's' : '' }}</span>
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
            <p class="org-section-hint">Utilisez ces clés pour authentifier les appels à l'API Sardine.</p>

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
  styles: `
    .settings-toolbar { padding: 1rem; flex-shrink: 0; }

    /* ── List ── */
    .settings-list-container {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      border-top: 1px solid var(--surface-border);
    }

    .settings-list-header {
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

    .slh-col {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--p-text-muted-color);

      &.slh-main    { flex: 1; }
      &.slh-role    { width: 120px; flex-shrink: 0; }
      &.slh-type    { width: 140px; flex-shrink: 0; }
      &.slh-count   { width: 80px; flex-shrink: 0; }
      &.slh-status  { width: 80px; flex-shrink: 0; }
      &.slh-actions { width: 2rem; flex-shrink: 0; }
    }

    .settings-list {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--surface-border);
      overflow: hidden;

      app-member-row + app-member-row,
      app-org-row + app-org-row {
        border-top: 1px solid var(--surface-border);
      }
    }

    .settings-list-container.compact {
      .slh-role   { width: 2rem; overflow: hidden; font-size: 0; padding: 0; }
      .slh-type   { display: none; }
      .slh-count  { display: none; }
      .slh-status { display: none; }
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

    .org-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;

      .org-section-title { padding-bottom: 0; border-bottom: none; }
    }

    .api-key-form {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: var(--background-color-50);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius-m);

      input { flex: 1; }
    }

    .api-key-reveal {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      background: var(--yellow-color-50, var(--background-color-50));
      border: 1px solid var(--yellow-color-300, var(--surface-border));
      border-radius: var(--radius-m);

      &__header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--yellow-color-800, var(--p-text-color));

        i { color: var(--yellow-color-500); }
      }

      &__value {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: var(--background-color-0);
        border: 1px solid var(--surface-border);
        border-radius: 0.375rem;
        padding: 0.375rem 0.75rem;

        code {
          flex: 1;
          font-size: 0.6875rem;
          font-family: monospace;
          word-break: break-all;
          color: var(--p-text-color);
        }
      }

      &__footer {
        display: flex;
        justify-content: flex-end;
      }
    }

    .api-keys-list {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--surface-border);
      border-radius: var(--radius-m);
      overflow: hidden;

      &__row {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.625rem 1rem;
        border-bottom: 1px solid var(--surface-border);
        transition: background 0.15s;

        &:last-child { border-bottom: none; }
        &:hover { background: var(--background-color-50); }
        &.is-revoked { opacity: 0.55; }
      }
    }

    .akl-main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .akl-name {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--p-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .akl-prefix {
      font-family: monospace;
      font-size: 0.6875rem;
      color: var(--p-text-muted-color);
    }

    .akl-date {
      width: 6rem;
      flex-shrink: 0;
      font-size: 0.625rem;
      color: var(--p-text-muted-color);
    }

    .akl-actions {
      width: 5rem;
      flex-shrink: 0;
      display: flex;
      justify-content: flex-end;
      gap: 0.125rem;
    }

    .key-status {
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
        .key-status__dot { background: var(--green-color-500); }
      }
    }

    .api-keys-empty {
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
      margin: 0;
    }

    .org-actions { display: flex; justify-content: flex-end; }

    .settings-paginator {
      position: sticky;
      bottom: 0;
      margin-top: auto;
      background: var(--background-color-50);
      border-top: 1px solid var(--surface-border);
      display: flex;
      align-items: center;
    }

    .paginator-count {
      font-size: 0.6875rem;
      color: var(--p-text-muted-color);
      padding-left: 1rem;
      white-space: nowrap;
    }

    :host ::ng-deep .settings-paginator .p-paginator {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0.875rem 1rem;
      flex: 1;
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
  }

  onPageChange(event: PaginatorState): void {
    this.pageFirst = event.first ?? 0;
    this.pageSize = event.rows ?? this.pageSize;
  }

}

import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { ToolbarComponent, ViewMode } from '../../shared/components/toolbar/toolbar.component';
import type { ActiveFilter, FilterDefinition, ActiveSort, SortDefinition } from '../../shared/components/toolbar/models/filter.models';
import { FlowCardComponent, Flow } from '../../shared/components/flow-card/flow-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-flows',
  imports: [ButtonModule, Paginator, PageComponent, HeaderPageComponent, ToolbarComponent, FlowCardComponent, EmptyStateComponent],
  template: `
    <app-page>
      <app-header-page
        title="Flows"
        subtitle="Gérez vos flux de traitement automatisés"
        [facets]="facets"
        defaultFacetId="my-flows"
        (facetChange)="onFacetChange($event)"
      >
        <button pButton icon="fa-solid fa-book-blank" label="Documentation" severity="secondary" size="small" rounded action></button>
      </app-header-page>

      <div class="flows-toolbar">
        <app-toolbar searchPlaceholder="Rechercher un flow..." [(filters)]="filters" [(search)]="search" [filterDefinitions]="filterDefinitions" [(sorts)]="sorts" [sortDefinitions]="sortDefinitions" [(viewMode)]="viewMode">
          <p-button label="Ajouter un flow" icon="fa-regular fa-plus" rounded size="small" [disabled]="isSharedFacet" />
        </app-toolbar>
      </div>

      <div class="flows-content" [class.list-mode]="viewMode === 'list'">
        @if (filteredFlows.length > 0) {
          @if (viewMode === 'grid') {
            <div class="flows-grid">
              @for (flow of paginatedFlows; track flow.name) {
                <app-flow-card [flow]="flow" layout="grid" />
              }
            </div>
          } @else {
            <div class="flows-list">
              @for (flow of paginatedFlows; track flow.name) {
                <app-flow-card [flow]="flow" layout="list" />
              }
            </div>
          }
        } @else {
          <app-empty-state
            icon="fa-light fa-chart-diagram"
            title="Aucun flow disponible"
            subtitle="Créez votre premier flow pour commencer."
          />
        }
      </div>

      @if (filteredFlows.length > 0) {
        <p-paginator
          [first]="first"
          [rows]="pageSize"
          [totalRecords]="filteredFlows.length"
          [rowsPerPageOptions]="[6, 12, 24, 48]"
          (onPageChange)="onPageChange($event)"
        />
      }
    </app-page>
  `,
  styles: `
    .flows-toolbar {
      flex-shrink: 0;
      padding: 1rem;
    }

    .flows-content {
      flex: 1;
      overflow-y: auto;
      min-height: 0;

      &.list-mode {
        border-top: 1px solid var(--surface-border);
      }
    }

    .flows-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
      gap: 1rem;
      padding: 0 1rem 1rem;
    }

    .flows-list {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--surface-border);
      overflow: hidden;

      app-flow-card + app-flow-card {
        border-top: 1px solid var(--surface-border);
      }
    }

    :host ::ng-deep .p-paginator {
      background: transparent;
      border: none;
      border-top: 1px solid var(--surface-border);
      border-radius: 0;
      padding: 0.375rem 1rem;
    }
  `,
})
export class FlowsPage {
  facets: Facet[] = [
    { id: 'my-flows', label: 'Mes flows' },
    { id: 'shared', label: 'Partagés avec moi' },
  ];

  isSharedFacet = false;
  search = '';
  private _viewMode: ViewMode = (localStorage.getItem('viewMode:flows') as ViewMode) ?? 'grid';
  get viewMode(): ViewMode { return this._viewMode; }
  set viewMode(value: ViewMode) { this._viewMode = value; localStorage.setItem('viewMode:flows', value); }
  filters: ActiveFilter[] = [];
  sorts: ActiveSort[] = [];
  page = 0;
  pageSize = 12;

  sortDefinitions: SortDefinition[] = [
    { id: 'name', label: 'Nom' },
    { id: 'createdAt', label: 'Date de création' },
    { id: 'status', label: 'Statut' },
  ];

  filterDefinitions: FilterDefinition[] = [
    {
      id: 'creator',
      label: 'Créateur',
      type: 'select',
      options: [
        { value: 'thomas', label: 'Thomas Lemaire' },
        { value: 'marie', label: 'Marie Dupont' },
      ],
    },
    {
      id: 'date',
      label: 'Date de création',
      type: 'date',
      dateRange: true,
    },
    {
      id: 'status',
      label: 'Statut',
      type: 'select',
      options: [
        { value: 'success', label: 'Opérationnel' },
        { value: 'warn', label: 'Dégradé' },
        { value: 'danger', label: 'En erreur' },
      ],
    },
  ];

  flows: Flow[] = [
    { name: 'Ingestion factures fournisseurs', description: 'Récupère et classe automatiquement les factures reçues par email', status: 'success', createdAt: new Date('2026-03-01'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
    { name: 'Validation contrats RH', description: 'Vérifie et achemine les contrats de travail vers les bons valideurs', status: 'warn', createdAt: new Date('2026-03-10'), creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' } },
    { name: 'Archivage documents expirés', description: 'Déplace vers l\'archive les documents dont la date de validité est dépassée', status: 'success', createdAt: new Date('2026-02-20'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
    { name: 'Synchronisation ERP', description: 'Synchronise les données comptables avec le système ERP interne', status: 'danger', createdAt: new Date('2026-03-18'), creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' } },
    { name: 'Extraction données bancaires', description: 'Extrait et normalise les relevés bancaires pour la comptabilité', status: 'success', createdAt: new Date('2026-02-15'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
    { name: 'Notification devis expirés', description: 'Envoie une alerte aux commerciaux quand un devis approche de sa date d\'expiration', status: 'warn', createdAt: new Date('2026-03-05'), creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' } },
    { name: 'Classement courrier entrant', description: 'Trie et affecte automatiquement le courrier scanné aux bons dossiers', status: 'success', createdAt: new Date('2026-01-28'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
    { name: 'Vérification conformité RGPD', description: 'Contrôle la présence des mentions légales obligatoires dans les contrats', status: 'danger', createdAt: new Date('2026-03-12'), creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' } },
    { name: 'Relance paiements en retard', description: 'Génère et envoie les lettres de relance pour les factures impayées', status: 'success', createdAt: new Date('2026-02-08'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
    { name: 'Import catalogue produits', description: 'Importe et valide les fiches produits depuis les fichiers fournisseurs', status: 'warn', createdAt: new Date('2026-03-14'), creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' } },
    { name: 'Consolidation rapports mensuels', description: 'Agrège les données de chaque département pour le rapport de direction', status: 'success', createdAt: new Date('2026-01-31'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
    { name: 'Détection doublons fournisseurs', description: 'Identifie les entrées dupliquées dans la base fournisseurs', status: 'danger', createdAt: new Date('2026-03-20'), creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' } },
    { name: 'Onboarding nouveaux collaborateurs', description: 'Orchestre la création des accès et l\'envoi des documents d\'intégration', status: 'success', createdAt: new Date('2026-02-25'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
    { name: 'Suivi appels d\'offres', description: 'Centralise et met à jour le statut de chaque appel d\'offres en cours', status: 'warn', createdAt: new Date('2026-03-08'), creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' } },
    { name: 'Export données analytiques', description: 'Prépare et transfère les données vers l\'outil de business intelligence', status: 'success', createdAt: new Date('2026-02-12'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
    { name: 'Contrôle qualité documents', description: 'Vérifie la lisibilité et la complétude des documents scannés', status: 'danger', createdAt: new Date('2026-03-22'), creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' } },
    { name: 'Mise à jour base clients', description: 'Synchronise les informations clients entre le CRM et la GED', status: 'success', createdAt: new Date('2026-01-20'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
    { name: 'Traitement notes de frais', description: 'Collecte, vérifie et achemine les notes de frais vers la validation', status: 'warn', createdAt: new Date('2026-03-16'), creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' } },
    { name: 'Purge données obsolètes', description: 'Supprime les documents dépassant la durée légale de conservation', status: 'success', createdAt: new Date('2026-02-05'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
    { name: 'Signature électronique contrats', description: 'Envoie les contrats finalisés aux signataires via la plateforme e-signature', status: 'danger', createdAt: new Date('2026-03-19'), creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' } },
    { name: 'Indexation automatique GED', description: 'Extrait les métadonnées des documents pour alimenter l\'index de recherche', status: 'success', createdAt: new Date('2026-01-15'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
    { name: 'Génération bons de commande', description: 'Crée automatiquement les bons de commande à partir des demandes validées', status: 'warn', createdAt: new Date('2026-03-03'), creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' } },
    { name: 'Rapprochement bancaire', description: 'Compare les écritures comptables avec les mouvements bancaires', status: 'success', createdAt: new Date('2026-02-18'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
    { name: 'Envoi bulletins de salaire', description: 'Distribue les bulletins de salaire dématérialisés aux collaborateurs', status: 'danger', createdAt: new Date('2026-03-21'), creator: { id: 'marie', name: 'Marie Dupont', initials: 'MD' } },
    { name: 'Suivi certifications ISO', description: 'Surveille les échéances des certifications et déclenche les audits préparatoires', status: 'success', createdAt: new Date('2026-02-02'), creator: { id: 'thomas', name: 'Thomas Lemaire', initials: 'TL' } },
  ];

  get filteredFlows(): Flow[] {
    let result = this.flows;

    if (this.search) {
      const q = this.search.toLowerCase();
      result = result.filter((f) =>
        f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
      );
    }

    for (const filter of this.filters) {
      switch (filter.definitionId) {
        case 'creator':
          result = result.filter((f) => f.creator.id === filter.value);
          break;
        case 'date': {
          const [start, end] = filter.value as Date[];
          result = result.filter((f) => {
            const d = f.createdAt.getTime();
            return d >= start.getTime() && (!end || d <= end.getTime());
          });
          break;
        }
        case 'status':
          result = result.filter((f) => f.status === filter.value);
          break;
      }
    }

    const statusOrder = { success: 0, warn: 1, danger: 2 };
    for (const sort of this.sorts) {
      const dir = sort.direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        switch (sort.definitionId) {
          case 'name': return dir * a.name.localeCompare(b.name);
          case 'createdAt': return dir * (a.createdAt.getTime() - b.createdAt.getTime());
          case 'status': return dir * (statusOrder[a.status] - statusOrder[b.status]);
          default: return 0;
        }
      });
    }

    return result;
  }

  get first(): number {
    const total = this.filteredFlows.length;
    const maxPage = Math.max(0, Math.ceil(total / this.pageSize) - 1);
    return Math.min(this.page, maxPage) * this.pageSize;
  }

  get paginatedFlows(): Flow[] {
    return this.filteredFlows.slice(this.first, this.first + this.pageSize);
  }

  onPageChange(event: PaginatorState): void {
    this.page = event.page ?? 0;
    this.pageSize = event.rows ?? this.pageSize;
  }

  onFacetChange(facet: Facet): void {
    this.isSharedFacet = facet.id === 'shared';
    this.page = 0;
  }
}

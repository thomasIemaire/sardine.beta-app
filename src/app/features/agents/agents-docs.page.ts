import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DocComponent, DocContent } from '../../shared/components/doc/doc.component';

@Component({
  selector: 'app-agents-docs',
  imports: [ButtonModule, DocComponent],
  template: `
    <div class="docs-page">
      <div class="docs-header">
        <p-button
          icon="fa-regular fa-arrow-left"
          severity="secondary"
          [text]="true"
          size="small"
          rounded
          label="Retour aux agents"
          (onClick)="back()"
        />
      </div>
      <div class="docs-body">
        <app-doc [content]="content" />
      </div>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; }

    .docs-page {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .docs-header {
      padding: 0.75rem 2rem;
      border-bottom: 1px solid var(--surface-border);
      flex-shrink: 0;
    }

    .docs-body {
      display: flex;
      justify-content: center;
      flex: 1;
      overflow-y: auto;

      app-doc {
        max-width: 960px;
      }
    }
  `,
})
export class AgentsDocsPage {
  private readonly router = inject(Router);

  back(): void {
    this.router.navigate(['/agents']);
  }

  readonly content: DocContent = {
    title: 'Agents',
    badge: 'Beta',
    description: "Les agents sont des composants d'extraction intelligents. Chaque agent définit un schéma de données structuré que Sardine utilise pour analyser et extraire des informations depuis vos documents.",
    sections: [
      {
        id: 'introduction',
        title: 'Introduction',
        contents: [
          { type: 'text', value: "Un agent représente un extracteur de données personnalisé. Il décrit les champs que vous souhaitez récupérer depuis un document — leur nom, leur type, leurs contraintes de validation — et Sardine s'occupe de les localiser et les extraire automatiquement." },
          { type: 'text', value: "Chaque agent possède un schéma versionnéque vous pouvez faire évoluer au fil du temps. Vous gardez ainsi l'historique complet de vos configurations et pouvez revenir à une version antérieure à tout moment." },
          { type: 'callout', icon: 'fa-regular fa-circle-info', value: "Un agent n'est pas lié à un type de document spécifique. Il peut être réutilisé sur n'importe quel document à condition que les champs définis y soient présents." },
        ],
      },
      {
        id: 'creation',
        title: 'Créer un agent',
        contents: [
          { type: 'text', value: "Pour créer un agent, cliquez sur « Nouvel agent » depuis la page Agents. Renseignez un nom clair et une description qui explique ce que l'agent extrait. Ces informations sont visibles par tous les membres de votre organisation." },
          { type: 'list', value: [
            'Nom — identifiant lisible de l\'agent (ex. : "Facture fournisseur", "Contrat de bail")',
            "Description — résumé de l'usage de l'agent, visible dans les listes et les flows",
            "Une fois créé, l'agent apparaît dans la liste avec un schéma vide à configurer",
          ]},
          { type: 'callout', icon: 'fa-regular fa-lightbulb', value: "Donnez à vos agents des noms explicites et métier. Le nom est utilisé comme racine du schéma JSON exporté (ex. : « Facture Fournisseur » → FACTURE_FOURNISSEUR)." },
        ],
      },
      {
        id: 'schema',
        title: 'Schéma de données',
        contents: [
          { type: 'text', value: "Le schéma définit la structure des données que l'agent doit extraire. Il est construit visuellement grâce à l'éditeur de schéma (Mapper), accessible depuis le panneau de configuration de l'agent." },
          { type: 'text', value: "Chaque champ du schéma possède :" },
          { type: 'list', value: [
            'Clé — le nom technique du champ dans le JSON résultant',
            'Type — le type de la valeur attendue (Texte, Nombre, Date, Booléen)',
            'Description — indice donné au moteur d\'extraction pour localiser la valeur',
            'Contraintes — règles de validation appliquées à la valeur extraite',
          ]},
          { type: 'text', value: "Un champ peut avoir des enfants : cela crée un objet imbriqué dans le JSON. Il n'y a pas de limite de profondeur, mais il est recommandé de rester à 2 ou 3 niveaux pour garder un schéma lisible." },
          { type: 'callout', icon: 'fa-regular fa-circle-info', value: "La description du champ est l'information la plus importante pour la qualité d'extraction. Soyez précis : indiquez l'emplacement attendu dans le document, les synonymes possibles, ou le format habituel de la valeur." },
        ],
      },
      {
        id: 'types',
        title: 'Types de champs',
        contents: [
          { type: 'text', value: "Quatre types sont disponibles pour définir la nature de la valeur extraite :" },
          { type: 'list', value: [
            'Texte (string) — toute valeur textuelle : nom, adresse, référence, libellé…',
            'Nombre (number) — valeur numérique entière ou décimale : montant, quantité, taux…',
            'Date (date) — date au format ISO 8601 (YYYY-MM-DD) après normalisation',
            'Booléen (boolean) — valeur vraie ou fausse : présence d\'une clause, accord signé…',
          ]},
          { type: 'text', value: "Le type influe sur la manière dont Sardine interprète et normalise la valeur avant de l'insérer dans le JSON de sortie. Une date extraite au format « 15/03/2024 » sera automatiquement convertie en « 2024-03-15 »." },
        ],
      },
      {
        id: 'contraintes',
        title: 'Contraintes de validation',
        contents: [
          { type: 'text', value: "Les contraintes permettent de valider les valeurs extraites et d'indiquer au moteur les règles métier à respecter. Elles sont configurables par champ via le bouton de contraintes dans l'éditeur de schéma." },
          { type: 'list', value: [
            'Requis — le champ doit obligatoirement être présent dans le document',
            'Expression régulière — la valeur doit correspondre au pattern fourni (ex. : ^FR[0-9]{11}$ pour un numéro de TVA)',
            'Min ≥ — valeur numérique minimale incluse',
            'Max ≤ — valeur numérique maximale incluse',
            'Longueur min — nombre minimum de caractères pour une valeur textuelle',
            'Longueur max — nombre maximum de caractères pour une valeur textuelle',
            'Valeurs autorisées — liste fermée de valeurs acceptables, séparées par des virgules',
          ]},
          { type: 'callout', icon: 'fa-regular fa-triangle-exclamation', value: "Les contraintes ne bloquent pas l'extraction : elles signalent des anomalies dans le résultat. Un champ non conforme sera marqué comme invalide mais la valeur extraite sera quand même retournée." },
        ],
      },
      {
        id: 'versions',
        title: 'Gestion des versions',
        contents: [
          { type: 'text', value: "Chaque fois que vous cliquez sur « Enregistrer » dans le panneau de configuration, une nouvelle version du schéma est créée. Les versions forment un arbre (DAG) : chaque version pointe vers sa version parente." },
          { type: 'list', value: [
            'HEAD — la version active, utilisée pour toutes les nouvelles extractions',
            'Enregistrer — crée une nouvelle version à partir de la HEAD actuelle',
            'Checkout — sélectionne une version antérieure comme nouvelle HEAD',
            'Branche — si vous revenez à une version ancienne puis enregistrez, une nouvelle branche se crée dans l\'arbre',
          ]},
          { type: 'text', value: "Le panneau « Versions » (icône branche dans l'en-tête du panneau agent) affiche l'arbre complet. La version active est indiquée par le badge HEAD. Cliquer sur la coche d'une version la définit comme nouvelle HEAD." },
          { type: 'callout', icon: 'fa-regular fa-circle-info', value: "Revenir à une version antérieure ne supprime pas les versions plus récentes. L'arbre est conservé intégralement. Vous pouvez à tout moment revenir sur n'importe quelle branche." },
        ],
      },
      {
        id: 'partage',
        title: 'Agents partagés',
        contents: [
          { type: 'text', value: "La section « Partagés avec moi » liste les agents mis à disposition par d'autres organisations. Ces agents sont en lecture seule : vous pouvez les consulter mais pas les modifier directement." },
          { type: 'text', value: "Pour réutiliser un agent partagé dans votre organisation, utilisez la fonction « Forker » disponible dans le menu contextuel (clic droit sur l'agent ou menu ⋮). Cela crée une copie indépendante dans votre organisation, que vous pouvez ensuite modifier librement." },
          { type: 'list', value: [
            'Le fork copie le schéma de la version active de l\'agent source',
            'Toute modification ultérieure de l\'agent source n\'affecte pas votre fork',
            'Les agents forkés sont identifiés par le badge « fork » sur leur carte',
          ]},
        ],
      },
      {
        id: 'usage-flows',
        title: 'Utilisation dans les flows',
        contents: [
          { type: 'text', value: "Les agents sont utilisés dans les flows d'automatisation via le nœud « Agent ». Ce nœud prend un document en entrée, l'envoie au moteur d'extraction avec le schéma de l'agent sélectionné, et retourne le JSON structuré correspondant." },
          { type: 'list', value: [
            'Nœud Agent — extrait les données selon le schéma de l\'agent sélectionné',
            'Nœud Détermination — sélectionne dynamiquement un agent parmi plusieurs selon des règles métier',
            'Nœud Classification — identifie le type de document avant de le router vers l\'agent approprié',
          ]},
          { type: 'text', value: "La version utilisée par un nœud de flow est toujours la HEAD au moment de l'exécution. Si vous changez la HEAD de l'agent (checkout ou nouveau save), les prochaines exécutions utiliseront automatiquement le nouveau schéma." },
          { type: 'callout', icon: 'fa-regular fa-lightbulb', value: "En production, privilégiez la stabilité : ne changez la HEAD d'un agent que lorsque vous êtes sûr du nouveau schéma. Utilisez les branches pour tester de nouvelles configurations sans impacter les extractions en cours." },
        ],
      },
      {
        id: 'bonnes-pratiques',
        title: 'Bonnes pratiques',
        contents: [
          { type: 'list', value: [
            'Un agent = un type de document — créez un agent par type de document plutôt qu\'un agent générique qui tente d\'extraire tout',
            'Descriptions précises — plus la description d\'un champ est précise, meilleure est l\'extraction',
            'Versionnez progressivement — faites des petits enregistrements fréquents plutôt que de grandes refactorisations',
            'Testez avant de merger — utilisez le checkout pour tester une ancienne version sans perdre vos modifications',
            'Nommez vos agents clairement — le nom est utilisé dans les flows, les logs et les exports JSON',
            'Utilisez les contraintes — elles améliorent la détection d\'erreurs d\'extraction et la qualité des données',
          ]},
        ],
      },
    ],
  };
}

import { Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { Team } from './settings.page';

interface PanelMember {
  initials: string;
  name: string;
  role: string;
}

interface PanelRight {
  label: string;
  icon: string;
  granted: boolean;
}

const MEMBERS_BY_TEAM: Record<string, PanelMember[]> = {
  't1':     [{ initials: 'TL', name: 'Thomas Lemaire', role: 'Administrateur' }, { initials: 'MD', name: 'Marie Dupont', role: 'Éditeur' }, { initials: 'LM', name: 'Lucas Martin', role: 'Éditeur' }],
  't1-1':   [{ initials: 'MD', name: 'Marie Dupont', role: 'Éditeur' }, { initials: 'CB', name: 'Camille Bernard', role: 'Lecteur' }],
  't1-1-1': [{ initials: 'CB', name: 'Camille Bernard', role: 'Lecteur' }, { initials: 'JM', name: 'Julie Moreau', role: 'Lecteur' }],
  't1-2':   [{ initials: 'TL', name: 'Thomas Lemaire', role: 'Administrateur' }, { initials: 'LM', name: 'Lucas Martin', role: 'Éditeur' }],
  't1-2-1': [{ initials: 'LM', name: 'Lucas Martin', role: 'Éditeur' }],
  't1-2-2': [{ initials: 'TL', name: 'Thomas Lemaire', role: 'Administrateur' }],
  't2':     [{ initials: 'JM', name: 'Julie Moreau', role: 'Éditeur' }, { initials: 'CB', name: 'Camille Bernard', role: 'Lecteur' }],
  't2-1':   [{ initials: 'CB', name: 'Camille Bernard', role: 'Lecteur' }],
  't2-2':   [{ initials: 'JM', name: 'Julie Moreau', role: 'Éditeur' }],
  't3':     [{ initials: 'MD', name: 'Marie Dupont', role: 'Éditeur' }, { initials: 'JM', name: 'Julie Moreau', role: 'Lecteur' }],
  't4':     [{ initials: 'TL', name: 'Thomas Lemaire', role: 'Administrateur' }, { initials: 'LM', name: 'Lucas Martin', role: 'Éditeur' }],
  't4-1':   [{ initials: 'MD', name: 'Marie Dupont', role: 'Éditeur' }],
  't4-2':   [{ initials: 'TL', name: 'Thomas Lemaire', role: 'Administrateur' }],
};

const RIGHTS_BY_TEAM: Record<string, boolean[]> = {
  't1':     [true,  true,  true,  true,  true],
  't1-1':   [true,  true,  false, false, false],
  't1-1-1': [true,  false, false, false, false],
  't1-2':   [true,  true,  true,  false, true],
  't1-2-1': [true,  true,  false, false, false],
  't1-2-2': [true,  true,  true,  false, true],
  't2':     [true,  false, false, false, false],
  't2-1':   [true,  false, false, false, false],
  't2-2':   [true,  false, false, false, false],
  't3':     [true,  false, false, false, false],
  't4':     [true,  true,  false, true,  false],
  't4-1':   [true,  false, false, false, false],
  't4-2':   [true,  true,  false, true,  false],
};

const RIGHT_DEFS = [
  { label: 'Lire les documents',  icon: 'fa-regular fa-file'         },
  { label: 'Créer des agents',    icon: 'fa-regular fa-microchip-ai' },
  { label: 'Modifier les flows',  icon: 'fa-regular fa-chart-diagram'},
  { label: 'Gérer les membres',   icon: 'fa-regular fa-users'        },
  { label: 'Accéder aux clés API',icon: 'fa-regular fa-key'          },
];

@Component({
  selector: 'app-team-panel',
  imports: [DatePipe, ButtonModule, DividerModule],
  template: `
    <div class="panel">
      <div class="panel-header">
        <div class="panel-title-group">
          <div class="panel-title-info">
            <span class="panel-title">{{ team().name }}</span>
          </div>
        </div>
        <p-button icon="fa-regular fa-xmark" severity="secondary" [text]="true" rounded size="small" (onClick)="close.emit()" />
      </div>

      <div class="panel-body">

        @if (team().description) {
          <section class="panel-section">
            <span class="section-label">Description</span>
            <p class="section-value">{{ team().description }}</p>
          </section>

          <p-divider />
        }

        <div class="meta-row">
          <section class="panel-section">
            <span class="section-label">Créé le</span>
            <span class="section-value">{{ team().createdAt | date:'dd/MM/yyyy' }}</span>
          </section>
          <section class="panel-section">
            <span class="section-label">Membres</span>
            <span class="section-value">{{ team().memberCount }}</span>
          </section>
        </div>

        <p-divider />

        <section class="panel-section">
          <div class="section-header">
            <span class="section-label">Membres</span>
            <span class="section-count">{{ members().length }}</span>
          </div>
          <div class="members-list">
            @for (m of members(); track m.name) {
              <div class="member-row">
                <span class="member-avatar">{{ m.initials }}</span>
                <span class="member-name">{{ m.name }}</span>
                <span class="member-role" [attr.data-role]="m.role">{{ m.role }}</span>
              </div>
            } @empty {
              <p class="empty-hint">Aucun membre dans cette équipe.</p>
            }
          </div>
        </section>

        <p-divider />

        <section class="panel-section">
          <span class="section-label">Droits associés</span>
          <div class="rights-list">
            @for (r of rights(); track r.label) {
              <div class="right-row" [class.is-granted]="r.granted">
                <i class="right-icon {{ r.icon }}"></i>
                <span class="right-label">{{ r.label }}</span>
                <i class="right-status" [class]="r.granted ? 'fa-regular fa-circle-check' : 'fa-regular fa-circle-xmark'"></i>
              </div>
            }
          </div>
        </section>

        @if (team().children?.length) {
          <p-divider />
          <section class="panel-section">
            <div class="section-header">
              <span class="section-label">Sous-équipes</span>
              <span class="section-count">{{ team().children!.length }}</span>
            </div>
            <div class="subteams-list">
              @for (sub of team().children!; track sub.id) {
                <div class="subteam-row">
                  <span class="subteam-name">{{ sub.name }}</span>
                  <span class="subteam-count"><i class="fa-regular fa-user"></i> {{ sub.memberCount }}</span>
                </div>
              }
            </div>
          </section>
        }

      </div>
    </div>
  `,
  styleUrl: './team-panel.component.scss',
})
export class TeamPanelComponent {
  team = input.required<Team>();
  close = output();

  members = computed<PanelMember[]>(() =>
    MEMBERS_BY_TEAM[this.team().id] ?? []
  );

  rights = computed<PanelRight[]>(() => {
    const grants = RIGHTS_BY_TEAM[this.team().id] ?? RIGHT_DEFS.map(() => false);
    return RIGHT_DEFS.map((def, i) => ({ ...def, granted: grants[i] ?? false }));
  });
}

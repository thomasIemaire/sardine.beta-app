import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../core/services/theme.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent, Facet } from '../../shared/components/header-page/header-page.component';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

@Component({
  selector: 'app-user',
  imports: [FormsModule, ButtonModule, InputTextModule, PasswordModule, SelectModule, ToggleSwitchModule, PageComponent, HeaderPageComponent],
  template: `
    <app-page>
      <app-header-page
        title="Mon compte"
        subtitle="Gérez votre profil et vos préférences"
        [facets]="facets"
        defaultFacetId="profile"
        (facetChange)="currentTab.set($event.id)"
      />

      <div class="user-body">
        @if (currentTab() === 'profile') {
          <div class="user-section">
            <div class="user-avatar-block">
              <div class="user-avatar">TL</div>
              <div class="user-avatar-info">
                <div class="user-avatar-name-row">
                  <span class="user-avatar-name">Thomas Lemaire</span>
                  <span class="user-role-badge">{{ role }}</span>
                </div>
                <p-button label="Changer la photo" severity="secondary" size="small" rounded />
              </div>
            </div>
          </div>

          <div class="user-section">
            <h3 class="user-section-title">Informations personnelles</h3>
            <div class="user-form">
              <div class="user-field">
                <label class="user-label">Prénom</label>
                <input pInputText pSize="small" [(ngModel)]="firstName" placeholder="Prénom" />
              </div>
              <div class="user-field">
                <label class="user-label">Nom</label>
                <input pInputText pSize="small" [(ngModel)]="lastName" placeholder="Nom" />
              </div>
              <div class="user-field user-field--full">
                <label class="user-label">Email</label>
                <input pInputText pSize="small" [(ngModel)]="email" placeholder="Email" type="email" />
              </div>
            </div>
          </div>

          <div class="user-section">
            <h3 class="user-section-title">Sécurité</h3>
            <div class="user-form">
              <div class="user-field user-field--full">
                <label class="user-label">Mot de passe actuel</label>
                <p-password [(ngModel)]="currentPassword" placeholder="••••••••" [feedback]="false" [toggleMask]="true" size="small" fluid />
              </div>
              <div class="user-field">
                <label class="user-label">Nouveau mot de passe</label>
                <p-password [(ngModel)]="newPassword" placeholder="••••••••" [feedback]="true" [toggleMask]="true" size="small" fluid />
              </div>
              <div class="user-field">
                <label class="user-label">Confirmer le mot de passe</label>
                <p-password [(ngModel)]="confirmPassword" placeholder="••••••••" [feedback]="false" [toggleMask]="true" size="small" fluid />
              </div>
            </div>
          </div>

          <div class="user-actions">
            <p-button label="Enregistrer les modifications" icon="fa-regular fa-check" rounded size="small" />
          </div>
        }

        @if (currentTab() === 'preferences') {
          <div class="user-section">
            <h3 class="user-section-title">Apparence</h3>
            <div class="user-prefs">
              <div class="user-pref-row">
                <div class="user-pref-info">
                  <span class="user-pref-label">Thème</span>
                  <span class="user-pref-hint">Choisissez le thème de l'interface</span>
                </div>
                <p-select size="small" [(ngModel)]="theme" [options]="themeOptions" optionLabel="label" optionValue="value" />
              </div>
              <div class="user-pref-row">
                <div class="user-pref-info">
                  <span class="user-pref-label">Langue</span>
                  <span class="user-pref-hint">Langue d'affichage de l'interface</span>
                </div>
                <p-select size="small" [(ngModel)]="language" [options]="languageOptions" optionLabel="label" optionValue="value" />
              </div>
            </div>
          </div>

          <div class="user-section">
            <h3 class="user-section-title">Organisation par défaut</h3>
            <div class="user-prefs">
              <div class="user-pref-row">
                <div class="user-pref-info">
                  <span class="user-pref-label">Organisation par défaut</span>
                  <span class="user-pref-hint">Au démarrage, cette organisation sera sélectionnée automatiquement.</span>
                </div>
                <p-toggleswitch [ngModel]="!!contextSwitcher.defaultOrgId()" (ngModelChange)="onDefaultOrgToggle($event)" />
              </div>
              @if (contextSwitcher.defaultOrgId()) {
                <div class="user-pref-row">
                  <div class="user-pref-info">
                    <span class="user-pref-label">Organisation</span>
                    <span class="user-pref-hint">L'organisation qui sera chargée automatiquement.</span>
                  </div>
                  <p-select
                    size="small"
                    [ngModel]="contextSwitcher.defaultOrgId()"
                    (ngModelChange)="onDefaultOrgChange($event)"
                    [options]="contextSwitcher.organizations()"
                    optionLabel="name"
                    optionValue="id"
                  />
                </div>
              }
            </div>
          </div>

          <div class="user-section">
            <h3 class="user-section-title">Notifications</h3>
            <div class="user-prefs">
              <div class="user-pref-row">
                <div class="user-pref-info">
                  <span class="user-pref-label">Notifications par email</span>
                  <span class="user-pref-hint">Recevez un email lors d'une nouvelle approbation</span>
                </div>
                <p-toggleswitch [(ngModel)]="notifEmail" />
              </div>
              <div class="user-pref-row">
                <div class="user-pref-info">
                  <span class="user-pref-label">Notifications dans l'application</span>
                  <span class="user-pref-hint">Affichez les alertes dans la barre de notification</span>
                </div>
                <p-toggleswitch [(ngModel)]="notifApp" />
              </div>
              <div class="user-pref-row">
                <div class="user-pref-info">
                  <span class="user-pref-label">Résumé hebdomadaire</span>
                  <span class="user-pref-hint">Recevez un récapitulatif de l'activité chaque semaine</span>
                </div>
                <p-toggleswitch [(ngModel)]="notifWeekly" />
              </div>
            </div>
          </div>

          <div class="user-actions">
            <p-button label="Enregistrer les préférences" icon="fa-regular fa-check" rounded size="small" />
          </div>
        }
      </div>
    </app-page>
  `,
  styles: `
    .user-body {
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

    .user-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .user-section-title {
      margin: 0;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--p-text-color);
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--surface-border);
    }

    /* Avatar */
    .user-avatar-block {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 100%;
      background: var(--primary-color-100);
      color: var(--primary-color-700);
      font-size: 0.875rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .user-avatar-info {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .user-avatar-name {
      font-size: 1rem;
      font-weight: 600;
      color: var(--p-text-color);
    }

    /* Form grid */
    .user-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .user-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;

      &--full {
        grid-column: 1 / -1;
      }

      input {
        width: 100%;
      }
    }

    .user-avatar-name-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .user-role-badge {
      flex-shrink: 0;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.2rem 0.625rem;
      border-radius: 2rem;
      background: var(--primary-color-100);
      color: var(--primary-color-700);
      white-space: nowrap;
    }

    .user-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--p-text-muted-color);
    }

    .user-section-hint {
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
      margin: -0.25rem 0 0;
    }

    .user-org-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .user-org-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .user-org-avatar {
      width: 64px;
      height: 64px;
      border-radius: 0.5rem;
      background: var(--background-color-100);
      border: 1px solid var(--surface-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--p-text-color);
      text-transform: uppercase;
      user-select: none;

      &--none {
        color: var(--p-text-muted-color);
        font-size: 0.75rem;
      }
    }

    .user-org-name {
      font-size: 0.6875rem;
      font-weight: 500;
      color: var(--p-text-color);
      max-width: 64px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      user-select: none;
    }

    /* Preferences */
    .user-prefs {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .user-pref-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.875rem 0;
      border-bottom: 1px solid var(--surface-border);

      &:last-child {
        border-bottom: none;
      }
    }

    .user-pref-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .user-pref-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--p-text-color);
    }

    .user-pref-hint {
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
    }

    .user-actions {
      display: flex;
      justify-content: flex-end;
    }
  `,
})
export class UserPage {
  themeService = inject(ThemeService);
  contextSwitcher = inject(ContextSwitcherService);
  currentTab = signal('profile');

  facets: Facet[] = [
    { id: 'profile', label: 'Mon profil' },
    { id: 'preferences', label: 'Préférences' },
  ];

  firstName = 'Thomas';
  lastName = 'Lemaire';
  email = 'thomas.lemaire@sendoc.fr';
  role = 'Administrateur';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  get theme() { return this.themeService.theme(); }
  set theme(value: string) { this.themeService.setTheme(value as 'dark' | 'light' | 'system'); }
  language = 'fr';
  notifEmail = true;
  notifApp = true;
  notifWeekly = false;

  themeOptions = [
    { label: 'Sombre', value: 'dark' },
    { label: 'Clair', value: 'light' },
    { label: 'Système', value: 'system' },
  ];

  languageOptions = [
    { label: 'Français', value: 'fr' },
    { label: 'English', value: 'en' },
  ];

  onDefaultOrgToggle(enabled: boolean): void {
    if (enabled) {
      const first = this.contextSwitcher.organizations()[0];
      if (first) this.contextSwitcher.setDefault(first);
    } else {
      this.contextSwitcher.clearDefault();
    }
  }

  onDefaultOrgChange(orgId: string): void {
    const org = this.contextSwitcher.organizations().find(o => o.id === orgId);
    if (org) this.contextSwitcher.setDefault(org);
  }
}

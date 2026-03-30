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
  styleUrl: './user.page.scss',
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

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { BrandComponent } from '../../../shared/components/brand/brand.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, ButtonModule, InputTextModule, PasswordModule, RouterLink, BrandComponent],
  template: `
    <div class="login-card">
      <div class="login-brand"><app-brand size="large"/></div>

      @if (error()) {
        <div class="login-error">
          <i class="fa-regular fa-triangle-exclamation"></i>
          {{ error() }}
        </div>
      }

      <form class="login-form" (ngSubmit)="submit()">
        <div class="login-row">
          <div class="login-field">
            <label class="login-label" for="firstName">Prénom</label>
            <input
              id="firstName"
              pInputText
              [(ngModel)]="firstName"
              name="firstName"
              placeholder="Jean"
              autocomplete="given-name"
              [disabled]="loading()"
              pSize="small"
            />
          </div>
          <div class="login-field">
            <label class="login-label" for="lastName">Nom</label>
            <input
              id="lastName"
              pInputText
              [(ngModel)]="lastName"
              name="lastName"
              placeholder="Dupont"
              autocomplete="family-name"
              [disabled]="loading()"
              pSize="small"
            />
          </div>
        </div>

        <div class="login-field">
          <label class="login-label" for="email">Email</label>
          <input
            id="email"
            type="email"
            pInputText
            [(ngModel)]="email"
            name="email"
            placeholder="vous@exemple.com"
            autocomplete="email"
            [disabled]="loading()"
            pSize="small"
          />
        </div>

        <div class="login-field">
          <label class="login-label" for="password">Mot de passe</label>
          <p-password
            inputId="password"
            [(ngModel)]="password"
            name="password"
            placeholder="••••••••"
            [toggleMask]="true"
            [disabled]="loading()"
            fluid
            size="small"
          />
        </div>

        <div class="login-field">
          <label class="login-label" for="confirmPassword">Confirmer le mot de passe</label>
          <p-password
            inputId="confirmPassword"
            [(ngModel)]="confirmPassword"
            name="confirmPassword"
            placeholder="••••••••"
            [feedback]="false"
            [toggleMask]="true"
            [disabled]="loading()"
            fluid
            size="small"
          />
          @if (confirmPassword && password !== confirmPassword) {
            <span class="login-field-error">Les mots de passe ne correspondent pas.</span>
          }
        </div>

        <p-button
          [style.padding]="'1rem 0'"
          type="submit"
          label="Créer mon compte"
          [loading]="loading()"
          [disabled]="!firstName || !lastName || !email || !password || password !== confirmPassword"
          styleClass="w-full"
          size="small"
          rounded
          fluid
        />
      </form>

      <p class="login-footer">
        Déjà un compte ?
        <a routerLink="/auth/login" class="login-link">Se connecter</a>
      </p>
    </div>
  `,
  styles: `
    .login-card {
      width: 320px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      background: var(--background-color-0);
    }

    .login-brand {
      display: flex;
      justify-content: center;
    }

    .login-header {
      text-align: center;
    }

    .login-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--p-text-color);
      margin: 0 0 0.25rem;
    }

    .login-subtitle {
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
      margin: 0;
    }

    .login-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.875rem;
      background: var(--red-color-50, #fef2f2);
      border: 1px solid var(--red-color-200, #fecaca);
      border-radius: var(--radius-m, 8px);
      font-size: 0.8125rem;
      color: var(--red-color-700, #b91c1c);

      i { font-size: 0.875rem; }
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .login-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .login-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      min-width: 0;

      input { width: 100%; box-sizing: border-box; }
    }

    .login-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--p-text-color);
    }

    .w-full { width: 100%; }

    .login-footer {
      text-align: center;
      font-size: 0.8125rem;
      color: var(--p-text-muted-color);
      margin: 0;
    }

    .login-link {
      color: var(--p-primary-color);
      font-weight: 500;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    .login-field-error {
      font-size: 0.75rem;
      color: var(--red-color-600, #dc2626);
    }
  `,
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (!this.firstName || !this.lastName || !this.email || !this.password || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth.register(this.firstName, this.lastName, this.email, this.password, this.confirmPassword).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading.set(false);
        if (err.status === 409) {
          this.error.set('Un compte existe déjà avec cet email.');
        } else if (err.status === 422) {
          this.error.set('Données invalides. Vérifiez les champs.');
        } else {
          this.error.set('Une erreur est survenue. Réessayez plus tard.');
        }
      },
    });
  }
}

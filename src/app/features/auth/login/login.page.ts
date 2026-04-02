import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { BrandComponent } from '../../../shared/components/brand/brand.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
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
            [feedback]="false"
            [toggleMask]="true"
            [disabled]="loading()"
            size="small"
            fluid
          />
        </div>

        <p-button
          [style.padding]="'1rem 0'"
          type="submit"
          label="Se connecter"
          [loading]="loading()"
          [disabled]="!email || !password"
          styleClass="w-full"
          fluid
          size="small"
          rounded
        />
      </form>

      <p class="login-footer">
        Pas encore de compte ?
        <a routerLink="/auth/register" class="login-link">S'inscrire</a>
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

    .login-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
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
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (!this.email || !this.password || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.error.set('Email ou mot de passe incorrect.');
        } else if (err.status === 423) {
          this.error.set('Compte temporairement bloqué. Réessayez dans 15 minutes.');
        } else {
          this.error.set('Une erreur est survenue. Vérifiez votre connexion.');
        }
      },
    });
  }
}

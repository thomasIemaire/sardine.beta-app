import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-login',
  imports: [ButtonModule],
  template: `
    <div class="login">
      <h1>Connexion</h1>
      <p-button label="Se connecter" />
    </div>
  `,
  styles: `
    .login {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
  `,
})
export class LoginPage {}

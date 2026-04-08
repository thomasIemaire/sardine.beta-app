import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    inject(ThemeService);
    inject(AuthService).initializeAuth();
    // Instancie le NotificationService dès le boot : il tient le WebSocket
    // (notifications + évènements `execution.*` du Flow Engine) et doit
    // rester actif quelle que soit la route affichée. Sans cette injection,
    // un F5 sur /flows/:id (hors layout principal) laisserait le service
    // jamais créé → pas de WS.
    inject(NotificationService);
  }
}

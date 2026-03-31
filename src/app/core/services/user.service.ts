import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserService {
  /** Hardcoded pour la démo — remplacer par la logique d'auth réelle. */
  readonly isAdmin = signal(true);
}

import { Injectable } from '@angular/core';
import { Observable, Subject, filter, map } from 'rxjs';

/**
 * Bus interne d'évènements `execution.*` du Flow Engine.
 *
 * Le backend pousse ces évènements via le WebSocket existant des notifications
 * (cf. `/notifications/ws`). Le `NotificationService` les capte puis les
 * republie ici, ce qui permet au composant `gflow` (et à son `exec-panel`) de
 * s'y abonner sans avoir à ouvrir une seconde connexion WS.
 */
@Injectable({ providedIn: 'root' })
export class FlowEventsBus {
  private readonly bus = new Subject<{ event: string; data: any }>();

  publish(event: string, data: any): void {
    this.bus.next({ event, data });
  }

  /** Souscrire à un évènement précis (ex: 'execution.node.completed'). */
  on<T = any>(event: string): Observable<T> {
    return this.bus.asObservable().pipe(
      filter((m) => m.event === event),
      map((m) => m.data as T),
    );
  }

  /** Souscrire à tous les évènements (rare — sert au debug). */
  all(): Observable<{ event: string; data: any }> {
    return this.bus.asObservable();
  }
}

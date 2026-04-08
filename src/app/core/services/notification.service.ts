import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ContextSwitcherService } from '../layout/context-switcher/context-switcher.service';
import { FlowEventsBus } from './flow-events.bus';

export interface AppNotification {
  id: string;
  type: 'info' | 'action';
  type_label: string;
  title: string;
  message: string;
  is_read: boolean;
  organization_id: string | null;
  actions: { key: string; label: string }[];
  action_status: 'pending' | 'accepted' | 'rejected' | null;
  action_status_label: string | null;
  resolved_action_key: string | null;
  created_at: string;
  read_at: string | null;
}

export type NotificationScope = 'organization' | 'all';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly contextSwitcher = inject(ContextSwitcherService);
  private readonly flowEvents = inject(FlowEventsBus);
  private readonly base = `${environment.apiUrl}/notifications`;
  private readonly wsBase = environment.apiUrl.replace(/^http/, 'ws');

  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly isOpen = signal(false);
  readonly loading = signal(false);
  readonly scope = signal<NotificationScope>('organization');

  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  constructor() {
    // WS lifecycle
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.connect();
      } else {
        this.disconnect();
        this.notifications.set([]);
        this.unreadCount.set(0);
        this.isOpen.set(false);
      }
    });

    // Reload when scope, active org, or login state changes
    effect(() => {
      const scope = this.scope();
      const orgId = this.contextSwitcher.selectedId();
      if (this.auth.isLoggedIn()) {
        this.loadNotificationsFor(scope, orgId);
      }
    });
  }

  open(): void { this.isOpen.set(true); }
  close(): void { this.isOpen.set(false); }
  toggle(): void { this.isOpen.update((v) => !v); }
  setScope(scope: NotificationScope): void { this.scope.set(scope); }

  private connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    const token = this.auth.getAccessToken();
    if (!token) return;

    this.shouldReconnect = true;
    this.ws = new WebSocket(`${this.wsBase}/notifications/ws?token=${encodeURIComponent(token)}`);

    this.ws.onopen = () => { this.reconnectAttempts = 0; };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);

        // Évènements du Flow Engine — republication sur le bus interne pour
        // que `gflow` / `exec-panel` puissent s'y abonner sans seconde WS.
        if (typeof msg.event === 'string' && msg.event.startsWith('execution.')) {
          this.flowEvents.publish(msg.event, msg.data);
          return;
        }

        if (msg.event === 'notification') {
          const notif: AppNotification = msg.data;
          const orgId = this.contextSwitcher.selectedId();
          const matchesScope = this.scope() === 'all' ||
            (this.scope() === 'organization' && notif.organization_id === orgId);
          if (matchesScope) {
            this.notifications.update((list) => [notif, ...list]);
          }
          if (!notif.is_read) this.unreadCount.update((n) => n + 1);
        }
      } catch { /* ignore */ }
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect) this.scheduleReconnect();
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
    this.reconnectAttempts = 0;
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts++), 30000);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private loadNotificationsFor(scope: NotificationScope, orgId: string | null): void {
    if (scope === 'organization' && !orgId) {
      this.notifications.set([]);
      return;
    }
    this.loading.set(true);
    const params: Record<string, string> = { page: '1', page_size: '30', scope };
    if (scope === 'organization' && orgId) params['organization_id'] = orgId;

    this.http.get<{ items: AppNotification[]; total: number }>(`${this.base}/`, { params })
      .subscribe({
        next: (res) => {
          this.notifications.set(res.items);
          this.loading.set(false);
          this.loadUnreadCount();
        },
        error: () => this.loading.set(false),
      });
  }

  private loadUnreadCount(): void {
    this.http.get<{ total: number }>(`${this.base}/unread-count`)
      .subscribe({ next: (res) => this.unreadCount.set(res.total) });
  }

  markAsRead(id: string): void {
    const notif = this.notifications().find((n) => n.id === id);
    if (!notif || notif.is_read) return;
    this.notifications.update((list) =>
      list.map((n) => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
    );
    this.unreadCount.update((c) => Math.max(0, c - 1));
    this.http.patch(`${this.base}/${id}/read`, {}).subscribe();
  }

  markAllAsRead(): void {
    if (this.unreadCount() === 0) return;
    const orgId = this.contextSwitcher.selectedId();
    const scope = this.scope();
    this.notifications.update((list) =>
      list.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() }))
    );
    this.unreadCount.set(0);
    const params: Record<string, string> = { scope };
    if (scope === 'organization' && orgId) params['organization_id'] = orgId;
    this.http.patch(`${this.base}/read-all`, {}, { params }).subscribe();
  }

  resolve(id: string, actionKey: string): Observable<AppNotification> {
    return this.http.post<AppNotification>(`${this.base}/${id}/resolve`, { action_key: actionKey });
  }

  deleteNotification(id: string): void {
    const notif = this.notifications().find((n) => n.id === id);
    if (notif && !notif.is_read) this.unreadCount.update((c) => Math.max(0, c - 1));
    this.notifications.update((list) => list.filter((n) => n.id !== id));
    this.http.delete(`${this.base}/${id}`).subscribe();
  }

  deleteAll(): void {
    const ids = this.notifications().map((n) => n.id);
    this.notifications.set([]);
    this.unreadCount.set(0);
    ids.forEach((id) => this.http.delete(`${this.base}/${id}`).subscribe());
  }
}

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: number; // 0=Admin, 1=User
  role_label: string;
  status: number;
  status_label: string;
  email_verified: boolean;
  created_at: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

const ACCESS_TOKEN_KEY = 'sardine_access_token';
const REFRESH_TOKEN_KEY = 'sardine_refresh_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.apiUrl;

  readonly currentUser = signal<AuthUser | null>(null);
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  storeTokens(access: string, refresh?: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  register(firstName: string, lastName: string, email: string, password: string, confirmPassword: string) {
    return this.http
      .post<TokenResponse>(`${this.base}/auth/register`, {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        confirm_password: confirmPassword,
      })
      .pipe(
        tap((res) => this.storeTokens(res.access_token, res.refresh_token)),
        switchMap(() => this.loadCurrentUser()),
      );
  }

  login(email: string, password: string) {
    return this.http
      .post<TokenResponse>(`${this.base}/auth/login`, { email, password })
      .pipe(
        tap((res) => this.storeTokens(res.access_token, res.refresh_token)),
        switchMap(() => this.loadCurrentUser()),
      );
  }

  readonly avatarVersion = signal(0);

  refreshAvatar() {
    return this.http.post(`${this.base}/users/me/refresh-avatar`, {}).pipe(
      tap(() => this.avatarVersion.update((v) => v + 1)),
    );
  }

  logout(): void {
    this.http.post(`${this.base}/auth/logout`, {}).subscribe({
      complete: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return throwError(() => new Error('No refresh token'));
    }

    return this.http
      .post<TokenResponse>(`${this.base}/auth/refresh`, { refresh_token: refreshToken })
      .pipe(
        tap((res) => this.storeTokens(res.access_token, res.refresh_token)),
        catchError((err) => {
          this.clearSession();
          return throwError(() => err);
        }),
      );
  }

  loadCurrentUser() {
    return this.http.get<AuthUser>(`${this.base}/users/me`).pipe(
      tap((user) => this.currentUser.set(user)),
    );
  }

  initializeAuth() {
    if (this.getAccessToken()) {
      this.loadCurrentUser().subscribe({
        error: () => this.clearSession(),
      });
    } else if (this.getRefreshToken()) {
      this.refreshAccessToken().pipe(
        switchMap(() => this.loadCurrentUser()),
      ).subscribe({
        error: () => this.clearSession(),
      });
    }
  }

  private clearSession(): void {
    this.clearTokens();
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }
}

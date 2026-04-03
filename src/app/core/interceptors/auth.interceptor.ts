import { inject } from '@angular/core';
import { HttpRequest, HttpHandlerFn, HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap, throwError, Observable, share } from 'rxjs';
import { AuthService } from '../services/auth.service';

const AUTH_SKIP_URLS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

let refreshInFlight$: Observable<unknown> | null = null;

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);

  if (AUTH_SKIP_URLS.some((url) => req.url.includes(url))) {
    return next(req);
  }

  const token = authService.getAccessToken();
  const authReq = token ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) return throwError(() => error);

      // Share a single refresh call across all concurrent 401s
      if (!refreshInFlight$) {
        refreshInFlight$ = authService.refreshAccessToken().pipe(
          share(),
        );
      }

      return refreshInFlight$.pipe(
        switchMap(() => {
          refreshInFlight$ = null;
          const newToken = authService.getAccessToken();
          return newToken ? next(addToken(req, newToken)) : throwError(() => error);
        }),
        catchError((refreshError) => {
          refreshInFlight$ = null;
          return throwError(() => refreshError ?? error);
        }),
      );
    }),
  );
};

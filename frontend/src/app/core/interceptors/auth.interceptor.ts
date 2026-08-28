import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { DistributorContextService } from '../services/distributor-context.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const injector = inject(Injector);
  const headers: Record<string, string> = {};

  // Add authentication token
  if (auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  }

  // Add distributor context for platform admin filtering
  // Lazy-load to avoid circular dependency
  try {
    const distContext = injector.get(DistributorContextService, null);
    if (distContext) {
      const distributorId = distContext.selectedDistributorId();
      if (distributorId) {
        headers['X-Distributor-Id'] = distributorId.toString();
      }
    }
  } catch {
    // Service not yet available, continue without distributor header
  }

  const authReq = Object.keys(headers).length > 0
    ? req.clone({ setHeaders: headers })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/')) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};

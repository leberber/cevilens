import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

/**
 * HTTP Error Logging Interceptor
 * Centralizes error logging and handles common error scenarios
 * Note: 401 handling is already in auth.interceptor
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Log error for debugging
      console.error('HTTP Error:', {
        status: error.status,
        statusText: error.statusText,
        message: error.error?.detail ?? error.message,
        url: error.url,
        timestamp: new Date().toISOString(),
      });

      // Handle specific status codes
      switch (error.status) {
        case 403:
          // Forbidden - user doesn't have permission
          router.navigate(['/dashboard']);
          break;

        case 404:
          // Not found - handled by component, just log
          break;

        case 500:
        case 502:
        case 503:
          // Server errors - logged but handled by component
          break;

        default:
          // Other errors - logged but handled by component
          break;
      }

      return throwError(() => error);
    })
  );
}

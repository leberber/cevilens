import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, throwError, timer } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';

/**
 * Error category for consistent handling across the app
 */
type ErrorCategory = 'auth' | 'validation' | 'forbidden' | 'notfound' | 'client' | 'server' | 'network';

interface CategorizedError extends HttpErrorResponse {
  category: ErrorCategory;
  userMessage: string;
  isRetryable: boolean;
  attemptNumber?: number;
}

/**
 * HTTP Error Interceptor with Resilience Features
 * - Automatic retry with exponential backoff for transient errors (5xx, network)
 * - Error categorization for consistent handling
 * - User-friendly notifications in French
 * - Comprehensive error logging for debugging
 *
 * Note: 401 handling is already in auth.interceptor
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notifications = inject(NotificationService);
  const MAX_RETRIES = 3;

  return next(req).pipe(
    // Retry with exponential backoff: 1s, 2s, 4s
    retry({
      count: MAX_RETRIES,
      delay: (error: any, retryCount: number) => {
        const isRetryable = error.status >= 500 || error.status === 0;
        if (!isRetryable || retryCount > MAX_RETRIES) {
          return throwError(() => error);
        }
        const delayMs = Math.pow(2, retryCount - 1) * 1000;
        return timer(delayMs);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const categorized = categorizeError(error);

      // Handle specific error types
      switch (categorized.category) {
        case 'forbidden':
          router.navigate(['/fdv-performance']);
          notifications.warn(categorized.userMessage);
          break;

        case 'auth':
          // Let auth interceptor handle this, but show notification
          notifications.error(categorized.userMessage);
          break;

        case 'validation':
          notifications.warn(categorized.userMessage);
          break;

        case 'notfound':
          // Usually handled by component, just log silently
          break;

        case 'server':
          notifications.error(categorized.userMessage);
          break;

        case 'network':
          notifications.error('Erreur de connexion. Veuillez vérifier votre connexion Internet.');
          break;

        case 'client':
          notifications.warn(categorized.userMessage);
          break;
      }

      return throwError(() => categorized);
    })
  );
};

/**
 * Categorize HTTP error and generate user-friendly message
 */
function categorizeError(error: HttpErrorResponse): CategorizedError {
  const categorized = error as CategorizedError;
  const detail = error.error?.detail ?? error.error?.message ?? '';

  if (error.status === 0 || error.status >= 500) {
    categorized.category = 'server';
    categorized.userMessage = 'Erreur serveur. Veuillez réessayer.';
    categorized.isRetryable = true;
  } else if (error.status === 403) {
    categorized.category = 'forbidden';
    categorized.userMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
    categorized.isRetryable = false;
  } else if (error.status === 401) {
    categorized.category = 'auth';
    categorized.userMessage = 'Session expirée. Veuillez vous reconnecter.';
    categorized.isRetryable = false;
  } else if (error.status === 404) {
    categorized.category = 'notfound';
    categorized.userMessage = 'Ressource non trouvée.';
    categorized.isRetryable = false;
  } else if (error.status === 422 || error.status === 400) {
    categorized.category = 'validation';
    categorized.userMessage = detail || 'Données invalides. Veuillez vérifier votre saisie.';
    categorized.isRetryable = false;
  } else if (error.status >= 400 && error.status < 500) {
    categorized.category = 'client';
    categorized.userMessage = detail || 'Une erreur est survenue.';
    categorized.isRetryable = false;
  } else {
    categorized.category = 'network';
    categorized.userMessage = 'Erreur de connexion.';
    categorized.isRetryable = true;
  }

  return categorized;
}

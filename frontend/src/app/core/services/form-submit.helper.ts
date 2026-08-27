import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { NotificationService } from './notification.service';
import { APP_CONFIG } from '../constants/app.constants';

/**
 * Helper service for common form submission patterns
 * Eliminates boilerplate code in form components
 */
@Injectable({ providedIn: 'root' })
export class FormSubmitHelper {
  private notification = inject(NotificationService);
  private router = inject(Router);

  /**
   * Handle form submission with create/update logic
   */
  submit<T>(
    form: FormGroup,
    saveStateSetter: (saving: boolean) => void,
    observable: Observable<T>,
    options: {
      successMessage?: string;
      errorMessage?: string;
      navigateTo?: string;
      navigateDelay?: number;
      onSuccess?: (data: T) => void;
      onError?: (error: any) => void;
    } = {}
  ) {
    if (form.invalid) return;

    saveStateSetter(true);

    const {
      successMessage = 'Opération réussie',
      errorMessage,
      navigateTo,
      navigateDelay = APP_CONFIG.NAVIGATION_DELAY,
      onSuccess,
      onError,
    } = options;

    observable.subscribe({
      next: (data) => {
        this.notification.success(successMessage);
        saveStateSetter(false);
        onSuccess?.(data);

        if (navigateTo) {
          setTimeout(() => this.router.navigate([navigateTo]), navigateDelay);
        }
      },
      error: (error) => {
        saveStateSetter(false);
        const detail = error?.error?.detail ?? errorMessage ?? APP_CONFIG.API.DEFAULT_ERROR_MESSAGE;
        this.notification.error(detail);
        onError?.(error);
      },
    });
  }

  /**
   * Simple wrapper for loading data
   */
  load<T>(
    observable: Observable<T>,
    loadStateSetter: (loading: boolean) => void,
    options: {
      onSuccess?: (data: T) => void;
      onError?: (error: any) => void;
      showError?: boolean;
      errorMessage?: string;
    } = {}
  ) {
    loadStateSetter(true);

    const { onSuccess, onError, showError = true, errorMessage } = options;

    observable.subscribe({
      next: (data) => {
        loadStateSetter(false);
        onSuccess?.(data);
      },
      error: (error) => {
        loadStateSetter(false);
        if (showError) {
          const detail = error?.error?.detail ?? errorMessage ?? APP_CONFIG.API.DEFAULT_ERROR_MESSAGE;
          this.notification.error(detail);
        }
        onError?.(error);
      },
    });
  }
}

import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { APP_CONFIG } from '../constants/app.constants';

/**
 * Centralized notification service wrapper
 * Provides simple methods for showing toast messages
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private messageService = inject(MessageService);

  /**
   * Show success message
   */
  success(detail: string, summary?: string, duration?: number) {
    this.messageService.add({
      severity: 'success',
      summary: summary ?? 'Succès',
      detail,
      life: duration ?? APP_CONFIG.TOAST.SHORT,
    });
  }

  /**
   * Show error message
   */
  error(detail: string, summary?: string, duration?: number) {
    this.messageService.add({
      severity: 'error',
      summary: summary ?? 'Erreur',
      detail,
      life: duration ?? APP_CONFIG.TOAST.LONG,
    });
  }

  /**
   * Show warning message
   */
  warn(detail: string, summary?: string, duration?: number) {
    this.messageService.add({
      severity: 'warn',
      summary: summary ?? 'Avertissement',
      detail,
      life: duration ?? APP_CONFIG.TOAST.SHORT,
    });
  }

  /**
   * Show info message
   */
  info(detail: string, summary?: string, duration?: number) {
    this.messageService.add({
      severity: 'info',
      summary: summary ?? 'Information',
      detail,
      life: duration ?? APP_CONFIG.TOAST.INFO,
    });
  }

  /**
   * Extract and show error from HTTP response
   */
  showHttpError(error: any, fallback?: string) {
    const detail = error?.error?.detail ?? fallback ?? APP_CONFIG.API.DEFAULT_ERROR_MESSAGE;
    this.error(detail);
  }

  /**
   * Clear all messages
   */
  clear() {
    this.messageService.clear();
  }
}

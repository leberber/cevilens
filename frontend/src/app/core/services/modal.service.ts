import { Injectable, inject, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ModalConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export interface DialogState {
  type: 'confirm' | 'import' | 'custom' | null;
  config: ModalConfig | null;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Centralized modal/dialog management service
 * Eliminates need for managing dialog state in components
 *
 * Usage:
 * ```typescript
 * this.modal.confirm({
 *   title: 'Delete item?',
 *   message: 'This cannot be undone.',
 *   onConfirm: () => this.deleteItem(),
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private ngZone = inject(NgZone);
  private dialogState$ = new BehaviorSubject<DialogState>({
    type: null,
    config: null,
  });

  readonly dialog$ = this.dialogState$.asObservable();

  /**
   * Show confirmation dialog
   */
  confirm(config: ModalConfig & { onConfirm: () => void; onCancel?: () => void }) {
    const { onConfirm, onCancel, ...modalConfig } = config;
    this.ngZone.run(() => {
      this.dialogState$.next({
        type: 'confirm',
        config: modalConfig,
        onConfirm,
        onCancel,
      });
    });
  }

  /**
   * Show import dialog with custom content
   */
  openImport(config: ModalConfig & { onConfirm: () => void; onCancel?: () => void }) {
    const { onConfirm, onCancel, ...modalConfig } = config;
    this.ngZone.run(() => {
      this.dialogState$.next({
        type: 'import',
        config: modalConfig,
        onConfirm,
        onCancel,
      });
    });
  }

  /**
   * Close current dialog
   */
  close() {
    this.ngZone.run(() => {
      this.dialogState$.next({
        type: null,
        config: null,
      });
    });
  }

  /**
   * Trigger confirm action
   */
  triggerConfirm() {
    const state = this.dialogState$.value;
    if (state.onConfirm) {
      this.ngZone.run(() => state.onConfirm!());
    }
  }

  /**
   * Trigger cancel action
   */
  triggerCancel() {
    const state = this.dialogState$.value;
    if (state.onCancel) {
      this.ngZone.run(() => state.onCancel!());
    }
    this.close();
  }

  /**
   * Update loading state
   */
  setLoading(isLoading: boolean) {
    const state = this.dialogState$.value;
    if (state.config) {
      this.dialogState$.next({
        ...state,
        config: { ...state.config, isLoading },
      });
    }
  }
}

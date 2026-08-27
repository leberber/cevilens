import { Injectable } from '@angular/core';

/**
 * Confirmation dialog state
 */
export interface ConfirmState {
  visible: boolean;
  title: string;
  message: string;
  item?: any;
  itemId?: string | number;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Helper service for managing confirmation dialog state
 * Consolidates repeated confirm dialog patterns across components
 */
@Injectable({
  providedIn: 'root',
})
export class ConfirmDialogHelper {
  /**
   * Create empty confirmation state
   */
  createEmptyState(): ConfirmState {
    return {
      visible: false,
      title: '',
      message: '',
    };
  }

  /**
   * Open confirmation dialog
   */
  openConfirm(
    title: string,
    message: string,
    item?: any,
    onConfirm?: () => void,
    onCancel?: () => void
  ): ConfirmState {
    return {
      visible: true,
      title,
      message,
      item,
      itemId: item?.id || item?.['_id'],
      onConfirm,
      onCancel,
    };
  }

  /**
   * Close confirmation dialog
   */
  closeConfirm(state: ConfirmState): void {
    state.visible = false;
    state.onCancel?.();
  }

  /**
   * Confirm action
   */
  confirm(state: ConfirmState): void {
    state.visible = false;
    state.onConfirm?.();
  }

  /**
   * Build confirmation message with item name
   */
  buildMessage(template: string, itemName?: string): string {
    if (!itemName) return template;
    return template.replace('{item}', itemName);
  }

  /**
   * Create delete confirmation state
   */
  createDeleteConfirm(
    item: any,
    itemLabel = 'cet élément',
    onConfirm?: () => void,
    onCancel?: () => void
  ): ConfirmState {
    return this.openConfirm(
      'Supprimer ?',
      `Êtes-vous sûr de vouloir supprimer ${itemLabel} ?`,
      item,
      onConfirm,
      onCancel
    );
  }
}

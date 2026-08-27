import { Injectable } from '@angular/core';

/**
 * Helper interface for delete confirmation state
 */
export interface DeleteConfirmState {
  visible: boolean;
  itemLabel: string;
  itemId?: string | number;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Helper service for managing delete confirmation patterns
 * Reduces boilerplate for delete dialogs across components
 */
@Injectable({
  providedIn: 'root',
})
export class DeleteConfirmHelper {
  /**
   * Initialize delete confirmation state
   */
  createState(): DeleteConfirmState {
    return {
      visible: false,
      itemLabel: '',
    };
  }

  /**
   * Prepare confirmation for deletion
   */
  requestDelete(
    itemLabel: string,
    onConfirm: () => void,
    itemId?: string | number,
    onCancel?: () => void
  ): DeleteConfirmState {
    return {
      visible: true,
      itemLabel,
      itemId,
      onConfirm,
      onCancel,
    };
  }

  /**
   * Build confirmation message
   */
  buildMessage(itemLabel: string): string {
    return `Êtes-vous sûr de vouloir supprimer "${itemLabel}" ? Cette action ne peut pas être annulée.`;
  }

  /**
   * Close confirmation dialog
   */
  closeConfirmation(): DeleteConfirmState {
    return {
      visible: false,
      itemLabel: '',
    };
  }
}

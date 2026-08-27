import { Injectable } from '@angular/core';

export interface ColDef {
  field: string;
  header: string;
  width: string;
  visible: boolean;
  sortable?: boolean;
  filterable?: boolean;
}

/**
 * Service to manage column visibility state in tables
 * Handles localStorage persistence automatically
 */
@Injectable({ providedIn: 'root' })
export class ColumnStateService {
  /**
   * Load column visibility state from localStorage
   */
  load(columns: ColDef[], storageKey: string): void {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const state: Record<string, boolean> = JSON.parse(saved);
      columns.forEach(col => {
        if (col.field in state) col.visible = state[col.field];
      });
    } catch {
      // Ignore parsing errors
    }
  }

  /**
   * Save column visibility state to localStorage
   */
  save(columns: ColDef[], storageKey: string): void {
    const state: Record<string, boolean> = {};
    columns.forEach(col => (state[col.field] = col.visible));
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  /**
   * Toggle column visibility and save
   */
  toggle(columns: ColDef[], field: string, storageKey: string): void {
    const col = columns.find(c => c.field === field);
    if (col) {
      col.visible = !col.visible;
      this.save(columns, storageKey);
    }
  }
}

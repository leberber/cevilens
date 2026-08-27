import { Injectable } from '@angular/core';

/**
 * Filter state configuration
 */
export interface FilterState {
  [key: string]: any;
}

/**
 * Helper service for managing filter state
 * Consolidates repeated filter reset patterns across components
 */
@Injectable({
  providedIn: 'root',
})
export class FilterStateHelper {
  /**
   * Create filter state object with all properties set to null
   */
  createFilterState<T extends FilterState>(template: T): T {
    const state = {} as T;
    for (const key in template) {
      if (template.hasOwnProperty(key)) {
        state[key] = null;
      }
    }
    return state;
  }

  /**
   * Reset all filter properties to null
   */
  resetFilters<T extends FilterState>(filters: T): void {
    for (const key in filters) {
      if (filters.hasOwnProperty(key)) {
        filters[key] = null;
      }
    }
  }

  /**
   * Check if any filter is active (not null/undefined)
   */
  hasActiveFilters<T extends FilterState>(filters: T): boolean {
    return Object.values(filters).some((v) => v != null && v !== '');
  }

  /**
   * Count active filters
   */
  countActiveFilters<T extends FilterState>(filters: T): number {
    return Object.values(filters).filter((v) => v != null && v !== '').length;
  }

  /**
   * Get only active filters as object
   */
  getActiveFilters<T extends FilterState>(filters: T): Partial<T> {
    const active = {} as Partial<T>;
    for (const [key, value] of Object.entries(filters)) {
      if (value != null && value !== '') {
        active[key as keyof T] = value;
      }
    }
    return active;
  }

  /**
   * Merge partial filters into existing state
   */
  mergeFilters<T extends FilterState>(current: T, partial: Partial<T>): T {
    return { ...current, ...partial };
  }
}

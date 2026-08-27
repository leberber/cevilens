import { Injectable } from '@angular/core';

/**
 * Helper service for filtering arrays by search term
 * Eliminates repeated search/filter logic across components
 */
@Injectable({
  providedIn: 'root',
})
export class SearchFilterHelper {
  /**
   * Filter items by search term on single field
   */
  filterByField<T>(
    items: T[],
    searchTerm: string,
    field: keyof T,
    caseSensitive = false
  ): T[] {
    if (!searchTerm) return items;
    const q = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    return items.filter(item => {
      const value = String(item[field] ?? '');
      const fieldValue = caseSensitive ? value : value.toLowerCase();
      return fieldValue.includes(q);
    });
  }

  /**
   * Filter items by search term on multiple fields
   */
  filterByFields<T>(
    items: T[],
    searchTerm: string,
    fields: (keyof T)[],
    caseSensitive = false
  ): T[] {
    if (!searchTerm) return items;
    const q = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    return items.filter(item =>
      fields.some(field => {
        const value = String(item[field] ?? '');
        const fieldValue = caseSensitive ? value : value.toLowerCase();
        return fieldValue.includes(q);
      })
    );
  }

  /**
   * Filter items using custom predicate
   */
  filterByPredicate<T>(
    items: T[],
    searchTerm: string,
    predicate: (item: T, searchTerm: string) => boolean
  ): T[] {
    if (!searchTerm) return items;
    return items.filter(item => predicate(item, searchTerm));
  }
}

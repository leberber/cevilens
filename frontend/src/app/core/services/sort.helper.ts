import { Injectable } from '@angular/core';

export type SortType = 'string' | 'number' | 'date' | 'auto';
export type SortDirection = 1 | -1;

/**
 * Helper service for array sorting operations
 * Consolidates repeated sort logic across components (12+ occurrences)
 */
@Injectable({
  providedIn: 'root',
})
export class SortHelper {
  /**
   * Compare two values with null handling
   * Handles string, number, and auto-detection
   */
  compare<T>(
    a: T,
    b: T,
    type: SortType = 'auto',
    direction: SortDirection = 1
  ): number {
    // Null handling - nulls sort first
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    // Type detection if auto
    const resolvedType = type === 'auto' ? this.detectType(a) : type;

    let result: number;
    switch (resolvedType) {
      case 'string':
        result = String(a).localeCompare(String(b), 'fr-FR');
        break;
      case 'number':
        result = (a as any) - (b as any);
        break;
      case 'date':
        result = new Date(a as any).getTime() - new Date(b as any).getTime();
        break;
      default:
        result = 0;
    }

    return result * direction;
  }

  /**
   * Create a sort comparator function for arrays
   */
  createComparator<T>(
    selector: (item: T) => any,
    type: SortType = 'auto',
    direction: SortDirection = 1
  ): (a: T, b: T) => number {
    return (a, b) => {
      const valA = selector(a);
      const valB = selector(b);
      return this.compare(valA, valB, type, direction);
    };
  }

  /**
   * Sort array by field with type detection
   */
  sortByField<T>(
    items: T[],
    field: keyof T,
    direction: SortDirection = 1,
    type: SortType = 'auto'
  ): T[] {
    return items.sort((a, b) =>
      this.compare(
        a[field],
        b[field],
        type,
        direction
      )
    );
  }

  /**
   * Toggle sort direction
   */
  toggleDirection(current: SortDirection): SortDirection {
    return current === 1 ? -1 : 1;
  }

  /**
   * Detect value type (string, number, date, other)
   */
  private detectType(value: any): SortType {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string' && !isNaN(Date.parse(value))) return 'date';
    return 'string';
  }
}

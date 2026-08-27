import { Injectable } from '@angular/core';

/**
 * Helper service for aggregate operations (sum, average, count, min, max)
 * Eliminates repeated map/filter/reduce patterns
 */
@Injectable({
  providedIn: 'root',
})
export class AggregateHelper {
  /**
   * Sum values from array items
   */
  sum<T>(
    items: T[],
    selector: (item: T) => number | null | undefined
  ): number | null {
    const vals = items
      .map(selector)
      .filter((v): v is number => v != null) as number[];
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  }

  /**
   * Calculate average of values
   */
  average<T>(
    items: T[],
    selector: (item: T) => number | null | undefined
  ): number | null {
    const vals = items
      .map(selector)
      .filter((v): v is number => v != null) as number[];
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  /**
   * Count items matching predicate
   */
  count<T>(
    items: T[],
    predicate?: (item: T) => boolean
  ): number {
    return predicate ? items.filter(predicate).length : items.length;
  }

  /**
   * Find minimum value
   */
  min<T>(
    items: T[],
    selector: (item: T) => number | null | undefined
  ): number | null {
    const vals = items
      .map(selector)
      .filter((v): v is number => v != null) as number[];
    return vals.length ? Math.min(...vals) : null;
  }

  /**
   * Find maximum value
   */
  max<T>(
    items: T[],
    selector: (item: T) => number | null | undefined
  ): number | null {
    const vals = items
      .map(selector)
      .filter((v): v is number => v != null) as number[];
    return vals.length ? Math.max(...vals) : null;
  }

  /**
   * Group items by key and sum values in each group
   */
  sumByGroup<T, K extends string | number>(
    items: T[],
    groupSelector: (item: T) => K,
    valueSelector: (item: T) => number | null | undefined
  ): Map<K, number> {
    const groups = new Map<K, number>();
    for (const item of items) {
      const key = groupSelector(item);
      const value = valueSelector(item);
      if (value != null) {
        groups.set(key, (groups.get(key) ?? 0) + value);
      }
    }
    return groups;
  }
}

/**
 * Generic toggle utilities for managing Set-based collections
 * Consolidates repeated toggle patterns across components
 */

/**
 * Toggle an item in a Set
 * Returns new Set instance for Angular change detection
 */
export function toggleInSet<T>(set: Set<T>, item: T): Set<T> {
  const newSet = new Set(set);
  if (newSet.has(item)) {
    newSet.delete(item);
  } else {
    newSet.add(item);
  }
  return newSet;
}

/**
 * Check if item is in Set
 */
export function isInSet<T>(set: Set<T>, item: T): boolean {
  return set.has(item);
}

/**
 * Check if Set is empty
 */
export function isSetEmpty<T>(set: Set<T>): boolean {
  return set.size === 0;
}

/**
 * Get Set as array
 */
export function setToArray<T>(set: Set<T>): T[] {
  return Array.from(set);
}

/**
 * Create Set from array
 */
export function arrayToSet<T>(arr: T[]): Set<T> {
  return new Set(arr);
}

/**
 * Toggle all items (select all or clear all)
 */
export function toggleSetAll<T>(set: Set<T>, items: T[]): Set<T> {
  if (set.size === items.length) {
    return new Set(); // Clear all
  }
  return new Set(items); // Select all
}

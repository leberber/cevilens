/**
 * Toggle item in a Set
 * If item exists, delete it; otherwise add it
 */
export function toggleInSet<T>(set: Set<T>, item: T): void {
  if (set.has(item)) {
    set.delete(item);
  } else {
    set.add(item);
  }
}

/**
 * Check if item is in Set
 */
export function isInSet<T>(set: Set<T>, item: T): boolean {
  return set.has(item);
}

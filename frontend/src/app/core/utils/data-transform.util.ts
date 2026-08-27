/**
 * Group array items by a property that may have a fallback value
 * @param items - Array of items to group
 * @param keyFn - Function to extract grouping key (with fallback)
 * @returns Map of key → items
 *
 * Example:
 * groupBy(objectifs, o => o.famille || 'autre')
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

/**
 * Calculate percentage from actual vs target
 * @param actual - Current/actual value
 * @param target - Goal/target value
 * @param clamp - Clamp result to [0, 100]? Default true
 * @returns Percentage as number (0-100)
 *
 * Example:
 * calculatePercentage(75, 100) → 75
 * calculatePercentage(150, 100, true) → 100
 */
export function calculatePercentage(
  actual: number,
  target: number,
  clamp = true
): number {
  if (target === 0) return 0;
  const pct = (actual / target) * 100;
  return clamp ? Math.min(Math.round(pct), 100) : Math.round(pct);
}

/**
 * Sum array of numbers, filtering nulls
 * @param numbers - Array of numbers or nulls
 * @returns Sum, or null if no valid numbers
 *
 * Example:
 * sumNumbers([10, null, 20, null]) → 30
 * sumNumbers([null, null]) → null
 */
export function sumNumbers(numbers: (number | null)[]): number | null {
  const vals = numbers.filter((v) => v != null) as number[];
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
}

/**
 * Format a number with locale-specific thousand separators
 * @param n - Number to format
 * @param decimals - Decimal places
 * @param locale - Locale string
 *
 * Example:
 * formatNumberLocale(1234.56, 2, 'fr-FR') → "1 234,56"
 */
export function formatNumberLocale(
  n: number,
  decimals = 0,
  locale = 'fr-FR'
): string {
  return n.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Safe access to nested object property with fallback
 * @param obj - Object to access
 * @param path - Property path (dot notation)
 * @param defaultValue - Fallback value
 *
 * Example:
 * safeGet(data, 'user.address.city', 'Unknown') → returns city or 'Unknown'
 */
export function safeGet<T = any>(
  obj: any,
  path: string,
  defaultValue: T
): T {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return defaultValue;
  }
  return value ?? defaultValue;
}

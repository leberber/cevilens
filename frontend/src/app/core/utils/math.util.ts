/**
 * Calculate percentage with capping to prevent overflow in UI
 * @param value - Current value
 * @param objective - Target value
 * @param limit - Maximum percentage to display (default 999)
 * @returns Capped percentage as integer (0-limit)
 */
export function calculatePercentage(value: number, objective: number | null | undefined, limit = 999): number {
  if (!objective) return 0;
  return Math.min(Math.round((value / objective) * 100), limit);
}

/**
 * Calculate percentage with lower limit (default 100 for UI constraints)
 * @param value - Current value
 * @param objective - Target value
 * @param limit - Maximum percentage (default 100)
 * @returns Capped percentage (0-limit)
 */
export function calculatePercentageCapped(value: number, objective: number | null | undefined, limit = 100): number {
  if (!objective) return 0;
  return Math.min(Math.round((value / objective) * 100), limit);
}

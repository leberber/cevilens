import { Injectable } from '@angular/core';

/**
 * Period navigation and formatting helpers
 * Centralized logic for handling YYYY-MM period strings
 */
@Injectable({
  providedIn: 'root',
})
export class PeriodService {
  /**
   * Format period string to locale date
   * "2024-12" → "décembre 2024"
   */
  format(period: string, locale = 'fr-FR'): string {
    if (!period) return '';
    const [y, m] = period.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Get previous period
   * "2024-03" → "2024-02", at start of list → null
   */
  getPrevious(periods: string[], current: string): string | null {
    const idx = periods.indexOf(current);
    return idx > 0 ? periods[idx - 1] : null;
  }

  /**
   * Get next period (chronologically earlier)
   * "2024-03" → "2024-04", at end of list → null
   */
  getNext(periods: string[], current: string): string | null {
    const idx = periods.indexOf(current);
    return idx < periods.length - 1 ? periods[idx + 1] : null;
  }

  /**
   * Check if can go to previous period
   */
  canGoPrevious(periods: string[], current: string): boolean {
    return this.getPrevious(periods, current) !== null;
  }

  /**
   * Check if can go to next period
   */
  canGoNext(periods: string[], current: string): boolean {
    return this.getNext(periods, current) !== null;
  }

  /**
   * Parse period string to year and month
   */
  parse(period: string): { year: number; month: number } | null {
    const [y, m] = period.split('-');
    if (!y || !m) return null;
    return { year: +y, month: +m };
  }

  /**
   * Create period string from year and month
   */
  create(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
}

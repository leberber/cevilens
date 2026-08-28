import { Injectable } from '@angular/core';

/**
 * Helper service for date operations
 * Consolidates repeated date calculation logic
 */
@Injectable({
  providedIn: 'root',
})
export class DateHelper {
  /**
   * Get last day of month for given period (YYYY-MM format)
   * Replaces duplicated logic across 4 components
   */
  getLastDayOfMonth(period: string): string {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m, 0).getDate();
    return `${period}-${String(d).padStart(2, '0')}`;
  }

  /**
   * Get first day of month for given period
   */
  getFirstDayOfMonth(period: string): string {
    return `${period}-01`;
  }

  /**
   * Check if date is within period
   */
  isDateInPeriod(date: Date, period: string): boolean {
    const [y, m] = period.split('-').map(Number);
    return date.getFullYear() === y && date.getMonth() + 1 === m;
  }

  /**
   * Get period from date (YYYY-MM format)
   */
  getPeriodFromDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  /**
   * Parse period string to Date (returns first day of month)
   */
  parsePeriod(period: string): Date {
    const [y, m] = period.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }

  /**
   * Add months to period
   */
  addMonthsToPeriod(period: string, months: number): string {
    const date = this.parsePeriod(period);
    date.setMonth(date.getMonth() + months);
    return this.getPeriodFromDate(date);
  }

  /**
   * Format period for display (YYYY-MM → "Jan 2024" or similar)
   */
  formatPeriod(period: string, locale: string = 'fr-FR'): string {
    const date = this.parsePeriod(period);
    return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  }

  /**
   * Format period range for display (YYYY-MM → DD/MM/YYYY)
   */
  formatPeriodRange(periodStart: string, periodEnd?: string, locale: string = 'fr-FR'): string {
    const dateStart = this.parsePeriod(periodStart);
    const fmt = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

    if (!periodEnd || periodEnd === periodStart) {
      return fmt(dateStart);
    }

    const dateEnd = this.parsePeriod(periodEnd);
    return `${fmt(dateStart)} → ${fmt(dateEnd)}`;
  }
}

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FormatService {
  /**
   * Format number with M/k notation (millions/thousands)
   * 1000000 → "1.0 M", 1500 → "2 k", 500 → "500"
   */
  formatMontant(n: number, decimals = 1): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(decimals) + ' M';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + ' k';
    return n.toFixed(0);
  }

  /**
   * Format date to locale string
   * "2024-12" → "décembre 2024" (fr-FR)
   */
  formatDate(dateStr: string, locale = 'fr-FR', options?: Intl.DateTimeFormatOptions): string {
    if (!dateStr) return '';
    const [y, m] = dateStr.split('-');
    const defaultOpts = { month: 'long', year: 'numeric' } as Intl.DateTimeFormatOptions;
    const opts = options || defaultOpts;
    return new Date(+y, +m - 1).toLocaleDateString(locale, opts);
  }

  /**
   * Format number with specific decimal places
   * 123.456, 2 → "123.46"
   */
  formatNumber(n: number | null, decimals = 2): string {
    if (n == null) return '—';
    return parseFloat(n.toPrecision(decimals + 5)).toFixed(decimals);
  }

  /**
   * Get CSS class based on log level or status
   * 'ERROR' → 'log-level--error'
   */
  getStatusClass(level: string, prefix = 'log-level'): string {
    if (level === 'ERROR') return `${prefix}--error`;
    if (level === 'WARNING') return `${prefix}--warn`;
    if (level === 'INFO') return `${prefix}--info`;
    return `${prefix}--debug`;
  }

  /**
   * Convert null/0 to empty string, otherwise to string
   * null → "", 5 → "5"
   */
  emptyIfNull(v: number | null): string {
    return v ? String(v) : '';
  }

  /**
   * Format number to French locale with thousands separator
   * 1234567 → "1 234 567" or "1 234 567,89"
   */
  toLocaleString(n: number | null, decimals?: number): string {
    if (n == null) return '—';
    if (decimals !== undefined) {
      return n.toLocaleString('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return n.toLocaleString('fr-FR');
  }

  /**
   * Sort strings with locale-aware comparison
   * "école" vs "éléphant" → proper alphabetical order
   */
  localeCompare(a: string | null, b: string | null): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    return String(a).localeCompare(String(b), 'fr-FR');
  }

  /**
   * Compare numbers with null handling
   * null treated as smallest value
   */
  compareNumbers(a: number | null, b: number | null, direction: 1 | -1 = 1): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    return (a - b) * direction;
  }
}

import { Injectable } from '@angular/core';

/**
 * Pure formatting functions for the Dashboard component.
 * No state, fully stateless and tree-shakeable.
 */
@Injectable({ providedIn: 'root' })
export class DashboardFormatterService {

  /**
   * Format period string (YYYY-MM) to French locale display (e.g., "January 2024")
   */
  formatPeriod(p: string): string {
    if (!p) return '';
    const [y, m] = p.split('-');
    return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  /**
   * Format number with compact notation (K for thousands, M for millions)
   * e.g., 1200 → "1.2k", 1500000 → "1.5M"
   */
  formatNum(n: number | undefined | null): string {
    if (n == null) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(Math.round(n));
  }

  /**
   * Format CA (chiffre d'affaires) with currency prefix
   * e.g., 1200000 → "DA 1.2M"
   */
  formatCa(n: number | null | undefined): string {
    if (!n) return '—';
    if (n >= 1_000_000_000) return `DA ${(n / 1_000_000_000).toFixed(1)}G`;
    if (n >= 1_000_000) return `DA ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `DA ${(n / 1_000).toFixed(0)}k`;
    return `DA ${Math.round(n)}`;
  }

  /**
   * Format percentage delta (e.g., 5 → "+5%", -3 → "-3%")
   */
  formatDelta(delta: number | null): string {
    if (delta === null) return '';
    return `${delta > 0 ? '+' : ''}${delta}%`;
  }

  /**
   * Capitalize first letter of string
   */
  capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  /**
   * Strip agency prefix from FDV code (e.g., "1501-VD201" → "VD201")
   */
  routeCode(code: string): string {
    const parts = code.split('-');
    return parts.length > 1 ? parts.slice(1).join('-') : code;
  }
}

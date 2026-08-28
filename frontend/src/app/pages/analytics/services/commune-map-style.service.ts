import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CommuneMapStyleService {
  /**
   * Compute fill color for choropleth based on normalized value
   * Uses square root for better visual distribution
   */
  fillColor(total: number, maxTotal: number): string {
    const t = Math.pow(total / maxTotal, 0.5);
    return `rgb(${Math.round(219 - 190 * t)},${Math.round(234 - 156 * t)},${Math.round(254 - 38 * t)})`;
  }

  /**
   * Format number for display (e.g., 1234 → "1.2k", 999 → "999")
   */
  fmtVal(v: number): string {
    return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;
  }
}

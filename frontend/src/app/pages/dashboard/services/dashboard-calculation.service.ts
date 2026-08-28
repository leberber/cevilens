import { Injectable, inject } from '@angular/core';
import { calculatePercentage, calculatePercentageCapped } from '../../../core/utils/math.util';
import { DashboardFormatterService } from './dashboard-formatter.service';

/**
 * Pure calculation functions for the Dashboard component.
 * All calculations are stateless — displayMode is passed as parameter, not stored.
 */
@Injectable({ providedIn: 'root' })
export class DashboardCalculationService {
  private formatter = inject(DashboardFormatterService);

  /**
   * Convert packs to tonnes using objectif ratio as conversion factor
   * (total / objPacks) * objTonne
   */
  inTonnes(total: number, objPacks: number | null | undefined, objTonne: number | null | undefined): number | null {
    if (!objPacks || !objTonne) return null;
    return (total / objPacks) * objTonne;
  }

  /**
   * Format a value in the current display mode (packs or tonnes)
   * Returns compact string representation
   */
  displayVal(total: number, objPacks: number | null | undefined, objTonne: number | null | undefined, displayMode: 'packs' | 'tonnes'): string {
    if (displayMode === 'tonnes') {
      const t = this.inTonnes(total, objPacks, objTonne);
      return t != null ? t.toFixed(2) : '—';
    }
    return this.formatter.formatNum(total);
  }

  /**
   * Format an objective value in the current display mode
   */
  displayObjVal(objPacks: number | null | undefined, objTonne: number | null | undefined, displayMode: 'packs' | 'tonnes'): string {
    if (displayMode === 'tonnes') return objTonne != null ? objTonne.toFixed(2) : '—';
    return objPacks != null ? this.formatter.formatNum(objPacks) : '—';
  }

  /**
   * Calculate achievement percentage in the current display mode
   */
  displayObjPct(total: number, objPacks: number | null | undefined, objTonne: number | null | undefined, displayMode: 'packs' | 'tonnes'): number {
    if (displayMode === 'tonnes') {
      const t = this.inTonnes(total, objPacks, objTonne);
      return calculatePercentage(t ?? 0, objTonne);
    }
    return calculatePercentage(total, objPacks);
  }

  /**
   * Color for product objective achievement percentage
   * 90%+ = success (green)
   * 70-89% = warning (amber)
   * 50-69% = alert (orange)
   * <50% = error (red)
   */
  prodObjColor(p: { total: number; objectif_packs: number | null }): string {
    const pct = calculatePercentage(p.total, p.objectif_packs);
    if (pct >= 90) return 'var(--color-success)';
    if (pct >= 70) return 'var(--color-warning)';
    if (pct >= 50) return '#f97316';
    return 'var(--color-error)';
  }

  /**
   * Product width percentage for bar chart (relative to max in sous-famille)
   */
  prodPct(prodTotal: number, sfMax: number): number {
    return sfMax > 0 ? (prodTotal / sfMax) * 100 : 0;
  }

  /**
   * FDV share percentage (item total vs total)
   */
  fdvSharePct(itemTotal: number, totalSum: number): string {
    if (!totalSum) return '0%';
    return `${Math.round((itemTotal / totalSum) * 100)}%`;
  }

  /**
   * SVG path geometry — calculate points for chart
   */
  private svgPoints(weeks: number[], w: number, h: number, pad: number = 12): { x: number; y: number }[] {
    if (weeks.length === 0) return [];
    if (weeks.length === 1) return [{ x: w / 2, y: h / 2 }];
    const max = Math.max(...weeks, 1);
    const usableH = h - pad;
    const step = w / (weeks.length - 1);
    return weeks.map((v, i) => ({ x: i * step, y: h - (v / max) * usableH }));
  }

  /**
   * Generate SVG path for filled area chart (with cubic bezier curves)
   */
  areaPath(weeks: number[], w: number, h: number): string {
    const pts = this.svgPoints(weeks, w, h);
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M${pts[0].x},${pts[0].y} L${w},${h} L0,${h} Z`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C${cpx},${pts[i - 1].y} ${cpx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
    }
    return `${d} L${w},${h} L0,${h} Z`;
  }

  /**
   * Generate SVG path for line chart (with cubic bezier curves, no fill)
   */
  linePath(weeks: number[], w: number, h: number): string {
    const pts = this.svgPoints(weeks, w, h);
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C${cpx},${pts[i - 1].y} ${cpx},${pts[i].y} ${pts[i].x},${pts[i].y}`;
    }
    return d;
  }

  /**
   * Rate color (tooltip FDV product breakdown)
   */
  rateColor(pct: number): string {
    if (pct >= 90) return 'var(--color-success)';
    if (pct >= 70) return 'var(--color-warning)';
    if (pct >= 50) return '#f97316';
    return 'var(--color-error)';
  }

  /**
   * CSS class for objective achievement tier
   */
  pvObjClass(pct: number): string {
    if (pct >= 90) return 'pv-obj--green';
    if (pct >= 70) return 'pv-obj--amber';
    if (pct >= 50) return 'pv-obj--orange';
    return 'pv-obj--red';
  }
}

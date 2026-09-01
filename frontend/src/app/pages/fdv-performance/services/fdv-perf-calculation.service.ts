import { Injectable, inject } from '@angular/core';
import { calculatePercentage } from '../../../core/utils/math.util';
import { FdvPerfFormatterService } from './fdv-perf-formatter.service';

/**
 * Pure calculation functions for the FDV Performance page.
 * Backend returns data in tonnes by default; this service just formats and computes percentages.
 */
@Injectable({ providedIn: 'root' })
export class FdvPerfCalculationService {
  private formatter = inject(FdvPerfFormatterService);

  /**
   * Format a total value (already in tonnes from backend).
   */
  displayVal(total: number): string {
    return this.formatter.formatNum(total);
  }

  /**
   * Format an objective value. Prefers tonnes, falls back to packs.
   */
  displayObjVal(objTonne: number | null | undefined, objPacks?: number | null | undefined): string {
    if (objTonne != null) return this.formatter.formatNum(objTonne);
    return objPacks != null ? this.formatter.formatNum(objPacks) : '—';
  }

  /**
   * Calculate achievement percentage. Total is already in tonnes, compare against tonne objective.
   */
  displayObjPct(total: number, objTonne: number | null | undefined, objPacks?: number | null | undefined): number {
    if (objTonne) return calculatePercentage(total, objTonne);
    return calculatePercentage(total, objPacks);
  }

  /**
   * Color for product objective achievement percentage
   */
  prodObjColor(p: { total: number; objectif_tonne: number | null }): string {
    const pct = calculatePercentage(p.total, p.objectif_tonne);
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
    if (pct >= 95) return 'pv-obj--green';
    if (pct >= 60) return 'pv-obj--orange';
    return 'pv-obj--red';
  }
}

import { Injectable } from '@angular/core';
import { calculatePercentage, calculatePercentageCapped } from '../../../core/utils/math.util';
import type { DrilldownData, DrilldownFamille, FdvItem } from '../../../core/services/prevendeur.service';

export interface FdvRateEntry {
  nom: string;
  sf: string;
  sold: number;
  obj: number;
  pct: number;
}

/**
 * Encapsulates FDV performance, ranking, and rate calculations.
 */
@Injectable({ providedIn: 'root' })
export class DashboardFdvRankingService {

  /**
   * Build detailed product-level rates for a given FDV (for tooltip grid)
   * Iterates all familles → sous-familles → produits to find rates
   */
  buildFdvRates(code: string, data: DrilldownData | null): FdvRateEntry[] {
    if (!data) return [];
    const result: FdvRateEntry[] = [];
    for (const f of data.familles ?? []) {
      for (const sf of f.sous_familles) {
        for (const p of sf.produits) {
          const obj = p.objectif_tonne ?? p.objectif_packs_tournee;
          if (!obj) continue;
          const sold = p.top_fdv.find(x => x.code === code)?.total ?? 0;
          const pct = calculatePercentageCapped(sold, obj, 100);
          result.push({
            nom: p.nom,
            sf: sf.nom,
            sold,
            obj,
            pct,
          });
        }
      }
    }
    return result.sort((a, b) => a.pct - b.pct);
  }

  /**
   * Calculate average rate from FDV rates array
   */
  averageRate(rates: FdvRateEntry[]): number {
    if (!rates.length) return 0;
    return Math.round(rates.reduce((s, r) => s + r.pct, 0) / rates.length);
  }

  /**
   * Get FDV rank (0=gold, 1=silver, 2=bronze, -1=none)
   * Based on position in fdvPerfSorted list
   */
  fdvRank(code: string, fdvPerfSorted: FdvItem[]): number {
    const i = fdvPerfSorted.findIndex(p => p.code === code);
    return i < 3 ? i : -1;
  }

  /**
   * Simple percentage: FDV total vs global objectif_packs_per_route
   */
  pvSimplePct(pv: FdvItem, objectifPacksPerRoute: number | null | undefined): number {
    return calculatePercentage(pv.total, objectifPacksPerRoute);
  }

  /**
   * CSS class for FDV objective tier
   * 90%+ = green, 70%+ = amber, 50%+ = orange, <50% = red
   */
  pvObjClass(pct: number): string {
    if (pct >= 95) return 'pv-obj--green';
    if (pct >= 60) return 'pv-obj--orange';
    return 'pv-obj--red';
  }

  /**
   * Calculate total percentage across multiple rates
   * Used for FDV tooltip average rate
   */
  totalPctFromRates(rates: FdvRateEntry[]): number {
    if (!rates.length) return 0;
    return Math.round(rates.reduce((s, r) => s + r.pct, 0) / rates.length);
  }

  /**
   * Sort FDV performance items by total descending
   */
  sortFdvByTotal(prevendeurs: FdvItem[]): FdvItem[] {
    return [...prevendeurs].sort((a, b) => b.total - a.total);
  }
}

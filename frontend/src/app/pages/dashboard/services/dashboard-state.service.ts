import { Injectable, signal, computed, inject } from '@angular/core';
import type { DrilldownData, DrilldownFamille, DrilldownProduit, FdvItem } from '../../../core/services/prevendeur.service';
import { calculatePercentage } from '../../../core/utils/math.util';
import { DashboardFormatterService } from './dashboard-formatter.service';
import { DashboardCalculationService } from './dashboard-calculation.service';

/**
 * Centralized state management for Dashboard using Angular signals.
 * Sub-components inject this service to read state directly, eliminating the need
 * for long @Input chains from the container component.
 */
@Injectable({ providedIn: 'root' })
export class DashboardStateService {
  private formatter = inject(DashboardFormatterService);
  private calc = inject(DashboardCalculationService);

  // ==========================================================================
  // WRITABLE SIGNALS (set by container component)
  // ==========================================================================

  selectedPeriode = signal<string>('');
  selectedFamille = signal<DrilldownFamille | null>(null);
  selectedProduct = signal<DrilldownProduit | null>(null);
  selectedFdv = signal<string | null>(null);
  selectedCanal = signal<'VD' | 'VH'>('VD');
  displayMode = signal<'packs' | 'tonnes'>('tonnes');
  selectedDistributeur = signal<string | null>(null);
  data = signal<DrilldownData | null>(null);
  loading = signal<boolean>(true);
  overviewFamilles = signal<DrilldownFamille[]>([]);
  fdvPerfSorted = signal<FdvItem[]>([]);
  displayValues = signal<Record<string, number>>({});
  barsReady = signal<boolean>(false);
  compactCards = signal<boolean>(false);
  pinnedFamilies = signal<Set<string>>(new Set());

  // UI state
  showDistMenu = signal<boolean>(false);
  collapsedSfs = signal<Set<string>>(new Set());
  collapsedOverviewFamilles = signal<Set<string>>(new Set());
  hoveredFdv = signal<string | null>(null);
  hoveredFdvRates = signal<{ nom: string; sf: string; sold: number; obj: number; pct: number }[]>([]);
  tooltipTop = signal<number>(0);

  // Cached global totals (fixed at load time)
  globalTotal = signal<number>(0);
  globalObjectif = signal<number>(0);
  globalObjectifTonne = signal<number>(0);
  globalCa = signal<number>(0);
  isPlatformAdmin = signal<boolean>(false);

  // ==========================================================================
  // COMPUTED SIGNALS (derived automatically)
  // ==========================================================================

  unitLabel = computed(() => this.displayMode() === 'tonnes' ? 't' : 'caisses');

  canGoPrev = computed(() => {
    const d = this.data();
    if (!d) return false;
    return d.periodes.indexOf(this.selectedPeriode()) < d.periodes.length - 1;
  });

  canGoNext = computed(() => {
    const d = this.data();
    if (!d) return false;
    return d.periodes.indexOf(this.selectedPeriode()) > 0;
  });

  selectedFdvName = computed(() => {
    const d = this.data();
    const code = this.selectedFdv();
    return d?.prevendeurs.find(p => p.code === code)?.nom ?? code ?? '';
  });

  // Objective percentages in current display mode
  totalObjPct = computed(() => {
    const objPacks = this.globalObjectif();
    return calculatePercentage(this.globalTotal(), objPacks);
  });

  // FDV performance context
  fdvPerfTitle = computed(() => {
    const prod = this.selectedProduct();
    const fam = this.selectedFamille();
    if (prod) return `${prod.nom} — Prévendeurs`;
    if (fam) return `${fam.nom.charAt(0).toUpperCase() + fam.nom.slice(1)} — Prévendeurs`;
    return 'Performance prévendeurs';
  });

  fdvPerfItems = computed(() => {
    const prod = this.selectedProduct();
    const fam = this.selectedFamille();
    if (prod) return prod.top_fdv;
    if (fam) return fam.top_fdv;
    return this.fdvPerfSorted();
  });

  fdvPerfMax = computed(() => {
    return this.fdvPerfItems().reduce((m, x) => Math.max(m, x.total), 1);
  });

  fdvPerfTotal = computed(() => {
    return this.fdvPerfItems().reduce((s, x) => s + x.total, 0);
  });

  // Pinned families calculations
  hasPinned = computed(() => this.pinnedFamilies().size > 0);

  pinnedFamiliesArray = computed(() => [...this.pinnedFamilies()]);

  pinnedData = computed(() => {
    const d = this.data();
    const pinned = this.pinnedFamilies();
    return d?.familles.filter(f => pinned.has(f.nom)) ?? [];
  });

  pinnedTotal = computed(() => {
    return this.pinnedData().reduce((s, f) => s + f.total, 0);
  });

  pinnedCa = computed(() => {
    return this.pinnedData().reduce((s, f) => s + (f.ca ?? 0), 0);
  });

  pinnedObjPacks = computed(() => {
    return this.pinnedData().reduce((s, f) => s + (f.objectif_packs ?? 0), 0);
  });

  pinnedObjTonne = computed(() => {
    return this.pinnedData().reduce((s, f) => s + (f.objectif_tonne ?? 0), 0);
  });

  pinnedHasObjectif = computed(() => this.pinnedObjPacks() > 0);

  pinnedObjPct = computed(() => {
    return calculatePercentage(this.pinnedTotal(), this.pinnedObjPacks());
  });

  // Global totals display (for header global achievement badge)
  totalDisplay = computed(() => {
    return this.formatter.formatNum(this.globalTotal());
  });

  totalObjDisplay = computed(() => {
    return this.formatter.formatNum(this.globalObjectif());
  });

  totalObjClass = computed(() => {
    const pct = this.totalObjPct();
    if (pct >= 90) return 'pv-obj--green';
    if (pct >= 70) return 'pv-obj--amber';
    if (pct >= 50) return 'pv-obj--orange';
    return 'pv-obj--red';
  });

  // ==========================================================================
  // METHODS (for container component to call)
  // ==========================================================================

  togglePin(nom: string): void {
    const pinned = new Set(this.pinnedFamilies());
    if (pinned.has(nom)) {
      pinned.delete(nom);
    } else {
      pinned.add(nom);
    }
    this.pinnedFamilies.set(pinned);
  }

  clearPinned(): void {
    this.pinnedFamilies.set(new Set());
  }

  toggleOverviewFamille(nom: string): void {
    const collapsed = new Set(this.collapsedOverviewFamilles());
    if (collapsed.has(nom)) {
      collapsed.delete(nom);
    } else {
      collapsed.add(nom);
    }
    this.collapsedOverviewFamilles.set(collapsed);
  }

  toggleSfCollapse(nom: string): void {
    const collapsed = new Set(this.collapsedSfs());
    if (collapsed.has(nom)) {
      collapsed.delete(nom);
    } else {
      collapsed.add(nom);
    }
    this.collapsedSfs.set(collapsed);
  }

  resetCollapse(): void {
    this.collapsedSfs.set(new Set());
    this.barsReady.set(false);
  }

  drillToRoot(): void {
    this.selectedFamille.set(null);
    this.selectedProduct.set(null);
    this.resetCollapse();
  }

  setDistributorMenu(visible: boolean): void {
    this.showDistMenu.set(visible);
  }

  setHoveredFdv(code: string | null, rates?: { nom: string; sf: string; sold: number; obj: number; pct: number }[]): void {
    this.hoveredFdv.set(code);
    if (rates) {
      this.hoveredFdvRates.set(rates);
    }
  }

  setTooltipTop(top: number): void {
    this.tooltipTop.set(top);
  }

  closeTooltip(): void {
    this.hoveredFdv.set(null);
  }
}

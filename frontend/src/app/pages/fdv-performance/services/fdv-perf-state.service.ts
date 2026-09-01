import { Injectable, signal, computed, inject } from '@angular/core';
import type { DrilldownData, DrilldownFamille, DrilldownProduit, FdvItem } from '../../../core/services/prevendeur.service';
import { calculatePercentage } from '../../../core/utils/math.util';
import { FdvPerfFormatterService } from './fdv-perf-formatter.service';
import { achievementColor } from '../../../core/constants/app.constants';

/**
 * Centralized state management for FDV Performance page using Angular signals.
 * Sub-components inject this service to read state directly, eliminating the need
 * for long @Input chains from the container component.
 */
@Injectable({ providedIn: 'root' })
export class FdvPerfStateService {
  private formatter = inject(FdvPerfFormatterService);

  // ==========================================================================
  // WRITABLE SIGNALS (set by container component)
  // ==========================================================================

  selectedPeriode = signal<string>('');
  selectedFamille = signal<DrilldownFamille | null>(null);
  selectedProduct = signal<DrilldownProduit | null>(null);
  selectedFdv = signal<string | null>(null);
  selectedCanal = signal<'VD' | 'VH'>('VD');
  data = signal<DrilldownData | null>(null);
  loading = signal<boolean>(true);
  overviewFamilles = signal<DrilldownFamille[]>([]);
  fdvPerfSorted = signal<FdvItem[]>([]);
  displayValues = signal<Record<string, number>>({});
  barsReady = signal<boolean>(false);
  compactCards = signal<boolean>(false);

  // UI state
  collapsedSfs = signal<Set<string>>(new Set());
  collapsedOverviewFamilles = signal<Set<string>>(new Set());

  // Cached global totals (fixed at load time)
  globalTotal = signal<number>(0);
  globalObjectif = signal<number>(0);
  globalObjectifTonne = signal<number>(0);
  globalCa = signal<number>(0);
  isPlatformAdmin = signal<boolean>(false);

  // ==========================================================================
  // COMPUTED SIGNALS (derived automatically)
  // ==========================================================================

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

  // Objective percentage (total is already in tonnes from backend)
  totalObjPct = computed(() => {
    const objTonne = this.globalObjectifTonne();
    if (objTonne) return calculatePercentage(this.globalTotal(), objTonne);
    return calculatePercentage(this.globalTotal(), this.globalObjectif());
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

  // Global totals display (data is already in tonnes from backend)
  totalDisplay = computed(() => {
    return this.formatter.formatNum(this.globalTotal());
  });

  totalObjDisplay = computed(() => {
    const objTonne = this.globalObjectifTonne();
    const val = objTonne || this.globalObjectif();
    return val ? val.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '0';
  });

  totalObjColor = computed(() => achievementColor(this.totalObjPct()));

  // ==========================================================================
  // METHODS (for container component to call)
  // ==========================================================================

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

}

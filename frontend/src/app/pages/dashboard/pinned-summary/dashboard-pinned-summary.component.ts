import { Component, inject, output, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { DashboardStateService } from '../services/dashboard-state.service';
import { DashboardFormatterService } from '../services/dashboard-formatter.service';
import { DashboardCalculationService } from '../services/dashboard-calculation.service';
import { DashboardFdvRankingService } from '../services/dashboard-fdv-ranking.service';
import { getFamilyColor, getFamilyBg } from '../../../core/constants/colors';
import type { FdvRateEntry } from '../services/dashboard-fdv-ranking.service';

@Component({
  selector: 'app-dashboard-pinned-summary',
  standalone: true,
  imports: [NgClass],
  templateUrl: './dashboard-pinned-summary.component.html',
  styleUrl: './dashboard-pinned-summary.component.scss',
})
export class DashboardPinnedSummaryComponent {
  state = inject(DashboardStateService);
  formatter = inject(DashboardFormatterService);
  calc = inject(DashboardCalculationService);
  fdvRanking = inject(DashboardFdvRankingService);

  // Outputs
  pinToggle = output<{ nom: string; event: MouseEvent }>();
  pinnedClear = output<void>();

  // Getters for template
  get hasPinned() { return this.state.hasPinned(); }
  get pinnedFamiliesArray() { return this.state.pinnedFamiliesArray(); }
  get data() { return this.state.data(); }
  get displayMode() { return this.state.displayMode(); }
  get unitLabel() { return this.state.unitLabel(); }
  get pinnedTotal() { return this.state.pinnedTotal(); }
  get pinnedCa() { return this.state.pinnedCa(); }
  get pinnedObjPacks() { return this.state.pinnedObjPacks(); }
  get pinnedObjTonne() { return this.state.pinnedObjTonne(); }
  get pinnedHasObjectif() { return this.state.pinnedHasObjectif(); }
  get pinnedObjPct() { return this.state.pinnedObjPct(); }
  get hoveredFdv() { return this.state.hoveredFdv(); }
  get hoveredFdvRates() { return this.state.hoveredFdvRates(); }
  get tooltipTop() { return this.state.tooltipTop(); }

  // Computed signal for tooltip header info
  hoveredFdvName = computed(() => {
    const code = this.hoveredFdv;
    if (!code) return '';
    return this.data?.prevendeurs.find((p: any) => p.code === code)?.nom ?? code ?? '';
  });

  hoveredFdvTotalPct = computed(() => {
    const rates = this.hoveredFdvRates;
    if (!rates.length) return 0;
    return Math.round(rates.reduce((s: number, r: FdvRateEntry) => s + r.pct, 0) / rates.length);
  });

  pinnedTotalDisplay = computed(() => {
    return this.calc.displayVal(this.pinnedTotal, this.pinnedObjPacks, this.pinnedObjTonne, this.displayMode);
  });

  pinnedObjDisplay = computed(() => {
    return this.calc.displayObjVal(this.pinnedObjPacks, this.pinnedObjTonne, this.displayMode);
  });

  pinnedObjClass = computed(() => {
    const pct = this.pinnedObjPct;
    if (pct >= 90) return 'pv-obj--green';
    if (pct >= 70) return 'pv-obj--amber';
    if (pct >= 50) return 'pv-obj--orange';
    return 'pv-obj--red';
  });

  onPin(nom: string, event: MouseEvent) {
    event.stopPropagation();
    this.pinToggle.emit({ nom, event });
  }

  onClearPinned() {
    this.pinnedClear.emit();
  }

  // Formatters
  formatNum(n: number | undefined | null): string {
    return this.formatter.formatNum(n);
  }

  formatCa(n: number | null | undefined): string {
    return this.formatter.formatCa(n);
  }

  capitalize(s: string): string {
    return this.formatter.capitalize(s);
  }

  // Color helpers
  familyColor(nom: string): string {
    return getFamilyColor(nom);
  }

  familyBg(nom: string): string {
    return getFamilyBg(nom);
  }

  rateColor(pct: number): string {
    return this.calc.rateColor(pct);
  }
}

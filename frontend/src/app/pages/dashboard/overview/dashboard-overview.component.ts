import { Component, inject, output } from '@angular/core';
import { DashboardStateService } from '../services/dashboard-state.service';
import { DashboardFormatterService } from '../services/dashboard-formatter.service';
import { DashboardCalculationService } from '../services/dashboard-calculation.service';
import { getFamilyColor, getFamilyBg } from '../../../core/constants/colors';
import type { DrilldownFamille } from '../../../core/services/prevendeur.service';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.scss',
})
export class DashboardOverviewComponent {
  state = inject(DashboardStateService);
  formatter = inject(DashboardFormatterService);
  calc = inject(DashboardCalculationService);

  // Outputs
  familleSelect = output<DrilldownFamille>();

  readonly Math = Math;
  readonly skeletonRows = Array(5).fill(0);

  // Getters for template
  get loading() { return this.state.loading(); }
  get data() { return this.state.data(); }
  get selectedFamille() { return this.state.selectedFamille(); }
  get displayValues() { return this.state.displayValues(); }

  onSelectFamille(f: DrilldownFamille) {
    this.familleSelect.emit(f);
  }

  // Formatters
  formatNum(n: number | undefined | null): string {
    return this.formatter.formatNum(n);
  }

  formatCa(n: number | null | undefined): string {
    return this.formatter.formatCa(n);
  }

  formatDelta(delta: number | null): string {
    return this.formatter.formatDelta(delta);
  }

  capitalize(s: string): string {
    return this.formatter.capitalize(s);
  }

  // Calculations
  displayVal(total: number): string {
    return this.calc.displayVal(total);
  }

  objPct(f: DrilldownFamille): number {
    return this.calc.displayObjPct(f.total, f.objectif_tonne, f.objectif_packs);
  }

  formatObj(f: DrilldownFamille): string {
    const val = f.objectif_tonne ?? f.objectif_packs ?? 0;
    return val.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }

  familyColor(nom: string): string {
    return getFamilyColor(nom);
  }

  familyBg(nom: string): string {
    return getFamilyBg(nom);
  }

}

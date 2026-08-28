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
  pinToggle = output<{ nom: string; event: MouseEvent }>();

  readonly WEEK_LABELS = ['S1', 'S2', 'S3', 'S4'];
  readonly Math = Math;
  readonly skeletonRows = Array(5).fill(0);

  // Getters for template
  get loading() { return this.state.loading(); }
  get data() { return this.state.data(); }
  get selectedFamille() { return this.state.selectedFamille(); }
  get displayValues() { return this.state.displayValues(); }
  get compactCards() { return this.state.compactCards(); }
  get displayMode() { return this.state.displayMode(); }
  get unitLabel() { return this.state.unitLabel(); }
  get barsReady() { return this.state.barsReady(); }
  get pinnedFamilies() { return this.state.pinnedFamilies(); }

  onSelectFamille(f: DrilldownFamille) {
    this.familleSelect.emit(f);
  }

  onPin(nom: string, event: MouseEvent) {
    event.stopPropagation();
    this.pinToggle.emit({ nom, event });
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
  displayVal(total: number, objPacks?: number | null, objTonne?: number | null): string {
    return this.calc.displayVal(total, objPacks, objTonne, this.displayMode);
  }

  displayObjVal(objPacks?: number | null, objTonne?: number | null): string {
    return this.calc.displayObjVal(objPacks, objTonne, this.displayMode);
  }

  objPct(f: DrilldownFamille): number {
    return this.calc.displayObjPct(f.total, f.objectif_packs, f.objectif_tonne, this.displayMode);
  }

  familyColor(nom: string): string {
    return getFamilyColor(nom);
  }

  familyBg(nom: string): string {
    return getFamilyBg(nom);
  }

  areaPath(weeks: number[], w: number, h: number): string {
    return this.calc.areaPath(weeks, w, h);
  }

  linePath(weeks: number[], w: number, h: number): string {
    return this.calc.linePath(weeks, w, h);
  }
}

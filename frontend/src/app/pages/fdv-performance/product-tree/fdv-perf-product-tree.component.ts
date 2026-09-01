import { Component, inject, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FdvPerfStateService } from '../services/fdv-perf-state.service';
import { FdvPerfFormatterService } from '../services/fdv-perf-formatter.service';
import { FdvPerfCalculationService } from '../services/fdv-perf-calculation.service';
import { CHART_COLORS, getFamilyColor, getFamilyBg } from '../../../core/constants/colors';
import { calculatePercentage } from '../../../core/utils/math.util';
import type { DrilldownProduit, DrilldownSousFamille } from '../../../core/services/prevendeur.service';

@Component({
  selector: 'app-fdv-perf-product-tree',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './fdv-perf-product-tree.component.html',
  styleUrl: './fdv-perf-product-tree.component.scss',
})
export class FdvPerfProductTreeComponent {
  state = inject(FdvPerfStateService);
  formatter = inject(FdvPerfFormatterService);
  calc = inject(FdvPerfCalculationService);

  // Outputs
  sfCollapseToggle = output<string>();
  overviewFamilleToggle = output<string>();
  productSelect = output<DrilldownProduit>();

  readonly skeletonRows = Array(5).fill(0);
  readonly CHART_COLORS = CHART_COLORS;

  // Getters for template
  get loading() { return this.state.loading(); }
  get data() { return this.state.data(); }
  get selectedFamille() { return this.state.selectedFamille(); }
  get selectedFdv() { return this.state.selectedFdv(); }
  get selectedProduct() { return this.state.selectedProduct(); }
  get collapsedSfs() { return this.state.collapsedSfs(); }
  get collapsedOverviewFamilles() { return this.state.collapsedOverviewFamilles(); }
  get overviewFamilles() { return this.state.overviewFamilles(); }
  get barsReady() { return this.state.barsReady(); }
  get selectedFdvName() { return this.state.selectedFdvName(); }

  onToggleSf(nom: string) {
    this.sfCollapseToggle.emit(nom);
  }

  onToggleOverviewFamille(nom: string) {
    this.overviewFamilleToggle.emit(nom);
  }

  onSelectProduct(p: DrilldownProduit) {
    this.productSelect.emit(p);
  }

  // Formatters
  formatNum(n: number | undefined | null): string {
    return this.formatter.formatNum(n);
  }

  capitalize(s: string): string {
    return this.formatter.capitalize(s);
  }

  // Calculations
  displayVal(total: number): string {
    return this.calc.displayVal(total);
  }

  displayObjVal(objTonne?: number | null, objPacks?: number | null): string {
    return this.calc.displayObjVal(objTonne, objPacks);
  }

  sfObjPct(sf: { total: number; objectif_tonne: number | null; objectif_packs: number | null }): number {
    return calculatePercentage(sf.total, sf.objectif_tonne ?? sf.objectif_packs);
  }

  prodObjPct(p: { total: number; objectif_tonne: number | null; objectif_packs: number | null }): number {
    return calculatePercentage(p.total, p.objectif_tonne ?? p.objectif_packs);
  }

  prodPct(p: DrilldownProduit, sf: DrilldownSousFamille): number {
    const max = sf.produits.reduce((m, x) => Math.max(m, x.total), 1);
    return (p.total / max) * 100;
  }

  prodColor(i: number): string {
    return CHART_COLORS[i % CHART_COLORS.length];
  }

  familyColor(nom: string): string {
    return getFamilyColor(nom);
  }

  familyBg(nom: string): string {
    return getFamilyBg(nom);
  }
}

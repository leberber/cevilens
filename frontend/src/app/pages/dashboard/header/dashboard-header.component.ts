import { Component, inject, HostListener, output, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { DashboardStateService } from '../services/dashboard-state.service';
import { DashboardFormatterService } from '../services/dashboard-formatter.service';
import { DashboardCalculationService } from '../services/dashboard-calculation.service';
import { DashboardFdvRankingService } from '../services/dashboard-fdv-ranking.service';

interface PrevendeurItem {
  code: string;
  nom: string;
  total: number;
}

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [NgClass],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
})
export class DashboardHeaderComponent {
  state = inject(DashboardStateService);
  formatter = inject(DashboardFormatterService);
  calc = inject(DashboardCalculationService);
  fdvRanking = inject(DashboardFdvRankingService);

  // Inputs
  @Input() distributeurs: string[] = [];
  @Input() userDistributorName: string | null = null;

  // Outputs
  prevPeriod = output<void>();
  nextPeriod = output<void>();
  canalChange = output<'VD' | 'VH'>();
  displayModeChange = output<'packs' | 'tonnes'>();
  fdvSelect = output<string | null>();
  distributeurSelect = output<string>();
  distributeurClear = output<void>();
  distMenuToggle = output<void>();
  drillToRoot = output<void>();
  pillTooltipToggle = output<{ event: MouseEvent; code: string }>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const distributeurLabel = document.querySelector('.db-distributeur-label');
    if (distributeurLabel && !distributeurLabel.contains(target)) {
      this.state.setDistributorMenu(false);
    }
  }

  onPrevPeriod() {
    this.prevPeriod.emit();
  }

  onNextPeriod() {
    this.nextPeriod.emit();
  }

  onCanalChange(canal: 'VD' | 'VH') {
    this.canalChange.emit(canal);
  }

  onDisplayModeChange(mode: 'packs' | 'tonnes') {
    this.displayModeChange.emit(mode);
  }

  onFdvSelect(code: string | null) {
    this.fdvSelect.emit(code);
  }

  onDistributeurSelect(d: string) {
    this.distributeurSelect.emit(d);
  }

  onDistributeurClear() {
    this.distributeurClear.emit();
  }

  onDistMenuToggle() {
    this.distMenuToggle.emit();
  }

  onDrillToRoot() {
    this.drillToRoot.emit();
  }

  onPillTooltip(event: MouseEvent, code: string) {
    this.pillTooltipToggle.emit({ event, code });
  }

  // Getters for template
  get data() { return this.state.data(); }
  get selectedFamille() { return this.state.selectedFamille(); }
  get selectedCanal() { return this.state.selectedCanal(); }
  get displayMode() { return this.state.displayMode(); }
  get selectedFdv() { return this.state.selectedFdv(); }
  get selectedDistributeur() { return this.state.selectedDistributeur(); }
  get showDistMenu() { return this.state.showDistMenu(); }
  get isPlatformAdmin() { return this.state.isPlatformAdmin(); }
  get canGoPrev() { return this.state.canGoPrev(); }
  get canGoNext() { return this.state.canGoNext(); }
  get selectedPeriode() { return this.state.selectedPeriode(); }
  get unitLabel() { return this.state.unitLabel(); }
  get globalObjectif() { return this.state.globalObjectif(); }
  get globalObjectifTonne() { return this.state.globalObjectifTonne(); }
  get globalCa() { return this.state.globalCa(); }
  get totalDisplay() { return this.state.totalDisplay(); }
  get totalObjDisplay() { return this.state.totalObjDisplay(); }
  get totalObjPct() { return this.state.totalObjPct(); }
  get totalObjClass() { return this.state.totalObjClass(); }

  fdvRank(code: string): number {
    return this.fdvRanking.fdvRank(code, this.state.fdvPerfSorted());
  }

  isSelf(code: string): boolean {
    return code === this.selectedFdv;
  }

  getMedalEmoji(rank: number): string {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return '';
  }

  pvObjClass(pv: PrevendeurItem): string {
    const pct = this.pvSimplePct(pv);
    return this.calc.pvObjClass(pct);
  }

  pvSimplePct(pv: PrevendeurItem): number {
    const obj = this.data?.objectif_packs_per_route ?? 0;
    if (!obj) return 0;
    return Math.round((pv.total / obj) * 100);
  }

  formatNum(n: number | null | undefined): string {
    return this.formatter.formatNum(n);
  }

  formatCa(n: number | null | undefined): string {
    return this.formatter.formatCa(n);
  }

  capitalize(s: string): string {
    return this.formatter.capitalize(s);
  }

  routeCode(code: string): string {
    return this.formatter.routeCode(code);
  }

  formatPeriod(periode: string): string {
    return this.formatter.formatPeriod(periode);
  }

  displayVal(total: number, objPacks: number | null | undefined, objTonne: number | null | undefined): string {
    return this.calc.displayVal(total, objPacks, objTonne, this.displayMode);
  }
}

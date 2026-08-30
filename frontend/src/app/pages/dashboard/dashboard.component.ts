import { Component, OnInit, OnDestroy, inject, HostListener, ChangeDetectionStrategy, effect, untracked } from '@angular/core';
import { DashboardHeaderComponent } from './header/dashboard-header.component';
import { DashboardOverviewComponent } from './overview/dashboard-overview.component';
import { DashboardProductTreeComponent } from './product-tree/dashboard-product-tree.component';
import { DashboardFdvPerformanceComponent } from './fdv-performance/dashboard-fdv-performance.component';
import { DashboardPinnedSummaryComponent } from './pinned-summary/dashboard-pinned-summary.component';
import { DashboardStateService } from './services/dashboard-state.service';
import { DashboardAnimationService } from './services/dashboard-animation.service';
import { DashboardFdvRankingService } from './services/dashboard-fdv-ranking.service';
import { PrevendeurService, DrilldownData, DrilldownFamille } from '../../core/services/prevendeur.service';
import { RoleService } from '../../core/services/role.service';
import { DistributorContextService } from '../../core/services/distributor-context.service';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    DashboardOverviewComponent,
    DashboardProductTreeComponent,
    DashboardFdvPerformanceComponent,
    DashboardPinnedSummaryComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly prevendeurSvc = inject(PrevendeurService);
  private readonly roleService   = inject(RoleService);
  private readonly animationSvc  = inject(DashboardAnimationService);
  private readonly fdvRankingSvc = inject(DashboardFdvRankingService);
  private readonly distContext   = inject(DistributorContextService);

  readonly state = inject(DashboardStateService);

  private animCancelFn: (() => void) | null = null;

  constructor() {
    effect(() => {
      this.distContext.selectedDistributorId();
      if (untracked(() => !!this.state.data())) this.load();
    });
  }

  ngOnInit() {
    this.loadInitial();
  }

  ngOnDestroy() {
    if (this.animCancelFn) this.animCancelFn();
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.state.showDistMenu.set(false);
  }

  private loadInitial() {
    const isPlatformAdmin = this.roleService.isPlatformAdmin();
    this.state.isPlatformAdmin.set(isPlatformAdmin);
    if (isPlatformAdmin && !this.distContext.selectedDistributorId()) return;
    this.state.loading.set(true);

    const now = new Date();
    const guess = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.state.selectedPeriode.set(guess);

    this.prevendeurSvc.getDrilldown(guess, null, 'VD', null).subscribe({
      next: d => {
        if (d.periodes.length && !d.periodes.includes(guess)) {
          this.state.selectedPeriode.set(d.periodes[0]);
          this.load();
        } else {
          this.applyData(d);
        }
      },
      error: () => { this.state.loading.set(false); },
    });
  }

  private applyData(d: DrilldownData) {
    const prev: Record<string, number> = {};
    for (const f of d.familles) prev[f.nom] = this.state.displayValues()[f.nom] ?? 0;
    this.state.displayValues.set(prev);
    this.state.data.set(d);
    this.state.loading.set(false);

    // Animate counters
    if (this.animCancelFn) this.animCancelFn();
    this.animCancelFn = this.animationSvc.animateCounters(
      d.familles,
      prev,
      (values: Record<string, number>) => {
        this.state.displayValues.set(values);
      },
      () => {
        // Animation complete
      }
    );

    // Sort FDV performance
    this.state.fdvPerfSorted.set([...d.prevendeurs].sort((a, b) => b.total - a.total));

    // Sort familles alphabetically
    this.state.overviewFamilles.set([...d.familles]
      .sort((a, b) => a.nom.localeCompare(b.nom))
      .map(f => ({ ...f, sous_familles: [...f.sous_familles].sort((a, b) => a.nom.localeCompare(b.nom)) })));

    // Global totals (fixed at load, not reactive to FDV selection)
    this.state.globalTotal.set(d.prevendeurs.reduce((s, p) => s + p.total, 0));
    this.state.globalObjectif.set(d.global_objectif_packs ?? d.familles.reduce((s, f) => s + (f.objectif_packs ?? 0), 0));
    this.state.globalObjectifTonne.set(d.global_objectif_tonne ?? d.familles.reduce((s, f) => s + (f.objectif_tonne ?? 0), 0));
    this.state.globalCa.set(d.global_ca ?? 0);

    // Initialize overview collapse on FDV selection
    if (this.state.selectedFdv()) {
      const sorted = [...d.familles].sort((a, b) => a.nom.localeCompare(b.nom));
      this.state.collapsedOverviewFamilles.set(new Set(sorted.slice(1).map(f => f.nom)));
      this.state.resetCollapse();
    }
  }

  private load(keepSelection = false) {
    const prevFamille = keepSelection ? this.state.selectedFamille()?.nom ?? null : null;
    if (!keepSelection) this.state.selectedFamille.set(null);
    this.state.selectedProduct.set(null);

    this.prevendeurSvc.getDrilldown(
      this.state.selectedPeriode(),
      this.state.selectedFdv(),
      this.state.selectedCanal(),
      this.state.selectedDistributeur()
    ).subscribe({
      next: d => {
        this.applyData(d);
        if (prevFamille) {
          const fam = d.familles.find(f => f.nom === prevFamille) ?? null;
          this.state.selectedFamille.set(fam);
          if (fam) this.state.barsReady.set(true);
        }
      },
      error: () => { this.state.loading.set(false); },
    });
  }

  // Wire header outputs
  onPrevPeriod() {
    if (!this.state.data()) return;
    const i = this.state.data()!.periodes.indexOf(this.state.selectedPeriode());
    if (i < this.state.data()!.periodes.length - 1) {
      this.state.selectedPeriode.set(this.state.data()!.periodes[i + 1]);
      this.load();
    }
  }

  onNextPeriod() {
    if (!this.state.data()) return;
    const i = this.state.data()!.periodes.indexOf(this.state.selectedPeriode());
    if (i > 0) {
      this.state.selectedPeriode.set(this.state.data()!.periodes[i - 1]);
      this.load();
    }
  }

  onCanalChange(canal: 'VD' | 'VH') {
    if (this.state.selectedCanal() === canal) return;
    this.state.selectedCanal.set(canal);
    this.state.selectedFdv.set(null);
    this.load(true);
  }

  onDisplayModeChange(mode: 'packs' | 'tonnes') {
    this.state.displayMode.set(mode);
  }

  onFdvSelect(code: string | null) {
    this.state.selectedFdv.set(this.state.selectedFdv() === code ? null : code);
    this.state.compactCards.set(false);
    this.load(true);
  }

  onDistributeurSelect(d: string) {
    if (this.state.selectedDistributeur() === d) return;
    this.state.selectedDistributeur.set(d);
    this.state.selectedFdv.set(null);
    this.load(true);
  }

  onDistributeurClear() {
    this.state.selectedDistributeur.set(null);
    this.state.selectedFdv.set(null);
    this.load(true);
  }

  onDistMenuToggle() {
    this.state.showDistMenu.set(!this.state.showDistMenu());
  }

  onDrillToRoot() {
    this.state.drillToRoot();
  }

  // Wire overview outputs
  onFamilleSelect(f: DrilldownFamille) {
    this.state.selectedFamille.set(this.state.selectedFamille()?.nom === f.nom ? null : f);
    this.state.compactCards.set(!!this.state.selectedFamille());
    this.state.selectedProduct.set(null);
    this.state.resetCollapse();
    if (this.state.selectedFamille()) this.state.barsReady.set(true);
  }

  onPinToggle({ nom }: { nom: string; event: MouseEvent }) {
    this.state.togglePin(nom);
  }

  // Wire tree outputs
  onSfCollapseToggle(nom: string) {
    this.state.toggleSfCollapse(nom);
  }

  onOverviewFamilleToggle(nom: string) {
    this.state.toggleOverviewFamille(nom);
  }

  onProductSelect(p: any) {
    this.state.selectedProduct.set(this.state.selectedProduct() === p ? null : p);
  }

  // Wire FDV outputs
  onFdvSelectFromPerf(code: string) {
    this.onFdvSelect(code);
  }

  // Wire pinned outputs
  onPinToggleFromPinned({ nom }: { nom: string; event: MouseEvent }) {
    this.state.togglePin(nom);
  }

  onPinnedClear() {
    this.state.clearPinned();
  }

  onPillTooltipToggle({ event, code }: { event: MouseEvent; code: string }) {
    event.stopPropagation();
    if (this.state.hoveredFdv() === code) {
      this.state.setHoveredFdv(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const maxH = window.innerHeight * 0.72;
    const top = rect.bottom + 8 + maxH > window.innerHeight
      ? Math.max(rect.top - maxH - 8, 8)
      : rect.bottom + 8;

    const rates = this.fdvRankingSvc.buildFdvRates(code, this.state.data());
    this.state.setHoveredFdv(code, rates);
    this.state.setTooltipTop(top);
  }


}

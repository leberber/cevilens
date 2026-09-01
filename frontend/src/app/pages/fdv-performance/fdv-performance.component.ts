import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, effect, untracked } from '@angular/core';
import { NgClass } from '@angular/common';
import { FdvPerfHeaderComponent } from './header/fdv-perf-header.component';
import { FdvPerfOverviewComponent } from './overview/fdv-perf-overview.component';
import { FdvPerfProductTreeComponent } from './product-tree/fdv-perf-product-tree.component';
import { FdvPerfFdvListComponent } from './fdv-performance/fdv-perf-fdv-list.component';
import { FdvPerfStateService } from './services/fdv-perf-state.service';
import { FdvPerfAnimationService } from './services/fdv-perf-animation.service';
import { FdvPerfFormatterService } from './services/fdv-perf-formatter.service';
import { FdvPerfCalculationService } from './services/fdv-perf-calculation.service';
import { FdvPerfRankingService } from './services/fdv-perf-ranking.service';
import { PrevendeurService, DrilldownData, DrilldownFamille } from '../../core/services/prevendeur.service';
import { RoleService } from '../../core/services/role.service';
import { DistributorContextService } from '../../core/services/distributor-context.service';


@Component({
  selector: 'app-fdv-performance',
  standalone: true,
  imports: [
    NgClass,
    FdvPerfHeaderComponent,
    FdvPerfOverviewComponent,
    FdvPerfProductTreeComponent,
    FdvPerfFdvListComponent,
  ],
  templateUrl: './fdv-performance.component.html',
  styleUrl: './fdv-performance.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FdvPerformanceComponent implements OnInit, OnDestroy {
  private readonly prevendeurSvc = inject(PrevendeurService);
  private readonly roleService   = inject(RoleService);
  private readonly animationSvc  = inject(FdvPerfAnimationService);
  private readonly fdvRankingSvc = inject(FdvPerfRankingService);
  private readonly distContext   = inject(DistributorContextService);
  readonly formatter = inject(FdvPerfFormatterService);
  readonly calc = inject(FdvPerfCalculationService);

  readonly state = inject(FdvPerfStateService);

  private animCancelFn: (() => void) | null = null;

  private initialLoaded = false;

  constructor() {
    effect(() => {
      this.distContext.selectedDistributorId();
      untracked(() => {
        if (this.initialLoaded) {
          this.load();
        } else {
          this.loadInitial();
        }
      });
    });
  }

  ngOnInit() {
    if (!this.initialLoaded) this.loadInitial();
  }

  ngOnDestroy() {
    if (this.animCancelFn) this.animCancelFn();
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
        this.initialLoaded = true;
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

    // Global totals (already in tonnes from backend)
    this.state.globalTotal.set(d.familles.reduce((s, f) => s + f.total, 0));
    this.state.globalObjectif.set(d.global_objectif_packs ?? 0);
    this.state.globalObjectifTonne.set(d.global_objectif_tonne ?? 0);
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
      null
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

  onFdvSelect(code: string | null) {
    this.state.selectedFdv.set(this.state.selectedFdv() === code ? null : code);
    this.state.compactCards.set(false);
    this.load(true);
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

  // Sidebar pill helpers
  fdvRank(code: string): number {
    return this.fdvRankingSvc.fdvRank(code, this.state.fdvPerfSorted());
  }

  pvSimplePct(pv: { total: number }): number {
    const obj = this.state.data()?.objectif_tonne_per_route ?? this.state.data()?.objectif_packs_per_route ?? 0;
    if (!obj) return 0;
    return Math.round((pv.total / obj) * 100);
  }

  pvObjClass(pv: { total: number }): string {
    return this.calc.pvObjClass(this.pvSimplePct(pv));
  }
}

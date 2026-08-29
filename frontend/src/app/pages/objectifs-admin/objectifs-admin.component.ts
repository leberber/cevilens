import { Component, inject, signal, computed, effect, untracked, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { CanalToggleComponent } from '../../shared/components/canal-toggle/canal-toggle.component';
import { PeriodStepperComponent } from '../../shared/period-stepper/period-stepper.component';
import { ObjectifsTableComponent, ObjectifRow, FamGroupe } from './components/objectifs-table.component';
import { ObjectifsUploadDialogComponent } from '../objectifs/components/objectifs-upload-dialog.component';
import { DistributorContextService } from '../../core/services/distributor-context.service';
import { ObjectifsRouteCountService } from './services/objectifs-route-count.service';
import { SortHelper } from '../../core/services/sort.helper';
import { CanalHelper } from '../../core/services/canal.helper';

@Component({
  selector: 'app-objectifs-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageLayoutComponent,
    CanalToggleComponent,
    PeriodStepperComponent,
    ObjectifsTableComponent,
    ObjectifsUploadDialogComponent,
  ],
  templateUrl: './objectifs-admin.component.html',
  styleUrl: './objectifs-admin.component.scss',
})
export class ObjectifsAdminComponent {
  private readonly http              = inject(HttpClient);
  private readonly destroyRef        = inject(DestroyRef);
  private readonly distContext       = inject(DistributorContextService);
  private readonly routeCountService = inject(ObjectifsRouteCountService);
  private readonly sortHelper        = inject(SortHelper);
  private readonly canalHelper       = inject(CanalHelper);

  readonly canal   = signal<'VD' | 'VH'>('VD');
  readonly mois    = signal(new Date().getMonth() + 1);
  readonly annee   = signal(new Date().getFullYear());
  readonly loading = signal(false);
  readonly rows    = signal<ObjectifRow[]>([]);
  readonly sortCol = signal('');
  readonly sortDir = signal<1 | -1>(1);
  readonly collapsedFamilies = signal(new Set<string>());
  readonly showUploadDialog  = signal(false);

  private readonly FLAT_SORT_COLS = new Set(['tonne', 'tonne_route', 'packs', 'packs_route']);
  readonly isFlatSort = computed(() => this.FLAT_SORT_COLS.has(this.sortCol()));
  readonly routeCount = computed(() => this.routeCountService.getRouteCount(this.canal()));

  readonly sortedRows = computed((): ObjectifRow[] => {
    const rows  = this.rows();
    const col   = this.sortCol();
    const dir   = this.sortDir();
    const canal = this.canal();
    const rc    = this.routeCount();
    if (!col) return rows;

    const tonne  = (r: ObjectifRow) => this.canalHelper.selectByCanal(canal, r.objectif_tonne_vd, r.objectif_tonne_vh);
    const packs  = (r: ObjectifRow) => this.canalHelper.selectByCanal(canal, r.objectif_packs_vd, r.objectif_packs_vh);
    const packsT = (r: ObjectifRow) => this.canalHelper.selectByCanal(canal, r.objectif_packs_vd_tournee, r.objectif_packs_vh_tournee);

    const selectors: Record<string, (r: ObjectifRow) => unknown> = {
      famille:      (r) => r.famille,
      code:         (r) => r.code_produit,
      produit:      (r) => r.nom_produit,
      distributeur: (r) => r.nom_distributeur,
      tonne:        (r) => tonne(r),
      tonne_route:  (r) => rc ? (tonne(r) ?? 0) / rc : 0,
      packs:        (r) => packs(r),
      packs_route:  (r) => packsT(r),
      updated_by:   (r) => r.updated_by,
      updated_at:   (r) => r.updated_at,
    };

    const selector = selectors[col];
    if (!selector) return rows;
    return [...rows].sort((a, b) => this.sortHelper.compare(selector(a), selector(b), 'auto', dir));
  });

  readonly grouped = computed((): FamGroupe[] => {
    const famMap = new Map<string, Map<string, ObjectifRow[]>>();
    for (const row of this.sortedRows()) {
      const f  = row.famille      || '(Sans famille)';
      const sf = row.sous_famille || '(Sans sous-famille)';
      if (!famMap.has(f)) famMap.set(f, new Map());
      const sfMap = famMap.get(f)!;
      if (!sfMap.has(sf)) sfMap.set(sf, []);
      sfMap.get(sf)!.push(row);
    }
    return Array.from(famMap.entries()).map(([f, sfMap]) => ({
      nom: f,
      sfs: Array.from(sfMap.entries()).map(([sf, rowList]) => ({ nom: sf, rows: rowList })),
    }));
  });

  readonly filledProducts = computed(() =>
    this.rows().filter(r =>
      (this.canal() === 'VD' ? r.objectif_packs_vd : r.objectif_packs_vh) != null
    ).length
  );
  readonly totalProducts = computed(() => this.rows().length);

  constructor() {
    effect(() => {
      this.distContext.selectedDistributorId(); // track distributor changes from sidebar
      untracked(() => this.load());
    });
  }

  onPeriodChange(e: { mois: number; annee: number }): void {
    this.mois.set(e.mois);
    this.annee.set(e.annee);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    let url = `/api/v1/objectifs?mois=${this.mois()}&annee=${this.annee()}`;
    const distId = this.distContext.selectedDistributorId();
    if (distId) url += `&distributor_id=${distId}`;

    this.http.get<ObjectifRow[]>(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.rows.set(data);
          this.loading.set(false);
          this.routeCountService.loadRouteCounts(this.mois(), this.annee());
        },
        error: () => this.loading.set(false),
      });
  }

  setSort(col: string): void {
    if (this.sortCol() === col) {
      this.sortDir.update(d => d === 1 ? -1 : 1);
    } else {
      this.sortCol.set(col);
      this.sortDir.set(1);
    }
  }

  toggleFamily(nom: string): void {
    this.collapsedFamilies.update(prev => {
      const next = new Set(prev);
      if (next.has(nom)) next.delete(nom);
      else next.add(nom);
      return next;
    });
  }
}

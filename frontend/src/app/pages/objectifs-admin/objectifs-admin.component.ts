import { Component, inject, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VentesService } from '../../core/services/ventes.service';
import { CanalHelper } from '../../core/services/canal.helper';
import { SortHelper } from '../../core/services/sort.helper';
import { AggregateHelper } from '../../core/services/aggregate.helper';
import { ObjectifsBaseComponent, BaseRow, FamGroupe } from '../../core/base/objectifs-base';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { FileUploadHelper } from '../../core/services/file-upload.helper';
import { ObjectifsDirtyTrackerService } from './services/objectifs-dirty-tracker.service';
import { ObjectifsRouteCountService } from './services/objectifs-route-count.service';
import { ObjectifsToolbarComponent } from './components/objectifs-toolbar.component';
import { ObjectifsTableComponent } from './components/objectifs-table.component';
import { ObjectifsImportBannerComponent } from './components/objectifs-import-banner.component';
import { ObjectifsImportDialogComponent } from './components/objectifs-import-dialog.component';
import { CANAL_OPTIONS, CANAL_DISPLAY } from '../../core/constants/canal.constants';

interface ObjectifRow extends BaseRow {
  objectif_tonne_vd:          number | null;
  objectif_packs_vd:          number | null;
  objectif_packs_vd_tournee:  number | null;
  objectif_tonne_vh:          number | null;
  objectif_packs_vh:          number | null;
  objectif_packs_vh_tournee:  number | null;
  nom_distributeur:           string | null;
  _tonne:        number | null;
  _packs:        number | null;
  _packs_tournee: number | null;
}

@Component({
  selector: 'app-objectifs-admin',
  standalone: true,
  imports: [FormsModule, ConfirmDialogComponent, PageLayoutComponent, ObjectifsToolbarComponent, ObjectifsTableComponent, ObjectifsImportBannerComponent, ObjectifsImportDialogComponent],
  templateUrl: './objectifs-admin.component.html',
  styleUrl: './objectifs-admin.component.scss',
})
export class ObjectifsAdminComponent extends ObjectifsBaseComponent<ObjectifRow> {
  private readonly ventesService    = inject(VentesService);
  private readonly canalHelper      = inject(CanalHelper);
  private readonly sortHelper       = inject(SortHelper);
  private readonly aggregateHelper  = inject(AggregateHelper);
  private readonly fileUploadHelper = inject(FileUploadHelper);
  private readonly destroyRef       = inject(DestroyRef);
  readonly dirtyTracker             = inject(ObjectifsDirtyTrackerService);
  readonly routeCountService        = inject(ObjectifsRouteCountService);

  canal: 'VD' | 'VH' = 'VD';
  importCanal: 'VD' | 'VH' = 'VD';
  selectedDistributeur: string | null = null;
  distributeurs: string[] = [];

  protected override get nextMissingUrl(): string {
    return '/api/v1/objectifs/next-missing';
  }

  override ngOnInit() {
    super.ngOnInit();
    this.ventesService.getDistinct('nom_distributeur')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(vals => {
        this.distributeurs = vals;
      });
  }

  // Getters for service properties
  get routesVD(): number { return this.routeCountService.routesVD; }
  set routesVD(val: number) { this.routeCountService.routesVD = val; }

  get routesVH(): number { return this.routeCountService.routesVH; }
  set routesVH(val: number) { this.routeCountService.routesVH = val; }

  get routesFallbackMois(): string | null { return this.routeCountService.routesFallbackMois; }
  set routesFallbackMois(val: string | null) { this.routeCountService.routesFallbackMois = val; }

  protected override onFileSelectedHook(): void {
    this.importCanal = this.canal;
  }

  // ── Load ─────────────────────────────────────────────────────────────────────
  load(): void {
    if (this.editMode) return;
    this.loading = true;
    let url = `/api/v1/objectifs?mois=${this.mois}&annee=${this.annee}`;
    if (this.selectedDistributeur) {
      url += `&code_distributeur=${encodeURIComponent(this.selectedDistributeur)}`;
    }
    this.http.get<any[]>(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.rows     = data.map(d => ({ ...d, _tonne: null, _packs: null, _packs_tournee: null }));
          this.hasGoals = data.some(d =>
            d.objectif_tonne_vd != null || d.objectif_packs_vd != null ||
            d.objectif_tonne_vh != null || d.objectif_packs_vh != null
          );
          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
    this.routeCountService.loadRouteCounts(this.mois, this.annee);
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────────
  enterEditMode(): void {
    this.loading = true;
    let url = `/api/v1/objectifs?mois=${this.mois}&annee=${this.annee}&edit=true`;
    if (this.selectedDistributeur) {
      url += `&code_distributeur=${encodeURIComponent(this.selectedDistributeur)}`;
    }
    this.http.get<any[]>(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.rows = data.map(d => ({ ...d, _tonne: null, _packs: null, _packs_tournee: null }));
          for (const r of this.rows) {
            const tonne        = this.canalHelper.selectByCanal(this.canal, r.objectif_tonne_vd, r.objectif_tonne_vh);
            const packs        = this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd, r.objectif_packs_vh);
            const packs_tournee = this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd_tournee, r.objectif_packs_vh_tournee);
            r._tonne = tonne; r._packs = packs; r._packs_tournee = packs_tournee;
          }
          this.dirtyTracker.captureSnapshot(this.rows);
          this.loading  = false;
          this.editMode = true;
        },
        error: () => { this.loading = false; },
      });
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  confirmSave(): void {
    this.showConfirm = false;
    this.isSaving    = true;
    const body = this.rows.map(r => ({
      code_produit:              r.code_produit,
      objectif_tonne_vd:         this.canal === 'VD' ? r._tonne         : r.objectif_tonne_vd,
      objectif_packs_vd:         this.canal === 'VD' ? r._packs         : r.objectif_packs_vd,
      objectif_packs_vd_tournee: this.canal === 'VD' ? r._packs_tournee : r.objectif_packs_vd_tournee,
      objectif_tonne_vh:         this.canal === 'VH' ? r._tonne         : r.objectif_tonne_vh,
      objectif_packs_vh:         this.canal === 'VH' ? r._packs         : r.objectif_packs_vh,
      objectif_packs_vh_tournee: this.canal === 'VH' ? r._packs_tournee : r.objectif_packs_vh_tournee,
    }));
    this.http.post(`/api/v1/objectifs/batch?mois=${this.mois}&annee=${this.annee}`, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.editMode = false;
          this.load();
          this.loadNextMissing();
        },
        error: () => { this.isSaving = false; },
      });
  }

  // ── Excel import ──────────────────────────────────────────────────────────────
  confirmImport(): void {
    if (!this.importFile) return;
    this.isImporting = true;
    const fd = this.fileUploadHelper.createFormData(this.importFile);

    type ImportRow = { code_produit: string | null; nom_produit?: string; tonne: number | null; packs: number | null; packs_tournee: number | null };

    const applyImport = (data: ImportRow[]) => {
      if (this.importCanal !== this.canal) {
        this.canal = this.importCanal;
        for (const r of this.rows) {
          r._tonne         = this.canalHelper.selectByCanal(this.canal, r.objectif_tonne_vd, r.objectif_tonne_vh);
          r._packs         = this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd, r.objectif_packs_vh);
          r._packs_tournee = this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd_tournee, r.objectif_packs_vh_tournee);
        }
      }
      let imported = 0;
      const notFound: string[] = [];
      for (const item of data) {
        const row = item.code_produit
          ? this.rows.find(r => r.code_produit === item.code_produit)
          : this.rows.find(r => r.nom_produit.trim().toLowerCase() === (item.nom_produit ?? '').trim().toLowerCase());
        if (row) {
          row._tonne         = item.tonne ?? null;
          row._packs         = item.packs != null ? Math.round(item.packs) : null;
          row._packs_tournee = item.packs_tournee != null
            ? Math.round(item.packs_tournee)
            : (item.packs != null && this.routeCount > 0 ? Math.round(item.packs / this.routeCount) : null);
          imported++;
        } else {
          notFound.push(item.code_produit ?? item.nom_produit ?? '?');
        }
      }
      this.showImportDialog   = false;
      this.isImporting        = false;
      this.importFile         = null;
      this.importResult       = { imported, notFound };
      this.showNotFoundDetail = false;
    };

    const monthChanged = this.importMois !== this.mois || this.importAnnee !== this.annee;

    this.http.post<ImportRow[]>('/api/v1/objectifs/parse-excel', fd)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          if (monthChanged) {
            this.mois  = this.importMois;
            this.annee = this.importAnnee;
            this.http.get<any[]>(`/api/v1/objectifs?mois=${this.mois}&annee=${this.annee}&edit=true`)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: rows => {
                  this.rows = rows.map(d => ({ ...d, _packs: null, _packs_tournee: null }));
                  for (const r of this.rows) {
                    const t  = this.canalHelper.selectByCanal(this.importCanal, r.objectif_tonne_vd, r.objectif_tonne_vh);
                    const p  = this.canalHelper.selectByCanal(this.importCanal, r.objectif_packs_vd, r.objectif_packs_vh);
                    const pt = this.canalHelper.selectByCanal(this.importCanal, r.objectif_packs_vd_tournee, r.objectif_packs_vh_tournee);
                    r._tonne = t; r._packs = p; r._packs_tournee = pt;
                  }
                  this.dirtyTracker.captureSnapshot(this.rows);
                  applyImport(data);
                },
                error: () => { this.isImporting = false; },
              });
          } else {
            applyImport(data);
          }
        },
        error: () => { this.isImporting = false; },
      });
  }

  // ── Copy from previous ────────────────────────────────────────────────────────
  copyFromPrevious(): void {
    let pm = this.mois - 1, pa = this.annee;
    if (pm === 0) { pm = 12; pa--; }
    this.http.get<any[]>(`/api/v1/objectifs?mois=${pm}&annee=${pa}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          const map = new Map(data.map((d: any) => [d.code_produit, d]));
          for (const r of this.rows) {
            const prev = map.get(r.code_produit) as any;
            if (prev) {
              r._tonne         = this.canalHelper.selectByCanal(this.canal, prev.objectif_tonne_vd, prev.objectif_tonne_vh);
              r._packs         = this.canalHelper.selectByCanal(this.canal, prev.objectif_packs_vd, prev.objectif_packs_vh);
              r._packs_tournee = this.canalHelper.selectByCanal(this.canal, prev.objectif_packs_vd_tournee, prev.objectif_packs_vh_tournee);
            }
          }
        },
      });
  }

  // ── Dirty tracking ────────────────────────────────────────────────────────────
  isDirtyRow(r: ObjectifRow): boolean {
    return this.dirtyTracker.isDirtyRow(r);
  }

  get dirtyCount(): number {
    return this.dirtyTracker.getDirtyCount(this.rows);
  }

  // ── Sorting ───────────────────────────────────────────────────────────────────
  readonly FLAT_SORT_COLS = new Set(['tonne', 'tonne_route', 'packs', 'packs_route']);

  get isFlatSort(): boolean { return this.FLAT_SORT_COLS.has(this.sortCol); }

  resetSort(): void { this.sortCol = ''; this.sortDir = 1; }

  get sortedRows(): ObjectifRow[] {
    if (!this.sortCol) return this.rows;
    const tonne  = (r: ObjectifRow) => this.editMode ? r._tonne  : this.canalHelper.selectByCanal(this.canal, r.objectif_tonne_vd, r.objectif_tonne_vh);
    const packs  = (r: ObjectifRow) => this.editMode ? r._packs  : this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd, r.objectif_packs_vh);
    const packsT = (r: ObjectifRow) => this.editMode ? r._packs_tournee : this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd_tournee, r.objectif_packs_vh_tournee);

    const selectors: Record<string, (r: ObjectifRow) => any> = {
      famille: (r) => r.famille,
      code: (r) => r.code_produit,
      produit: (r) => r.nom_produit,
      tonne: (r) => tonne(r),
      tonne_route: (r) => this.routeCount ? (tonne(r) ?? 0) / this.routeCount : 0,
      packs: (r) => packs(r),
      packs_route: (r) => packsT(r),
      updated_by: (r) => r.updated_by,
      updated_at: (r) => r.updated_at,
    };

    const selector = selectors[this.sortCol];
    if (!selector) return this.rows;

    return [...this.rows].sort((a, b) =>
      this.sortHelper.compare(selector(a), selector(b), 'auto', this.sortDir)
    );
  }

  // ── Per-route helpers ─────────────────────────────────────────────────────────
  get routeCount(): number { return this.canal === 'VD' ? this.routesVD : this.routesVH; }

  perRouteTonne(val: number | null): string {
    if (val == null || this.routeCount === 0) return '—';
    return (val / this.routeCount).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }

  perRoute(val: number | null): string {
    if (val == null) return '—';
    return val.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }

  // ── Aggregates ────────────────────────────────────────────────────────────────
  private rowTonne(r: ObjectifRow): number | null {
    return this.editMode ? r._tonne : this.canalHelper.selectByCanal(this.canal, r.objectif_tonne_vd, r.objectif_tonne_vh);
  }

  private rowPacks(r: ObjectifRow): number | null {
    return this.editMode ? r._packs : this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd, r.objectif_packs_vh);
  }

  private rowPacksTournee(r: ObjectifRow): number | null {
    return this.editMode ? r._packs_tournee : this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd_tournee, r.objectif_packs_vh_tournee);
  }

  sumTonne(rows: ObjectifRow[]): number | null {
    return this.aggregateHelper.sum(rows, r => this.rowTonne(r));
  }

  sumPacks(rows: ObjectifRow[]): number | null {
    return this.aggregateHelper.sum(rows, r => this.rowPacks(r));
  }

  sumPacksTournee(rows: ObjectifRow[]): number | null {
    return this.aggregateHelper.sum(rows, r => this.rowPacksTournee(r));
  }

  get filledProducts(): number {
    return this.rows.filter(r =>
      (this.canal === 'VD' ? r.objectif_packs_vd : r.objectif_packs_vh) != null
    ).length;
  }

  get totalProducts(): number { return this.rows.length; }

  readonly canalOptions = CANAL_OPTIONS;

  get canalLabel(): string { return CANAL_DISPLAY(this.canal); }

}

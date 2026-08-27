import { Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { VentesService } from '../../core/services/ventes.service';
import { CanalHelper } from '../../core/services/canal.helper';
import { SortHelper } from '../../core/services/sort.helper';
import { AggregateHelper } from '../../core/services/aggregate.helper';
import { ObjectifsBaseComponent, BaseRow, FamGroupe } from '../../core/base/objectifs-base';
import { PeriodStepperComponent } from '../../shared/period-stepper/period-stepper.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ImportDialogComponent } from '../../shared/components/import-dialog/import-dialog.component';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';

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
  imports: [CommonModule, FormsModule, Select, PeriodStepperComponent, ConfirmDialogComponent, ImportDialogComponent, PageLayoutComponent],
  templateUrl: './objectifs-admin.component.html',
  styleUrl: './objectifs-admin.component.scss',
})
export class ObjectifsAdminComponent extends ObjectifsBaseComponent<ObjectifRow> {
  private ventesService = inject(VentesService);
  private canalHelper = inject(CanalHelper);
  private sortHelper = inject(SortHelper);
  private aggregateHelper = inject(AggregateHelper);

  canal: 'VD' | 'VH' = 'VD';
  importCanal: 'VD' | 'VH' = 'VD';
  selectedDistributeur: string | null = null;
  distributeurs: string[] = [];
  routesVD = 0;
  routesVH = 0;
  routesFallbackMois: string | null = null;

  // Template references for PageLayout
  @ViewChild('toolbarContent') toolbarContent!: TemplateRef<any>;

  private snapshot = new Map<string, { tonne: number | null; packs: number | null; packs_tournee: number | null }>();

  protected override get nextMissingUrl(): string {
    return '/api/v1/objectifs/next-missing';
  }

  override ngOnInit() {
    super.ngOnInit();
    this.ventesService.getDistinct('nom_distributeur').subscribe(vals => {
      this.distributeurs = vals;
    });
  }

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
    this.http.get<any[]>(url).subscribe({
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
    this.http.get<{ vd: number; vh: number; fallback_mois: string | null }>(
      `/api/v1/objectifs/routes-count?mois=${this.mois}&annee=${this.annee}`
    ).subscribe({
      next: d => { this.routesVD = d.vd; this.routesVH = d.vh; this.routesFallbackMois = d.fallback_mois; },
      error: () => { this.routesVD = 0; this.routesVH = 0; this.routesFallbackMois = null; },
    });
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────────
  enterEditMode(): void {
    this.loading = true;
    let url = `/api/v1/objectifs?mois=${this.mois}&annee=${this.annee}&edit=true`;
    if (this.selectedDistributeur) {
      url += `&code_distributeur=${encodeURIComponent(this.selectedDistributeur)}`;
    }
    this.http.get<any[]>(url).subscribe({
      next: data => {
        this.rows = data.map(d => ({ ...d, _tonne: null, _packs: null, _packs_tournee: null }));
        this.snapshot.clear();
        for (const r of this.rows) {
          const tonne        = this.canalHelper.selectByCanal(this.canal, r.objectif_tonne_vd, r.objectif_tonne_vh);
          const packs        = this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd, r.objectif_packs_vh);
          const packs_tournee = this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd_tournee, r.objectif_packs_vh_tournee);
          this.snapshot.set(r.code_produit, { tonne, packs, packs_tournee });
          r._tonne = tonne; r._packs = packs; r._packs_tournee = packs_tournee;
        }
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
    this.http.post(`/api/v1/objectifs/batch?mois=${this.mois}&annee=${this.annee}`, body).subscribe({
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
    const fd = new FormData();
    fd.append('file', this.importFile);

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

    this.http.post<ImportRow[]>('/api/v1/objectifs/parse-excel', fd).subscribe({
      next: data => {
        if (monthChanged) {
          this.mois  = this.importMois;
          this.annee = this.importAnnee;
          this.http.get<any[]>(`/api/v1/objectifs?mois=${this.mois}&annee=${this.annee}&edit=true`).subscribe({
            next: rows => {
              this.rows = rows.map(d => ({ ...d, _packs: null, _packs_tournee: null }));
              this.snapshot.clear();
              for (const r of this.rows) {
                const t  = this.canalHelper.selectByCanal(this.importCanal, r.objectif_tonne_vd, r.objectif_tonne_vh);
                const p  = this.canalHelper.selectByCanal(this.importCanal, r.objectif_packs_vd, r.objectif_packs_vh);
                const pt = this.canalHelper.selectByCanal(this.importCanal, r.objectif_packs_vd_tournee, r.objectif_packs_vh_tournee);
                this.snapshot.set(r.code_produit, { tonne: t, packs: p, packs_tournee: pt });
                r._tonne = t; r._packs = p; r._packs_tournee = pt;
              }
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
    this.http.get<any[]>(`/api/v1/objectifs?mois=${pm}&annee=${pa}`).subscribe({
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
    const snap = this.snapshot.get(r.code_produit);
    return r._tonne !== (snap?.tonne ?? null) ||
           r._packs !== (snap?.packs ?? null) ||
           r._packs_tournee !== (snap?.packs_tournee ?? null);
  }

  get dirtyCount(): number {
    return this.rows.filter(r => this.isDirtyRow(r)).length;
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

  get canalLabel(): string { return this.canal === 'VD' ? 'Direct (VD)' : 'Horeca (VH)'; }

  // ── Template helpers (for cleaner HTML) ───────────────────────────────────
  getRowTonne(row: ObjectifRow): number | null {
    return this.rowTonne(row);
  }

  getRowPacks(row: ObjectifRow): number | null {
    return this.rowPacks(row);
  }

  getRowPacksTournee(row: ObjectifRow): number | null {
    return this.rowPacksTournee(row);
  }

  getFilledCount(): number {
    return this.rows.filter(r =>
      this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd, r.objectif_packs_vh) != null
    ).length;
  }
}

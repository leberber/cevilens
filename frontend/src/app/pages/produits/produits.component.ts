import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { Popover } from 'primeng/popover';
import { ProduitsService, ProduitRead } from '../../core/services/produits.service';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { FamilleColorService } from '../../core/services/famille-color.service';

const LS_KEY = 'cevital_produits_columns';

type EditField = 'nom_produit' | 'code_dd' | 'famille' | 'sous_famille' | 'uom_vente' | 'uom_principale' | 'colisage' | 'colisage_palette' | 'unite' | 'volume' | 'poids_unite_vente' | 'prix_dd' | 'prix_promotion' | 'prix_club';

interface ColDef {
  field: string;
  header: string;
  visible: boolean;
}

@Component({
  selector: 'app-produits',
  standalone: true,
  imports: [FormsModule, TooltipModule, Popover, PageLayoutComponent],
  templateUrl: './produits.component.html',
  styleUrl:    './produits.component.scss',
})
export class ProduitsComponent implements OnInit {
  private readonly svc          = inject(ProduitsService);
  readonly familleColor         = inject(FamilleColorService);

  readonly allColumns: ColDef[] = [
    { field: 'code_produit',        header: 'Code',              visible: true  },
    { field: 'description_produit', header: 'Désignation',       visible: true  },
    { field: 'nom_produit',         header: 'Désignation courte',visible: true  },
    { field: 'code_dd',             header: 'Code Objectif',      visible: false },
    { field: 'famille',             header: 'Famille',           visible: true  },
    { field: 'sous_famille',        header: 'Sous-famille',      visible: true  },
    { field: 'uom_vente',           header: 'UOM Vente',         visible: true  },
    { field: 'uom_principale',      header: 'UOM P.',            visible: true  },
    { field: 'colisage',            header: 'Colisage',          visible: true  },
    { field: 'colisage_palette',    header: 'Col./palette',      visible: true  },
    { field: 'unite',               header: 'Unité',             visible: true  },
    { field: 'volume',              header: 'Volume',            visible: false },
    { field: 'poids_unite_vente',   header: 'Poids UV (T)',      visible: false },
    { field: 'prix_dd',             header: 'Prix DD',           visible: true  },
    { field: 'prix_promotion',      header: 'Prix Promo',        visible: false },
    { field: 'prix_club',           header: 'Prix Club',         visible: false },
    { field: 'facturable',          header: 'Facturable',        visible: true  },
    { field: 'imported',            header: 'Importé',           visible: true  },
  ];

  isColVisible(field: string): boolean {
    return this.allColumns.find(c => c.field === field)?.visible ?? true;
  }

  toggleColumn(field: string): void {
    const col = this.allColumns.find(c => c.field === field);
    if (col) col.visible = !col.visible;
    this.saveColumnState();
  }

  private saveColumnState(): void {
    const state: Record<string, boolean> = {};
    this.allColumns.forEach(c => (state[c.field] = c.visible));
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  private loadColumnState(): void {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (!saved) return;
      const state: Record<string, boolean> = JSON.parse(saved);
      this.allColumns.forEach(c => { if (c.field in state) c.visible = state[c.field]; });
    } catch { /* ignore */ }
  }

  readonly allProduits  = signal<ProduitRead[]>([]);
  readonly familles     = signal<string[]>([]);
  readonly loading      = signal(false);
  readonly syncing      = signal(false);
  showSyncConfirm = false;
  syncPreviewLoading = false;
  syncPreviewItems: { code_produit: string; description_produit: string | null; famille: string | null }[] = [];

  readonly searchText     = signal('');
  readonly familleFilter  = signal<string | null>(null);
  readonly sortCol        = signal('description_produit');
  readonly sortDir        = signal<1 | -1>(1);

  readonly editingCell  = signal<{ code: string; field: EditField } | null>(null);
  readonly editingValue = signal<any>(null);
  readonly savingCell   = signal<{ code: string; field: EditField } | null>(null);
  readonly familleEditProd = signal<ProduitRead | null>(null);
  @ViewChild('familleOv') familleOv!: Popover;
  @ViewChild('colFilterPop') colFilterPop!: Popover;

  readonly activeColFilters = signal<Record<string, string>>({});
  readonly colFilterField   = signal<string | null>(null);
  readonly colFilterTerm    = signal('');

  readonly colFilterOptions = computed(() => {
    const field = this.colFilterField();
    if (!field) return [];
    const term = this.colFilterTerm().toLowerCase();
    const seen = new Set<string>();
    const opts: string[] = [];
    for (const p of this.allProduits()) {
      let val: string;
      if (field === 'facturable' || field === 'imported') {
        val = (p as any)[field] ? 'Oui' : 'Non';
      } else {
        const raw = (p as any)[field];
        val = raw != null && raw !== '' ? String(raw) : '—';
      }
      if (!seen.has(val)) { seen.add(val); opts.push(val); }
    }
    opts.sort((a, b) => a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b));
    if (!term) return opts;
    return opts.filter(o => o.toLowerCase().includes(term));
  });

  readonly filtered = computed(() => {
    let list = this.allProduits();
    const fam = this.familleFilter();
    if (fam) list = list.filter(p => p.famille === fam);
    const q = this.searchText().trim().toLowerCase();
    if (q) list = list.filter(p =>
      (p.description_produit ?? '').toLowerCase().includes(q) ||
      p.code_produit.toLowerCase().includes(q)
    );
    for (const [field, value] of Object.entries(this.activeColFilters())) {
      list = list.filter(p => {
        if (field === 'facturable' || field === 'imported') {
          return ((p as any)[field] ? 'Oui' : 'Non') === value;
        }
        const raw = (p as any)[field];
        return (raw != null && raw !== '' ? String(raw) : '—') === value;
      });
    }
    const col = this.sortCol();
    const dir = this.sortDir();
    return [...list].sort((a, b) => {
      const av = (a as any)[col] ?? '';
      const bv = (b as any)[col] ?? '';
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  });

  readonly totalCount = computed(() => this.allProduits().length);

  ngOnInit(): void {
    this.loadColumnState();
    this.load();
    this.svc.getFamilles().subscribe(d => this.familles.set(d));
  }

  load(): void {
    this.loading.set(true);
    this.svc.list({ per_page: 500 }).subscribe({
      next: d => { this.allProduits.set(d.items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  sync(): void {
    this.syncPreviewLoading = true;
    this.syncPreviewItems = [];
    this.showSyncConfirm = true;
    this.svc.syncPreview().subscribe({
      next: items => { this.syncPreviewItems = items; this.syncPreviewLoading = false; },
      error: ()    => { this.syncPreviewLoading = false; },
    });
  }

  confirmSync(): void {
    this.showSyncConfirm = false;
    this.syncing.set(true);
    this.svc.sync().subscribe({
      next: () => { this.syncing.set(false); this.load(); this.svc.getFamilles().subscribe(d => this.familles.set(d)); },
      error: () => this.syncing.set(false),
    });
  }

  sortIcon(col: string): string {
    if (this.sortCol() !== col) return 'pi pi-sort-alt';
    return this.sortDir() === 1 ? 'pi pi-sort-amount-up-alt' : 'pi pi-sort-amount-down-alt';
  }

  sort(col: string): void {
    if (this.sortCol() === col) {
      this.sortDir.update(d => d === 1 ? -1 : 1);
    } else {
      this.sortCol.set(col);
      this.sortDir.set(1);
    }
  }

  isEditing(code: string, field: EditField): boolean {
    const c = this.editingCell();
    return c?.code === code && c?.field === field;
  }

  startEdit(p: ProduitRead, field: EditField, event: Event): void {
    event.stopPropagation();
    if (this.isEditing(p.code_produit, field)) return;
    this.editingCell.set({ code: p.code_produit, field });
    this.editingValue.set((p as any)[field] ?? null);
  }

  cancelEdit(): void {
    this.editingCell.set(null);
    this.editingValue.set(null);
  }

  saveEdit(p: ProduitRead): void {
    const cell = this.editingCell();
    if (!cell) return;
    const newVal = this.editingValue();
    const oldVal = (p as any)[cell.field];
    this.editingCell.set(null);
    if (newVal === oldVal) return;

    this.savingCell.set(cell);
    this.svc.update(p.code_produit, { [cell.field]: newVal }).subscribe({
      next: updated => {
        this.allProduits.update(list => list.map(x => x.code_produit === updated.code_produit ? updated : x));
        this.savingCell.set(null);
      },
      error: () => this.savingCell.set(null),
    });
  }

  openFamillePopover(p: ProduitRead, event: Event): void {
    event.stopPropagation();
    this.familleEditProd.set(p);
    this.familleOv.toggle(event);
  }

  saveFamille(f: string | null): void {
    const p = this.familleEditProd();
    this.familleOv.hide();
    if (!p || f === p.famille) return;
    this.savingCell.set({ code: p.code_produit, field: 'famille' });
    this.svc.update(p.code_produit, { famille: f }).subscribe({
      next: updated => {
        this.allProduits.update(list => list.map(x => x.code_produit === updated.code_produit ? updated : x));
        this.savingCell.set(null);
      },
      error: () => this.savingCell.set(null),
    });
  }

  toggleFacturable(p: ProduitRead): void {
    const newVal = !p.facturable;
    this.svc.update(p.code_produit, { facturable: newVal }).subscribe({
      next: updated => this.allProduits.update(list => list.map(x => x.code_produit === updated.code_produit ? updated : x)),
    });
  }

  openColFilter(field: string, event: Event): void {
    event.stopPropagation();
    this.colFilterField.set(field);
    this.colFilterTerm.set('');
    this.colFilterPop.toggle(event);
  }

  applyColFilter(value: string | null): void {
    const field = this.colFilterField();
    if (!field) return;
    this.activeColFilters.update(f => {
      const next = { ...f };
      if (value === null) delete next[field]; else next[field] = value;
      return next;
    });
    this.colFilterPop.hide();
  }

  getColFilter(field: string): string | undefined {
    return this.activeColFilters()[field];
  }

  formatPoids(v: number | null): string {
    if (v == null) return '—';
    return parseFloat(v.toPrecision(6)).toString();
  }
}

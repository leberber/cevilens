import { Component, input, output, effect, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';

// ── Types (exported so geo-explorer can import them) ─────────────────────────

export interface ProduitNode {
  nom: string;
  code: string;
  total: number;
  objectif: number | null;
}

export interface SousFamilleNode {
  nom: string;
  total: number;
  objectif: number | null;
  produits: ProduitNode[];
}

export interface FamilleNode {
  nom: string;
  total: number;
  objectif: number | null;
  sous_familles: SousFamilleNode[];
}

export type TreeSelection =
  | { type: 'famille';      nom: string }
  | { type: 'sous_famille'; famille: string; nom: string }
  | { type: 'produit';      famille: string; sous_famille: string; code: string; nom: string }
  | null;

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-product-tree',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './product-tree.component.html',
})
export class ProductTreeComponent {
  readonly tree      = input<FamilleNode[]>([]);
  readonly selection = input<TreeSelection>(null);
  readonly loading   = input(false);

  readonly selectionChange = output<TreeSelection>();

  private readonly openFamilles = signal<Set<string>>(new Set());
  private readonly openSfs      = signal<Set<string>>(new Set());

  readonly maxTotal = computed(() => Math.max(...this.tree().map(f => f.total), 1));

  constructor() {
    // Auto-expand the selected path when selection changes from outside
    effect(() => {
      const sel = this.selection();
      if (!sel) return;
      if (sel.type === 'famille') {
        this.expand(sel.nom);
      } else if (sel.type === 'sous_famille') {
        this.expand(sel.famille);
      } else if (sel.type === 'produit') {
        this.expand(sel.famille);
        this.expandSf(sel.famille, sel.sous_famille);
      }
    });
  }

  // ── Expand / collapse ───────────────────────────────────────────────────────

  isFamilleOpen(nom: string): boolean {
    return this.openFamilles().has(nom);
  }

  isSfOpen(famille: string, sf: string): boolean {
    return this.openSfs().has(`${famille}::${sf}`);
  }

  toggleFamille(nom: string): void {
    this.openFamilles.update(s => {
      const next = new Set(s);
      if (next.has(nom)) next.delete(nom); else next.add(nom);
      return next;
    });
  }

  toggleSf(famille: string, sf: string): void {
    const key = `${famille}::${sf}`;
    this.openSfs.update(s => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  private expand(famille: string): void {
    this.openFamilles.update(s => { const n = new Set(s); n.add(famille); return n; });
  }

  private expandSf(famille: string, sf: string): void {
    this.openSfs.update(s => { const n = new Set(s); n.add(`${famille}::${sf}`); return n; });
  }

  // ── Selection ───────────────────────────────────────────────────────────────

  isFamilleActive(f: FamilleNode): boolean {
    const s = this.selection();
    return s?.type === 'famille' && s.nom === f.nom;
  }

  isSfActive(f: FamilleNode, sf: SousFamilleNode): boolean {
    const s = this.selection();
    return s?.type === 'sous_famille' && s.famille === f.nom && s.nom === sf.nom;
  }

  isProdActive(p: ProduitNode): boolean {
    const s = this.selection();
    return s?.type === 'produit' && s.code === p.code;
  }

  selectFamille(f: FamilleNode): void {
    const next: TreeSelection = { type: 'famille', nom: f.nom };
    this.selectionChange.emit(this.isFamilleActive(f) ? null : next);
  }

  selectSf(f: FamilleNode, sf: SousFamilleNode): void {
    const next: TreeSelection = { type: 'sous_famille', famille: f.nom, nom: sf.nom };
    this.selectionChange.emit(this.isSfActive(f, sf) ? null : next);
  }

  selectProd(f: FamilleNode, sf: SousFamilleNode, p: ProduitNode): void {
    const next: TreeSelection = { type: 'produit', famille: f.nom, sous_famille: sf.nom, code: p.code, nom: p.nom };
    this.selectionChange.emit(this.isProdActive(p) ? null : next);
  }

  // ── Progress bar helpers ────────────────────────────────────────────────────

  pct(total: number, objectif: number | null): number | null {
    if (!objectif) return null;
    return Math.round((total / objectif) * 100);
  }

  barWidth(total: number, objectif: number | null): string {
    if (objectif) return `${Math.min(Math.round((total / objectif) * 100), 100)}%`;
    return `${Math.round((total / this.maxTotal()) * 100)}%`;
  }

  pctClass(p: number): string {
    if (p >= 100) return 'prod-tree__pct--success';
    if (p >= 75)  return 'prod-tree__pct--primary';
    if (p >= 50)  return 'prod-tree__pct--warning';
    return 'prod-tree__pct--danger';
  }

  barFillClass(total: number, objectif: number | null): string {
    const p = this.pct(total, objectif);
    if (p === null) return '';
    if (p >= 100) return 'prod-tree__fill--success';
    if (p >= 75)  return 'prod-tree__fill--primary';
    if (p >= 50)  return 'prod-tree__fill--warning';
    return 'prod-tree__fill--danger';
  }
}

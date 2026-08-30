import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanalHelper } from '../../../core/services/canal.helper';
import { FamilleColorService } from '../../../core/services/famille-color.service';

export interface ObjectifRow {
  code_produit: string;
  nom_produit: string;
  famille: string | null;
  sous_famille?: string | null;
  nom_distributeur?: string | null;
  objectif_tonne_vd?: number | null;
  objectif_tonne_vd_tournee?: number | null;
  objectif_packs_vd?: number | null;
  objectif_packs_vd_tournee?: number | null;
  objectif_tonne_vh?: number | null;
  objectif_tonne_vh_tournee?: number | null;
  objectif_packs_vh?: number | null;
  objectif_packs_vh_tournee?: number | null;
  updated_by?: string | null;
  updated_at?: string | null;
}

interface SfGroup  { nom: string; rows: ObjectifRow[]; }
interface FamGroup { nom: string; sfs: SfGroup[]; }

@Component({
  selector: 'app-objectifs-table',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './objectifs-table.component.scss',
  template: `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th class="th-sort" (click)="sortChange.emit('famille')">
              @if (!isFlatSort) {
                <button class="obj-toggle-all" type="button"
                        [title]="allCollapsed ? 'Tout déplier' : 'Tout replier'"
                        (click)="toggleAll($event)">
                  <i class="pi" [class]="allCollapsed ? 'pi-chevron-right' : 'pi-chevron-down'"></i>
                </button>
              }
              Famille <i class="pi" [class]="sortIcon('famille')"></i>
            </th>
            <th class="th-sort" style="width:8rem" (click)="sortChange.emit('code')">
              Code <i class="pi" [class]="sortIcon('code')"></i>
            </th>
            <th class="th-sort" (click)="sortChange.emit('produit')">
              Produit <i class="pi" [class]="sortIcon('produit')"></i>
            </th>
            <th class="th-sort" style="width:10rem" (click)="sortChange.emit('distributeur')">
              Distributeur <i class="pi" [class]="sortIcon('distributeur')"></i>
            </th>
            <th class="th-num th-sort th-tonne" [class.th-vd]="canal === 'VD'" [class.th-vh]="canal === 'VH'" (click)="sortChange.emit('tonne')">
              Tonnes <i class="pi" [class]="sortIcon('tonne')"></i>
            </th>
            <th class="th-num th-per-route th-sort th-tonne" [class.th-vd]="canal === 'VD'" [class.th-vh]="canal === 'VH'" (click)="sortChange.emit('tonne_route')">
              T / Tournée <i class="pi" [class]="sortIcon('tonne_route')"></i>
            </th>
            <th class="th-num th-sort th-packs" [class.th-vd]="canal === 'VD'" [class.th-vh]="canal === 'VH'" (click)="sortChange.emit('packs')">
              Packs <i class="pi" [class]="sortIcon('packs')"></i>
            </th>
            <th class="th-num th-per-route th-sort th-packs" [class.th-vd]="canal === 'VD'" [class.th-vh]="canal === 'VH'" (click)="sortChange.emit('packs_route')">
              P / Tournée <i class="pi" [class]="sortIcon('packs_route')"></i>
            </th>
            <th class="th-sort" style="width:9rem" (click)="sortChange.emit('updated_by')">
              Modifié par <i class="pi" [class]="sortIcon('updated_by')"></i>
            </th>
            <th class="th-sort" style="width:7rem" (click)="sortChange.emit('updated_at')">
              Le <i class="pi" [class]="sortIcon('updated_at')"></i>
            </th>
          </tr>
        </thead>
        <tbody>
          @if (loading) {
            @for (_ of [1,2,3,4,5,6,7,8]; track $index) {
              <tr class="sk-row">
                <td colspan="10"><div class="sk-bar"></div></td>
              </tr>
            }
          } @else if (isFlatSort) {
            @for (row of rows; track row.code_produit) {
              <tr>
                <td>
                  <span class="famille-pill-badge"
                        [style.background]="famBg(row.famille)"
                        [style.color]="famColor(row.famille)">{{ row.famille }}</span>
                </td>
                <td><span class="code-chip">{{ row.code_produit }}</span></td>
                <td class="td-nom" [title]="row.nom_produit">{{ row.nom_produit }}</td>
                <td class="td-nom" [title]="row.nom_distributeur || '—'">{{ row.nom_distributeur || '—' }}</td>
                <td class="td-num td-tonne">{{ fmt(rowTonne(row)) }}</td>
                <td class="td-num td-per-route td-tonne">{{ fmt(rowTonneTournee(row)) }}</td>
                <td class="td-num td-packs">{{ fmt(rowPacks(row)) }}</td>
                <td class="td-num td-per-route td-packs">{{ fmt(rowPacksTournee(row)) }}</td>
                <td class="text-muted td-small">{{ row.updated_by || '—' }}</td>
                <td class="text-muted td-small">{{ formatDate(row.updated_at) }}</td>
              </tr>
            }
          } @else {
            @for (fam of grouped; track fam.nom) {
              @let famRows = famAllRows(fam);
              @let bg = famBg(fam.nom);
              @let fg = famColor(fam.nom);
              <tr class="obj-fam-row" (click)="toggleFamily(fam.nom)">
                <td colspan="4" class="obj-fam-cell" [style.background]="bg" [style.color]="fg">
                  <div class="obj-fam-inner">
                    <i class="pi obj-fam-chevron"
                       [class.pi-chevron-down]="!isFamilyCollapsed(fam.nom)"
                       [class.pi-chevron-right]="isFamilyCollapsed(fam.nom)"></i>
                    <span>{{ fam.nom | uppercase }}</span>
                    <span class="obj-fam-count">{{ fam.sfs.length }} sf · {{ famRows.length }} produits</span>
                  </div>
                </td>
                <td class="td-num obj-fam-total td-tonne" [style.background]="bg" [style.color]="fg">{{ sumTonne(famRows) }}</td>
                <td class="td-num td-per-route obj-fam-total td-tonne" [style.background]="bg" [style.color]="fg">—</td>
                <td class="td-num obj-fam-total td-packs" [style.background]="bg" [style.color]="fg">{{ sumPacks(famRows) }}</td>
                <td class="td-num td-per-route obj-fam-total td-packs" [style.background]="bg" [style.color]="fg">—</td>
                <td colspan="2" [style.background]="bg"></td>
              </tr>
              @if (!isFamilyCollapsed(fam.nom)) {
                @for (sf of fam.sfs; track sf.nom) {
                  <tr class="obj-sf-row">
                    <td colspan="4" [style.background]="bg">{{ sf.nom }}</td>
                    <td class="td-num obj-sf-total td-tonne" [style.background]="bg">{{ sumTonne(sf.rows) }}</td>
                    <td class="td-per-route" [style.background]="bg">—</td>
                    <td class="td-num obj-sf-total td-packs" [style.background]="bg">{{ sumPacks(sf.rows) }}</td>
                    <td class="td-per-route" [style.background]="bg">—</td>
                    <td colspan="2" [style.background]="bg"></td>
                  </tr>
                  @for (row of sf.rows; track row.code_produit) {
                    <tr>
                      <td>
                        <span class="famille-pill-badge"
                              [style.background]="famBg(row.famille)"
                              [style.color]="famColor(row.famille)">{{ row.famille }}</span>
                      </td>
                      <td><span class="code-chip">{{ row.code_produit }}</span></td>
                      <td class="td-nom" [title]="row.nom_produit">{{ row.nom_produit }}</td>
                      <td class="td-nom" [title]="row.nom_distributeur || '—'">{{ row.nom_distributeur || '—' }}</td>
                      <td class="td-num td-tonne">{{ fmt(rowTonne(row)) }}</td>
                      <td class="td-num td-per-route td-tonne">{{ fmt(rowTonneTournee(row)) }}</td>
                      <td class="td-num td-packs">{{ fmt(rowPacks(row)) }}</td>
                      <td class="td-num td-per-route td-packs">{{ fmt(rowPacksTournee(row)) }}</td>
                      <td class="text-muted td-small">{{ row.updated_by || '—' }}</td>
                      <td class="text-muted td-small">{{ formatDate(row.updated_at) }}</td>
                    </tr>
                  }
                }
              }
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ObjectifsTableComponent implements OnChanges {
  private readonly canalHelper  = inject(CanalHelper);
  private readonly familleColor = inject(FamilleColorService);

  @Input() rows: ObjectifRow[] = [];
  @Input() loading: boolean = false;
  @Input() canal: 'VD' | 'VH' = 'VD';
  @Input() sortCol: string = '';
  @Input() sortDir: number = 1;

  @Output() sortChange = new EventEmitter<string>();

  private readonly _collapsed = new Set<string>();
  private _grouped: FamGroup[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows']) {
      this._grouped = this._buildGrouped();
    }
  }

  get isFlatSort(): boolean {
    return ['tonne', 'tonne_route', 'packs', 'packs_route'].includes(this.sortCol);
  }

  get grouped(): FamGroup[] { return this._grouped; }

  get allCollapsed(): boolean {
    return this._grouped.length > 0 && this._grouped.every(fam => this._collapsed.has(fam.nom));
  }

  toggleAll(event: Event): void {
    event.stopPropagation();
    if (this.allCollapsed) {
      this._collapsed.clear();
    } else {
      this._grouped.forEach(fam => this._collapsed.add(fam.nom));
    }
  }

  toggleFamily(nom: string): void {
    if (this._collapsed.has(nom)) {
      this._collapsed.delete(nom);
    } else {
      this._collapsed.add(nom);
    }
  }

  isFamilyCollapsed(nom: string): boolean { return this._collapsed.has(nom); }

  famAllRows(fam: FamGroup): ObjectifRow[] { return fam.sfs.flatMap(sf => sf.rows); }

  famBg(nom: string | null): string { return nom ? this.familleColor.getStyle(nom).background : ''; }
  famColor(nom: string | null): string { return nom ? this.familleColor.getStyle(nom).color : ''; }

  sumTonne(rows: ObjectifRow[]): string {
    const total = rows.reduce((s, r) => s + (this.rowTonne(r) ?? 0), 0);
    return total > 0 ? this.fmt(total) : '—';
  }

  sumPacks(rows: ObjectifRow[]): string {
    const total = rows.reduce((s, r) => s + (this.rowPacks(r) ?? 0), 0);
    return total > 0 ? this.fmt(total) : '—';
  }

  rowTonne(r: ObjectifRow): number | null {
    return this.canalHelper.selectByCanal(this.canal, r.objectif_tonne_vd, r.objectif_tonne_vh) ?? null;
  }

  rowPacks(r: ObjectifRow): number | null {
    return this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd, r.objectif_packs_vh) ?? null;
  }

  rowTonneTournee(r: ObjectifRow): number | null {
    return this.canalHelper.selectByCanal(this.canal, r.objectif_tonne_vd_tournee, r.objectif_tonne_vh_tournee) ?? null;
  }

  rowPacksTournee(r: ObjectifRow): number | null {
    return this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd_tournee, r.objectif_packs_vh_tournee) ?? null;
  }

  fmt(n: number | null | undefined): string {
    if (n == null) return '—';
    return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { year: '2-digit', month: 'short', day: 'numeric' });
  }

  sortIcon(col: string): string {
    if (this.sortCol !== col) return 'pi-sort-alt-slash';
    return this.sortDir === 1 ? 'pi-sort-down' : 'pi-sort-up';
  }

  private _buildGrouped(): FamGroup[] {
    const map = new Map<string, Map<string, ObjectifRow[]>>();
    for (const r of this.rows) {
      const fam = r.famille ?? '—';
      if (!map.has(fam)) map.set(fam, new Map());
      const sfMap = map.get(fam)!;
      const sf = r.sous_famille || '—';
      if (!sfMap.has(sf)) sfMap.set(sf, []);
      sfMap.get(sf)!.push(r);
    }
    return Array.from(map.entries()).map(([nom, sfMap]) => ({
      nom,
      sfs: Array.from(sfMap.entries()).map(([sfNom, rows]) => ({ nom: sfNom, rows })),
    }));
  }
}

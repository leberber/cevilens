import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanalHelper } from '../../../core/services/canal.helper';
import { FamilleColorService } from '../../../core/services/famille-color.service';
import { AggregateHelper } from '../../../core/services/aggregate.helper';

export interface ObjectifRow {
  code_produit: string;
  nom_produit: string;
  famille: string;
  sous_famille?: string | null;
  nom_distributeur?: string | null;
  objectif_tonne_vd?: number | null;
  objectif_packs_vd?: number | null;
  objectif_packs_vd_tournee?: number | null;
  objectif_tonne_vh?: number | null;
  objectif_packs_vh?: number | null;
  objectif_packs_vh_tournee?: number | null;
  updated_by?: string | null;
  updated_at?: string | null;
}

export interface FamGroupe {
  nom: string;
  sfs: Array<{ nom: string; rows: ObjectifRow[] }>;
}

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
            <th class="th-sort" style="width:8rem" (click)="sortChange.emit('famille')">
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
            @for (row of sortedRows; track row.code_produit) {
              <tr>
                <td>
                  <span class="famille-pill-badge"
                    [style.background]="famBg(row.famille)"
                    [style.color]="famColor(row.famille)">{{ row.famille }}</span>
                </td>
                <td><span class="code-chip">{{ row.code_produit }}</span></td>
                <td class="td-nom" [title]="row.nom_produit">{{ row.nom_produit }}</td>
                <td class="td-nom" [title]="row.nom_distributeur || '—'">{{ row.nom_distributeur || '—' }}</td>
                <td class="td-num td-tonne">{{ formatNum(rowTonne(row)) }}</td>
                <td class="td-num td-per-route td-tonne">{{ perRouteTonne(rowTonne(row)) }}</td>
                <td class="td-num td-packs">{{ formatNum(rowPacks(row)) }}</td>
                <td class="td-num td-per-route td-packs">{{ perRoute(rowPacksTournee(row)) }}</td>
                <td class="text-muted td-small">{{ row.updated_by || '—' }}</td>
                <td class="text-muted td-small">{{ formatDate(row.updated_at) }}</td>
              </tr>
            }
          } @else {
            @for (fam of grouped; track fam.nom) {
              @let fBg = famBg(fam.nom);
              @let fColor = famColor(fam.nom);
              @let fBorder = fColor + '33';
              @let fRows = famAllRows(fam);
              <tr class="obj-fam-row" (click)="familyToggle.emit(fam.nom)" title="Cliquer pour réduire / développer">
                <td colspan="4" class="obj-fam-cell"
                  [style.background]="fBg" [style.color]="fColor"
                  [style.border-top-color]="fBorder" [style.border-bottom-color]="fBorder">
                  <div class="obj-fam-inner">
                    <i class="pi obj-fam-chevron"
                      [class.pi-chevron-down]="!isFamilyCollapsed(fam.nom)"
                      [class.pi-chevron-right]="isFamilyCollapsed(fam.nom)"></i>
                    {{ fam.nom | uppercase }}
                    <span class="obj-fam-count">{{ fam.sfs.length }} sous-famille(s)</span>
                  </div>
                </td>
                <td class="td-num obj-fam-total td-tonne" [style.background]="fBg" [style.color]="fColor" [style.border-top-color]="fBorder" [style.border-bottom-color]="fBorder">{{ sumTonne(fRows) != null ? (sumTonne(fRows) | number:'1.0-2') : '—' }}</td>
                <td class="td-num td-per-route obj-fam-total td-tonne" [style.background]="fBg" [style.color]="fColor" [style.border-top-color]="fBorder" [style.border-bottom-color]="fBorder">{{ perRouteTonne(sumTonne(fRows)) }}</td>
                <td class="td-num obj-fam-total td-packs" [style.background]="fBg" [style.color]="fColor" [style.border-top-color]="fBorder" [style.border-bottom-color]="fBorder">{{ sumPacks(fRows) != null ? (sumPacks(fRows) | number:'1.0-0') : '—' }}</td>
                <td class="td-num td-per-route obj-fam-total td-packs" [style.background]="fBg" [style.color]="fColor" [style.border-top-color]="fBorder" [style.border-bottom-color]="fBorder">{{ sumPacksTournee(fRows) != null ? (sumPacksTournee(fRows) | number:'1.0-0') : '—' }}</td>
                <td colspan="3" [style.background]="fBg" [style.border-top-color]="fBorder" [style.border-bottom-color]="fBorder"></td>
              </tr>

              @if (!isFamilyCollapsed(fam.nom)) {
                @for (sf of fam.sfs; track sf.nom) {
                  @let sfBg = famBgLight(fam.nom);
                  <tr class="obj-sf-row">
                    <td colspan="4" [style.background]="sfBg">{{ sf.nom }}</td>
                    <td class="td-num obj-sf-total td-tonne" [style.background]="sfBg">{{ sumTonne(sf.rows) != null ? (sumTonne(sf.rows) | number:'1.0-2') : '—' }}</td>
                    <td class="td-num td-per-route obj-sf-total td-tonne" [style.background]="sfBg">{{ perRouteTonne(sumTonne(sf.rows)) }}</td>
                    <td class="td-num obj-sf-total td-packs" [style.background]="sfBg">{{ sumPacks(sf.rows) != null ? (sumPacks(sf.rows) | number:'1.0-0') : '—' }}</td>
                    <td class="td-num td-per-route obj-sf-total td-packs" [style.background]="sfBg">{{ sumPacksTournee(sf.rows) != null ? (sumPacksTournee(sf.rows) | number:'1.0-0') : '—' }}</td>
                    <td colspan="3" [style.background]="sfBg"></td>
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
                      <td class="td-num td-tonne">{{ formatNum(rowTonne(row)) }}</td>
                      <td class="td-num td-per-route td-tonne">{{ perRouteTonne(rowTonne(row)) }}</td>
                      <td class="td-num td-packs">{{ formatNum(rowPacks(row)) }}</td>
                      <td class="td-num td-per-route td-packs">{{ perRoute(rowPacksTournee(row)) }}</td>
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
export class ObjectifsTableComponent {
  private readonly canalHelper         = inject(CanalHelper);
  private readonly familleColorService = inject(FamilleColorService);
  private readonly aggregateHelper     = inject(AggregateHelper);

  @Input() rows: ObjectifRow[] = [];
  @Input() grouped: FamGroupe[] = [];
  @Input() loading: boolean = false;
  @Input() canal: 'VD' | 'VH' = 'VD';
  @Input() sortCol: string = '';
  @Input() sortDir: number = 1;
  @Input() collapsedFamilies: Set<string> = new Set();
  @Input() isFlatSort: boolean = false;
  @Input() sortedRows: ObjectifRow[] = [];
  @Input() routeCount: number = 0;

  @Output() sortChange   = new EventEmitter<string>();
  @Output() familyToggle = new EventEmitter<string>();

  famBg(famille: string): string      { return this.familleColorService.getStyle(famille).background; }
  famColor(famille: string): string   { return this.familleColorService.getStyle(famille).color; }
  famBgLight(_: string): string       { return 'rgba(0,0,0,0.02)'; }

  famAllRows(fam: FamGroupe): ObjectifRow[] { return fam.sfs.flatMap(sf => sf.rows); }
  isFamilyCollapsed(nom: string): boolean   { return this.collapsedFamilies.has(nom); }

  rowTonne(r: ObjectifRow): number | null {
    return this.canalHelper.selectByCanal(this.canal, r.objectif_tonne_vd, r.objectif_tonne_vh) ?? null;
  }

  rowPacks(r: ObjectifRow): number | null {
    return this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd, r.objectif_packs_vh) ?? null;
  }

  rowPacksTournee(r: ObjectifRow): number | null {
    return this.canalHelper.selectByCanal(this.canal, r.objectif_packs_vd_tournee, r.objectif_packs_vh_tournee) ?? null;
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

  perRouteTonne(val: number | null | undefined): string {
    if (val == null || this.routeCount === 0) return '—';
    return (val / this.routeCount).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }

  perRoute(val: number | null | undefined): string {
    if (val == null) return '—';
    return val.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  }

  formatNum(n: number | null | undefined): string {
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
}

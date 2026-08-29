import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanalHelper } from '../../../core/services/canal.helper';

export interface ObjectifRow {
  code_produit: string;
  nom_produit: string;
  famille: string;
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
                <td colspan="9"><div class="sk-bar"></div></td>
              </tr>
            }
          } @else {
            @for (row of rows; track row.code_produit) {
              <tr>
                <td><span class="code-chip">{{ row.code_produit }}</span></td>
                <td class="td-nom" [title]="row.nom_produit">{{ row.nom_produit }}</td>
                <td class="td-nom" [title]="row.nom_distributeur || '—'">{{ row.nom_distributeur || '—' }}</td>
                <td class="td-num td-tonne">{{ formatNum(rowTonne(row)) }}</td>
                <td class="td-num td-per-route td-tonne">{{ perRoute(rowTonneTournee(row)) }}</td>
                <td class="td-num td-packs">{{ formatNum(rowPacks(row)) }}</td>
                <td class="td-num td-per-route td-packs">{{ perRoute(rowPacksTournee(row)) }}</td>
                <td class="text-muted td-small">{{ row.updated_by || '—' }}</td>
                <td class="text-muted td-small">{{ formatDate(row.updated_at) }}</td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ObjectifsTableComponent {
  private readonly canalHelper = inject(CanalHelper);

  @Input() rows: ObjectifRow[] = [];
  @Input() loading: boolean = false;
  @Input() canal: 'VD' | 'VH' = 'VD';
  @Input() sortCol: string = '';
  @Input() sortDir: number = 1;

  @Output() sortChange = new EventEmitter<string>();

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

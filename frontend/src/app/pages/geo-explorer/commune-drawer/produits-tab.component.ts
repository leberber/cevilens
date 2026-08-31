import { Component, input, signal, computed } from '@angular/core';
import { D3DonutComponent, type DonutSlice } from '../../analytics/d3-donut.component';
import { D3DualAxisComponent, type DualAxisPoint } from '../../analytics/d3-dual-axis.component';

const COLORS = [
  '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981',
  '#ef4444', '#f97316', '#6366f1', '#14b8a6',
  '#ec4899', '#06b6d4',
];

@Component({
  selector: 'app-produits-tab',
  standalone: true,
  imports: [D3DonutComponent, D3DualAxisComponent],
  template: `
    <div class="pt-layout">
      <!-- Top row: donuts -->
      <div class="pt-row pt-row--donuts">
        <div class="pt-panel">
          <div class="pt-panel__label">
            @if (selectedFamille()) {
              <button class="pt-back" (click)="selectedFamille.set(null)" aria-label="Retour">
                <i class="pi pi-arrow-left"></i>
              </button>
              {{ selectedFamille() }}
            } @else {
              Par famille
            }
          </div>
          <div class="pt-panel__chart">
            <app-d3-donut
              [data]="familleSlices()"
              [centerUnit]="uniteShort"
              [deltas]="familleDeltas()"
              [secondaryValues]="famillePacks()"
              [secondaryUnit]="'packs'"
              [selectedNom]="selectedFamille()"
              (sliceSelect)="selectedFamille.set($event)" />
          </div>
        </div>

        <div class="pt-panel">
          <div class="pt-panel__label">
            @if (selectedFamille()) { Produits } @else { Top produits }
          </div>
          <div class="pt-panel__chart">
            <app-d3-donut
              [data]="productSlices()"
              [centerUnit]="uniteShort"
              [deltas]="produitDeltas()"
              [secondaryValues]="produitPacks()"
              [secondaryUnit]="'packs'" />
          </div>
        </div>
      </div>

      <!-- Bottom row: dual-axes history chart -->
      <div class="pt-row pt-row--charts">
        <div class="pt-panel pt-panel--full">
          <div class="pt-panel__label">
            <i class="pi pi-chart-bar"></i> Historique (12 mois)
          </div>
          <div class="pt-panel__chart">
            <app-d3-dual-axis
              [data]="monthlyData()"
              [barLabel]="'Volume'"
              [lineLabel]="clientMode() ? 'Commandes' : 'Clients'"
              [barUnit]="uniteShort" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .pt-back {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1rem;
      height: 1.1rem;
      background: none;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      color: var(--text-color-secondary);
      transition: background 0.15s;
      padding: 0;
      i { font-size: 0.55rem; }
      &:hover { background: var(--surface-hover); }
    }

    .pt-layout {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    .pt-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 0;

      &--donuts { flex: 3; }
      &--charts {
        flex: 2;
        border-top: var(--border-width) solid var(--surface-border);
      }
    }

    .pt-panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-right: var(--border-width) solid var(--surface-border);
      &:last-child { border-right: none; }

      &__label {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.35rem 0.75rem;
        font-size: 0.62rem;
        font-weight: 700;
        color: var(--text-color-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        i { font-size: 0.6rem; }
      }

      &__chart {
        flex: 1;
        min-height: 0;
        padding: 0.35rem;
      }

      &--full {
        grid-column: 1 / -1;
        border-right: none;
      }
    }

  `],
})
export class ProduitsTabComponent {
  readonly byFamille     = input<{ nom: string; total: number; packs?: number }[]>([]);
  readonly byFamillePrev = input<{ nom: string; total: number }[]>([]);
  readonly byProduit     = input<{ code: string; nom: string; famille: string; total: number; packs?: number }[]>([]);
  readonly byProduitPrev = input<{ code: string; nom: string; famille: string; total: number }[]>([]);
  readonly monthlyHistory = input<{ month: string; total: number; nb_clients: number; nb_visits?: number }[]>([]);
  readonly clientMode    = input(false);
  readonly dateTo        = input('');

  readonly selectedFamille = signal<string | null>(null);
  readonly uniteShort = 't';

  private readonly colorMap = computed(() => {
    const m = new Map<string, string>();
    this.byFamille().forEach((f, i) => m.set(f.nom, COLORS[i % COLORS.length]));
    return m;
  });

  readonly familleSlices = computed<DonutSlice[]>(() =>
    this.byFamille().map((f, i) => ({
      nom: f.nom,
      value: f.total,
      color: COLORS[i % COLORS.length],
    }))
  );

  readonly productSlices = computed<DonutSlice[]>(() => {
    const sel = this.selectedFamille();
    const prods = sel
      ? this.byProduit().filter(p => p.famille === sel)
      : this.byProduit().slice(0, 8);

    return prods.map((p, i) => ({
      nom: p.nom,
      value: p.total,
      color: sel
        ? this.lighten(this.colorMap().get(sel) ?? COLORS[0], i)
        : COLORS[i % COLORS.length],
    }));
  });

  readonly famillePacks = computed<Record<string, number>>(() => {
    const rec: Record<string, number> = {};
    for (const f of this.byFamille()) {
      if (f.packs != null) rec[f.nom] = f.packs;
    }
    return rec;
  });

  readonly produitPacks = computed<Record<string, number>>(() => {
    const sel = this.selectedFamille();
    const prods = sel
      ? this.byProduit().filter(p => p.famille === sel)
      : this.byProduit().slice(0, 8);
    const rec: Record<string, number> = {};
    for (const p of prods) {
      if (p.packs != null) rec[p.nom] = p.packs;
    }
    return rec;
  });

  readonly familleDeltas = computed<Record<string, number | null>>(() => {
    const prevMap = new Map(this.byFamillePrev().map(f => [f.nom, f.total]));
    const rec: Record<string, number | null> = {};
    for (const f of this.byFamille()) {
      const prev = prevMap.get(f.nom) ?? 0;
      rec[f.nom] = prev > 0 ? Math.round(((f.total - prev) / prev) * 100) : null;
    }
    return rec;
  });

  readonly produitDeltas = computed<Record<string, number | null>>(() => {
    const sel = this.selectedFamille();
    const prods = sel
      ? this.byProduit().filter(p => p.famille === sel)
      : this.byProduit().slice(0, 8);
    const prevMap = new Map(this.byProduitPrev().map(p => [p.code, p.total]));
    const rec: Record<string, number | null> = {};
    for (const p of prods) {
      const prev = prevMap.get(p.code) ?? 0;
      rec[p.nom] = prev > 0 ? Math.round(((p.total - prev) / prev) * 100) : null;
    }
    return rec;
  });

  readonly monthlyData = computed<DualAxisPoint[]>(() => {
    const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    const hist = this.monthlyHistory();
    if (!hist.length) return [];

    const isClient = this.clientMode();
    const dataMap = new Map(hist.map(m => [m.month, m]));

    // Anchor window to dateTo (filter end date) so current month is always included
    const dt = this.dateTo();
    let ly: number, lm: number;
    if (dt) {
      const parts = dt.split('-').map(Number);
      ly = parts[0]; lm = parts[1];
    } else {
      const last = hist[hist.length - 1].month;
      [ly, lm] = last.split('-').map(Number);
    }

    const points: DualAxisPoint[] = [];
    let prevTotal = 0;
    for (let i = 11; i >= 0; i--) {
      let mm = lm - i;
      let yy = ly;
      while (mm <= 0) { mm += 12; yy--; }
      const key = `${yy}-${String(mm).padStart(2, '0')}`;
      const row = dataMap.get(key);
      const total = row?.total ?? 0;
      points.push({
        label: MONTH_SHORT[mm - 1],
        bar: total,
        line: isClient ? (row?.nb_visits ?? 0) : (row?.nb_clients ?? 0),
        missed: isClient && total === 0 && prevTotal > 0,
      });
      prevTotal = total > 0 ? total : prevTotal;
    }
    return points;
  });

  private lighten(hex: string, idx: number): string {
    const factor = 0.15 + (idx * 0.08);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lr = Math.round(r + (255 - r) * Math.min(factor, 0.7));
    const lg = Math.round(g + (255 - g) * Math.min(factor, 0.7));
    const lb = Math.round(b + (255 - b) * Math.min(factor, 0.7));
    return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
  }
}

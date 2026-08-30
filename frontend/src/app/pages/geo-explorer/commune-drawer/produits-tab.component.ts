import { Component, input, signal, computed } from '@angular/core';
import { D3DonutComponent, type DonutSlice } from '../../analytics/d3-donut.component';

const COLORS = [
  '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981',
  '#ef4444', '#f97316', '#6366f1', '#14b8a6',
  '#ec4899', '#06b6d4',
];

@Component({
  selector: 'app-produits-tab',
  standalone: true,
  imports: [D3DonutComponent],
  template: `
    <div class="pt-header">
      @if (selectedFamille(); as f) {
        <button class="pt-back" (click)="selectedFamille.set(null)" aria-label="Retour">
          <i class="pi pi-arrow-left"></i>
        </button>
        <span class="pt-header__title">{{ f }}</span>
      } @else {
        <i class="pi pi-chart-pie pt-header__icon"></i>
        <span class="pt-header__title">Répartition produits</span>
      }
    </div>

    <div class="pt-grid">
      <!-- Left donut: famille share -->
      <div class="pt-panel">
        <div class="pt-panel__label">Par famille</div>
        <div class="pt-panel__chart">
          <app-d3-donut
            [data]="familleSlices()"
            [centerUnit]="uniteShort()"
            [selectedNom]="selectedFamille()"
            (sliceSelect)="selectedFamille.set($event)" />
        </div>
      </div>

      <!-- Right donut: products -->
      <div class="pt-panel">
        <div class="pt-panel__label">
          @if (selectedFamille()) { Produits } @else { Top produits }
        </div>
        <div class="pt-panel__chart">
          <app-d3-donut
            [data]="productSlices()"
            [centerUnit]="uniteShort()" />
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .pt-header {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 0.85rem;
      border-bottom: var(--border-width) solid var(--surface-border);

      &__icon { font-size: 0.7rem; color: var(--text-color-secondary); }

      &__title {
        font-size: 0.75rem;
        font-weight: var(--font-weight-bold);
        color: var(--text-color);
      }
    }

    .pt-back {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.3rem;
      height: 1.3rem;
      background: none;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      color: var(--text-color-secondary);
      transition: background 0.15s;
      i { font-size: 0.6rem; }
      &:hover { background: var(--surface-hover); }
    }

    .pt-grid {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 0;
      overflow: hidden;
    }

    .pt-panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-right: var(--border-width) solid var(--surface-border);
      &:last-child { border-right: none; }

      &__label {
        flex-shrink: 0;
        padding: 0.35rem 0.75rem;
        font-size: 0.62rem;
        font-weight: 700;
        color: var(--text-color-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      &__chart {
        flex: 1;
        min-height: 0;
        padding: 0.35rem;
      }
    }
  `],
})
export class ProduitsTabComponent {
  readonly byFamille  = input<{ nom: string; total: number }[]>([]);
  readonly byProduit  = input<{ code: string; nom: string; famille: string; total: number }[]>([]);
  readonly canalSplit = input<{ vd: number; vh: number } | null>(null);
  readonly unite      = input('tonnes');

  readonly selectedFamille = signal<string | null>(null);
  readonly uniteShort = computed(() => this.unite() === 'tonnes' ? 't' : 'packs');

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

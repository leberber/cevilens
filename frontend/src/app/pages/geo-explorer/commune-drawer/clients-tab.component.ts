import { Component, inject, input, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';

const COLORS = [
  '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981',
  '#ef4444', '#f97316', '#6366f1', '#14b8a6',
  '#ec4899', '#06b6d4',
];

interface FamilleSlice { nom: string; total: number; }
interface ClientRow { code: string; nom: string; total: number; by_famille: FamilleSlice[]; }
interface ClientProducts {
  by_famille: FamilleSlice[];
  by_produit: { code: string; nom: string; famille: string; total: number }[];
}

@Component({
  selector: 'app-clients-tab',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="ct-scroll">

      <!-- Servis card -->
      <section class="ct-section">
        <div class="ct-section__header ct-section__header--green">
          <i class="pi pi-check-circle"></i>
          <span>Clients servis</span>
          <span class="ct-section__count">{{ servis().length }}</span>
        </div>
        <ul class="ct-list">
          @for (c of servis(); track c.code; let i = $index) {
            <li class="ct-item">
              <div class="ct-row" [class.ct-row--expanded]="selectedCode() === c.code"
                   (click)="toggleClient(c)">
                <span class="ct-row__rank">{{ i + 1 }}</span>
                <div class="ct-row__main">
                  <div class="ct-row__top">
                    <span class="ct-row__name" [title]="c.nom">{{ c.nom }}</span>
                    <span class="ct-row__total">{{ c.total | number:'1.0-0' }} DA</span>
                  </div>
                  @if (c.by_famille.length) {
                    <div class="ct-bar">
                      @for (seg of buildSegments(c.by_famille); track seg.nom) {
                        <div class="ct-bar__seg"
                             [style.flex-grow]="seg.pct"
                             [style.background]="familleColor(seg.nom)"
                             [title]="seg.nom + ' — ' + seg.pct + '%'"></div>
                      }
                    </div>
                  }
                </div>
                <i class="pi ct-row__chevron"
                   [class.pi-chevron-down]="selectedCode() !== c.code"
                   [class.pi-chevron-up]="selectedCode() === c.code"></i>
              </div>

              @if (selectedCode() === c.code) {
                <div class="ct-expand">
                  @if (detailLoading()) {
                    <div class="ct-expand__loading"><i class="pi pi-spin pi-spinner"></i></div>
                  } @else if (clientProducts()) {
                    <ul class="ct-prods">
                      @for (p of clientProducts()!.by_produit; track p.code) {
                        <li class="ct-prod">
                          <span class="ct-prod__dot" [style.background]="familleColor(p.famille)"></span>
                          <span class="ct-prod__name" [title]="p.nom">{{ p.nom }}</span>
                          <span class="ct-prod__fam">{{ p.famille }}</span>
                          <span class="ct-prod__val">{{ p.total | number:'1.1-1' }} {{ uniteShort() }}</span>
                        </li>
                      }
                    </ul>
                  } @else {
                    <div class="ct-expand__empty">Aucun détail</div>
                  }
                </div>
              }
            </li>
          } @empty {
            <li class="ct-empty">Aucune vente ce mois-ci</li>
          }
        </ul>
      </section>

      <!-- Manqués card -->
      <section class="ct-section">
        <div class="ct-section__header ct-section__header--amber">
          <i class="pi pi-exclamation-circle"></i>
          <span>Clients manqués</span>
          <span class="ct-section__count ct-section__count--warn">{{ manques().length }}</span>
        </div>
        <ul class="ct-list">
          @for (c of manques(); track c.code; let i = $index) {
            <li class="ct-item">
              <div class="ct-row" [class.ct-row--expanded]="selectedCode() === c.code"
                   (click)="toggleClient(c)">
                <span class="ct-row__rank">{{ i + 1 }}</span>
                <div class="ct-row__main">
                  <div class="ct-row__top">
                    <span class="ct-row__name" [title]="c.nom">{{ c.nom }}</span>
                    <span class="ct-row__total">{{ c.total | number:'1.0-0' }} DA</span>
                  </div>
                  @if (c.by_famille.length) {
                    <div class="ct-bar">
                      @for (seg of buildSegments(c.by_famille); track seg.nom) {
                        <div class="ct-bar__seg"
                             [style.flex-grow]="seg.pct"
                             [style.background]="familleColor(seg.nom)"
                             [title]="seg.nom + ' — ' + seg.pct + '%'"></div>
                      }
                    </div>
                  }
                </div>
                <i class="pi ct-row__chevron"
                   [class.pi-chevron-down]="selectedCode() !== c.code"
                   [class.pi-chevron-up]="selectedCode() === c.code"></i>
              </div>

              @if (selectedCode() === c.code) {
                <div class="ct-expand">
                  @if (detailLoading()) {
                    <div class="ct-expand__loading"><i class="pi pi-spin pi-spinner"></i></div>
                  } @else if (clientProducts()) {
                    <ul class="ct-prods">
                      @for (p of clientProducts()!.by_produit; track p.code) {
                        <li class="ct-prod">
                          <span class="ct-prod__dot" [style.background]="familleColor(p.famille)"></span>
                          <span class="ct-prod__name" [title]="p.nom">{{ p.nom }}</span>
                          <span class="ct-prod__fam">{{ p.famille }}</span>
                          <span class="ct-prod__val">{{ p.total | number:'1.1-1' }} {{ uniteShort() }}</span>
                        </li>
                      }
                    </ul>
                  } @else {
                    <div class="ct-expand__empty">Aucun détail</div>
                  }
                </div>
              }
            </li>
          } @empty {
            <li class="ct-empty">Aucun client manqué</li>
          }
        </ul>
      </section>

    </div>

    <!-- Famille legend -->
    @if (colorEntries().length) {
      <div class="ct-legend">
        @for (e of colorEntries(); track e.nom) {
          <span class="ct-legend__item">
            <span class="ct-legend__dot" [style.background]="e.color"></span>
            {{ e.nom }}
          </span>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .ct-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    // ── Section card ─────────────────────────────────────────
    .ct-section {
      border: var(--border-width) solid var(--surface-border);
      border-radius: 0.5rem;
      overflow: hidden;

      &__header {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.45rem 0.75rem;
        font-size: 0.72rem;
        font-weight: var(--font-weight-bold);
        border-bottom: var(--border-width) solid var(--surface-border);

        i { font-size: 0.65rem; }

        &--green {
          background: rgba(var(--color-success-rgb), 0.06);
          color: var(--color-success-dark);
        }
        &--amber {
          background: rgba(var(--color-warning-rgb), 0.06);
          color: var(--color-warning-dark);
        }
      }

      &__count {
        margin-left: auto;
        font-size: 0.62rem;
        font-weight: 700;
        background: rgba(var(--color-success-rgb), 0.12);
        color: var(--color-success-dark);
        padding: 0.05rem 0.35rem;
        border-radius: 999px;

        &--warn {
          background: rgba(var(--color-warning-rgb), 0.12);
          color: var(--color-warning-dark);
        }
      }
    }

    // ── List ──────────────────────────────────────────────────
    .ct-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .ct-item {
      border-bottom: var(--border-width) solid var(--surface-border);
      &:last-child { border-bottom: none; }
    }

    .ct-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.75rem;
      cursor: pointer;
      transition: background 0.12s;

      &:hover { background: var(--surface-hover); }
      &--expanded { background: rgba(var(--primary-rgb), 0.04); }

      &__rank {
        flex-shrink: 0;
        width: 1.2rem;
        font-size: 0.62rem;
        font-weight: 700;
        color: var(--text-color-secondary);
        text-align: right;
      }

      &__main { flex: 1; min-width: 0; }

      &__top {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin-bottom: 0.2rem;
      }

      &__name {
        flex: 1;
        font-size: 0.73rem;
        color: var(--text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &__total {
        flex-shrink: 0;
        font-size: 0.68rem;
        font-weight: var(--font-weight-semibold);
        color: var(--text-color-secondary);
        white-space: nowrap;
      }

      &__chevron {
        flex-shrink: 0;
        font-size: 0.5rem;
        color: var(--surface-400);
      }
    }

    .ct-empty {
      padding: 1.2rem 0.75rem;
      text-align: center;
      font-size: 0.72rem;
      color: var(--text-color-secondary);
    }

    // ── Stacked bar ──────────────────────────────────────────
    .ct-bar {
      display: flex;
      height: 0.4rem;
      border-radius: 0.2rem;
      overflow: hidden;

      &__seg {
        min-width: 2px;
        transition: flex-grow 0.3s ease;
      }
    }

    // ── Expanded products ────────────────────────────────────
    .ct-expand {
      padding: 0.35rem 0.75rem 0.55rem 2.5rem;
      background: var(--surface-50, var(--surface-ground));
    }

    .ct-expand__loading {
      padding: 0.5rem 0;
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-color-secondary);
    }

    .ct-expand__empty {
      padding: 0.4rem 0;
      font-size: 0.7rem;
      color: var(--text-color-secondary);
    }

    .ct-prods {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .ct-prod {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0;

      &__dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
      &__name { flex: 1; font-size: 0.68rem; color: var(--text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      &__fam { flex-shrink: 0; font-size: 0.58rem; color: var(--text-color-secondary); opacity: 0.7; }
      &__val { flex-shrink: 0; font-size: 0.64rem; font-weight: 600; color: var(--text-color-secondary); white-space: nowrap; }
    }

    // ── Legend ────────────────────────────────────────────────
    .ct-legend {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.2rem 0.55rem;
      padding: 0.4rem 0.75rem;
      border-top: var(--border-width) solid var(--surface-border);

      &__item {
        display: flex;
        align-items: center;
        gap: 0.2rem;
        font-size: 0.58rem;
        color: var(--text-color-secondary);
      }

      &__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    }
  `],
})
export class ClientsTabComponent {
  private readonly http = inject(HttpClient);

  readonly servis         = input<ClientRow[]>([]);
  readonly manques        = input<ClientRow[]>([]);
  readonly globalFamilles = input<FamilleSlice[]>([]);
  readonly commune        = input<{ code: number; name: string }>({ code: 0, name: '' });
  readonly dateFrom       = input('');
  readonly dateTo         = input('');
  readonly canal          = input('');
  readonly unite          = input('tonnes');

  readonly selectedClient = signal<ClientRow | null>(null);
  readonly clientProducts = signal<ClientProducts | null>(null);
  readonly detailLoading  = signal(false);

  readonly selectedCode = computed(() => this.selectedClient()?.code ?? null);
  readonly uniteShort   = computed(() => this.unite() === 'tonnes' ? 't' : 'packs');

  private readonly familleColorMap = computed(() => {
    const m = new Map<string, string>();
    this.globalFamilles().forEach((f, i) => m.set(f.nom, COLORS[i % COLORS.length]));
    return m;
  });

  readonly colorEntries = computed(() =>
    this.globalFamilles().map((f, i) => ({ nom: f.nom, color: COLORS[i % COLORS.length] }))
  );

  familleColor(nom: string): string {
    return this.familleColorMap().get(nom) ?? '#94a3b8';
  }

  buildSegments(byFamille: FamilleSlice[]): { nom: string; pct: number }[] {
    const total = byFamille.reduce((s, f) => s + f.total, 0);
    if (!total) return [];
    return byFamille.map(f => ({
      nom: f.nom,
      pct: Math.round((f.total / total) * 100) || 1,
    }));
  }

  toggleClient(client: ClientRow): void {
    if (this.selectedClient()?.code === client.code) {
      this.selectedClient.set(null);
      this.clientProducts.set(null);
      return;
    }
    this.selectedClient.set(client);
    this.loadClientProducts(client.code);
  }

  private loadClientProducts(code: string): void {
    this.detailLoading.set(true);
    this.clientProducts.set(null);

    let params = new HttpParams()
      .set('code_client', code)
      .set('commune', this.commune().name)
      .set('date_from', this.dateFrom())
      .set('date_to', this.dateTo())
      .set('unite', this.unite());
    const c = this.canal();
    if (c && c !== 'ALL') params = params.set('canal', c);

    this.http.get<ClientProducts>('/api/v1/geo/client-products', { params }).subscribe({
      next:  data => { this.clientProducts.set(data); this.detailLoading.set(false); },
      error: ()   => this.detailLoading.set(false),
    });
  }
}

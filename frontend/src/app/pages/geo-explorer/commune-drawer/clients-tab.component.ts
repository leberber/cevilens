import { Component, inject, input, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { D3DonutComponent, type DonutSlice } from '../../analytics/d3-donut.component';
import { D3ClientHistoryComponent, type HistoryPoint } from './d3-client-history.component';

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

interface ClientListItem {
  code: string;
  nom: string;
  total: number;
  qty: number;
  missed: boolean;
  by_famille: FamilleSlice[];
}

@Component({
  selector: 'app-clients-tab',
  standalone: true,
  imports: [DecimalPipe, D3DonutComponent, D3ClientHistoryComponent],
  template: `
    <div class="ct-wrap">

      <!-- Left: client list -->
      <div class="ct-list-panel">
        <div class="ct-search">
          <i class="pi pi-search"></i>
          <input type="text" placeholder="Rechercher un client…"
                 [value]="search()"
                 (input)="search.set($any($event.target).value)" />
        </div>

        <div class="ct-list-scroll">
          @for (c of filteredClients(); track c.code; let i = $index) {
            <div class="ct-client" [class.ct-client--active]="selectedCode() === c.code"
                 [class.ct-client--missed]="c.missed"
                 (click)="selectClient(c)">
              <div class="ct-client__avatar" [class.ct-client__avatar--missed]="c.missed">
                {{ c.nom.charAt(0) }}
              </div>
              <div class="ct-client__info">
                <span class="ct-client__name" [title]="c.nom">{{ c.nom }}</span>
                <div class="ct-client__metrics">
                  <span class="ct-client__da">
                    <i class="pi pi-wallet"></i> {{ c.total | number:'1.0-0' }}
                  </span>
                  <span class="ct-client__sep"></span>
                  <span class="ct-client__qty">
                    <i class="pi pi-box"></i> {{ c.qty | number:'1.1-1' }} {{ uniteShort() }}
                  </span>
                </div>
              </div>
              <span class="ct-status" [class.ct-status--missed]="c.missed">
                <i class="pi" [class.pi-check-circle]="!c.missed"
                   [class.pi-exclamation-circle]="c.missed"></i>
              </span>
            </div>
          } @empty {
            <div class="ct-empty">
              @if (search()) { Aucun client trouvé } @else { Aucun client }
            </div>
          }
        </div>

        <div class="ct-list-footer">
          <span class="ct-list-footer__stat ct-list-footer__stat--green">
            <i class="pi pi-check-circle"></i> {{ servis().length }} servis
          </span>
          <span class="ct-list-footer__stat ct-list-footer__stat--amber">
            <i class="pi pi-exclamation-circle"></i> {{ manques().length }} manqués
          </span>
        </div>
      </div>

      <!-- Right: detail panel -->
      <div class="ct-detail">
        @if (selectedClient(); as client) {
          <!-- Header with avatar -->
          <div class="ct-detail__header">
            <div class="ct-avatar" [class.ct-avatar--missed]="client.missed">
              <i class="pi pi-user"></i>
            </div>
            <div class="ct-detail__identity">
              <h3 class="ct-detail__name">{{ client.nom }}</h3>
              <span class="ct-detail__code">{{ client.code }}</span>
            </div>
            <span class="ct-badge ct-badge--lg" [class.ct-badge--missed]="client.missed">
              {{ client.missed ? 'Manqué' : 'Servi' }}
            </span>
            <div class="ct-detail__kpis">
              <div class="ct-mini-kpi">
                <span class="ct-mini-kpi__val">{{ client.total | number:'1.0-0' }}</span>
                <span class="ct-mini-kpi__label">DA ce mois</span>
              </div>
              @if (clientProducts(); as cp) {
                <div class="ct-mini-kpi">
                  <span class="ct-mini-kpi__val">{{ cp.by_produit.length }}</span>
                  <span class="ct-mini-kpi__label">produits</span>
                </div>
                <div class="ct-mini-kpi">
                  <span class="ct-mini-kpi__val">{{ cp.by_famille.length }}</span>
                  <span class="ct-mini-kpi__label">familles</span>
                </div>
              }
              @if (activePeriods(); as ap) {
                <div class="ct-mini-kpi">
                  <span class="ct-mini-kpi__val">{{ ap }}<span class="ct-mini-kpi__sub">/12</span></span>
                  <span class="ct-mini-kpi__label">mois actifs</span>
                </div>
              }
            </div>
          </div>

          <div class="ct-detail__scroll">
            <!-- Charts grid: donut + history side by side -->
            <div class="ct-charts-grid">
              <!-- Donut -->
              <div class="ct-chart-card">
                <div class="ct-chart-card__title">
                  <i class="pi pi-chart-pie"></i> Répartition par famille
                </div>
                <div class="ct-chart-card__body">
                  @if (detailLoading()) {
                    <div class="ct-loading"><i class="pi pi-spin pi-spinner"></i></div>
                  } @else if (productSlices().length) {
                    <div class="ct-donut-wrap">
                      <app-d3-donut [data]="productSlices()" [centerUnit]="uniteShort()" />
                    </div>
                  } @else {
                    <div class="ct-empty-sm">Aucune donnée</div>
                  }
                </div>
              </div>

              <!-- History -->
              <div class="ct-chart-card">
                <div class="ct-chart-card__title">
                  <i class="pi pi-chart-bar"></i> Historique d'achats (12 mois)
                  <span class="ct-legend-inline">
                    <span class="ct-legend-inline__bar"></span> Achats
                    <span class="ct-legend-inline__missed"></span> Manqué
                  </span>
                </div>
                <div class="ct-chart-card__body">
                  @if (historyLoading()) {
                    <div class="ct-loading"><i class="pi pi-spin pi-spinner"></i></div>
                  } @else if (history().length) {
                    <app-d3-client-history [data]="history()" />
                  } @else {
                    <div class="ct-empty-sm">Aucun historique</div>
                  }
                </div>
              </div>
            </div>

            <!-- Insight cards row -->
            <div class="ct-insights">

              <!-- Top familles -->
              <div class="ct-insight-card">
                <div class="ct-insight-card__title">
                  <i class="pi pi-chart-bar"></i> Top familles
                </div>
                <div class="ct-insight-card__body">
                  @if (detailLoading()) {
                    <div class="ct-loading"><i class="pi pi-spin pi-spinner"></i></div>
                  } @else if (topFamilles().length) {
                    @for (f of topFamilles(); track f.nom) {
                      <div class="ct-bar-row">
                        <span class="ct-bar-row__label">{{ f.nom }}</span>
                        <div class="ct-bar-row__track">
                          <div class="ct-bar-row__fill" [style.width.%]="f.pct"
                               [style.background]="f.color"></div>
                        </div>
                        <span class="ct-bar-row__val">{{ f.total | number:'1.1-1' }}</span>
                      </div>
                    }
                  } @else {
                    <div class="ct-empty-sm">-</div>
                  }
                </div>
              </div>

              <!-- Clients à risque -->
              <div class="ct-insight-card">
                <div class="ct-insight-card__title">
                  <i class="pi pi-exclamation-triangle"></i> Clients à risque
                </div>
                <div class="ct-insight-card__body">
                  <div class="ct-risk-stat">
                    <span class="ct-risk-stat__val ct-risk-stat__val--danger">{{ manques().length }}</span>
                    <span class="ct-risk-stat__label">clients manqués ce mois</span>
                  </div>
                  @if (missedImpact(); as impact) {
                    <div class="ct-risk-stat">
                      <span class="ct-risk-stat__val ct-risk-stat__val--amber">{{ impact | number:'1.0-0' }}</span>
                      <span class="ct-risk-stat__label">DA d'impact estimé</span>
                    </div>
                  }
                  @if (decliningClients(); as dc) {
                    <div class="ct-risk-stat">
                      <span class="ct-risk-stat__val ct-risk-stat__val--amber">{{ dc }}</span>
                      <span class="ct-risk-stat__label">mois sans achat (ce client)</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Actions recommandées -->
              <div class="ct-insight-card">
                <div class="ct-insight-card__title">
                  <i class="pi pi-lightbulb"></i> Actions recommandées
                </div>
                <div class="ct-insight-card__body">
                  @for (a of recommendations(); track $index) {
                    <div class="ct-action">
                      <i class="pi" [class]="a.icon"></i>
                      <span>{{ a.text }}</span>
                    </div>
                  } @empty {
                    <div class="ct-empty-sm">Aucune recommandation</div>
                  }
                </div>
              </div>

            </div>

            <!-- Products table -->
            <div class="ct-chart-card">
              <div class="ct-chart-card__title">
                <i class="pi pi-list"></i> Détail produits
              </div>
              @if (detailLoading()) {
                <div class="ct-chart-card__body">
                  <div class="ct-loading"><i class="pi pi-spin pi-spinner"></i></div>
                </div>
              } @else if (clientProducts()?.by_produit?.length) {
                <div class="ct-prod-table">
                  @for (p of clientProducts()!.by_produit; track p.code) {
                    <div class="ct-prod-row">
                      <span class="ct-prod-row__dot" [style.background]="familleColor(p.famille)"></span>
                      <span class="ct-prod-row__name" [title]="p.nom">{{ p.nom }}</span>
                      <span class="ct-prod-row__fam">{{ p.famille }}</span>
                      <span class="ct-prod-row__val">{{ p.total | number:'1.2-2' }} {{ uniteShort() }}</span>
                    </div>
                  }
                </div>
              } @else {
                <div class="ct-chart-card__body">
                  <div class="ct-empty-sm">Aucun produit</div>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="ct-detail__placeholder">
            <i class="pi pi-user"></i>
            <span>Sélectionnez un client pour voir ses détails</span>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    :host { display: flex; flex: 1; overflow: hidden; }

    .ct-wrap { display: flex; flex: 1; overflow: hidden; }

    // ── Left list ───────────────────────────────────────────────
    .ct-list-panel {
      width: 320px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      border-right: var(--border-width) solid var(--surface-border);
    }

    .ct-search {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.6rem;
      padding: 0.55rem 0.75rem;
      background: var(--surface-ground);
      border: var(--border-width) solid var(--surface-border);
      border-radius: 0.5rem;
      transition: border-color 0.15s, box-shadow 0.15s;
      i { font-size: 0.8rem; color: var(--surface-400); }
      input {
        flex: 1; border: none; background: none; outline: none;
        font-size: 0.82rem; color: var(--text-color);
        &::placeholder { color: var(--surface-400); }
      }
      &:focus-within {
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.08);
        i { color: var(--primary-color); }
      }
    }

    .ct-list-scroll { flex: 1; overflow-y: auto; }

    .ct-client {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 0.6rem; cursor: pointer;
      transition: background 0.12s;
      &:hover { background: var(--surface-hover); }
      &--active {
        background: rgba(var(--primary-rgb), 0.06);
        .ct-client__avatar { border-color: var(--primary-color); }
      }
      &:not(:last-child) {
        border-bottom: var(--border-width) solid var(--surface-50, var(--surface-border));
      }

      &__avatar {
        flex-shrink: 0;
        width: 1.7rem; height: 1.7rem;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.62rem; font-weight: 700;
        background: rgba(var(--primary-rgb), 0.08);
        color: var(--primary-color);
        border: 1.5px solid transparent;
        transition: border-color 0.15s;
        &--missed {
          background: rgba(var(--color-warning-rgb), 0.08);
          color: var(--color-warning-dark);
        }
      }

      &__info { flex: 1; min-width: 0; }
      &__name {
        display: block; font-size: 0.68rem; font-weight: 600;
        color: var(--text-color); white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis;
        line-height: 1.3;
      }
      &__metrics {
        display: flex; align-items: center; gap: 0.35rem;
        margin-top: 0.1rem;
      }
      &__da {
        display: flex; align-items: center; gap: 0.15rem;
        font-size: 0.58rem; color: var(--text-color-secondary);
        i { font-size: 0.48rem; }
      }
      &__sep {
        width: 3px; height: 3px; border-radius: 50%;
        background: var(--surface-300);
        flex-shrink: 0;
      }
      &__qty {
        display: flex; align-items: center; gap: 0.15rem;
        font-size: 0.58rem; font-weight: 600; color: var(--primary-color);
        i { font-size: 0.48rem; }
      }
    }

    .ct-status {
      flex-shrink: 0;
      font-size: 0.72rem;
      color: var(--color-success-dark);
      &--missed { color: var(--color-warning-dark); }
    }

    .ct-badge {
      flex-shrink: 0; font-size: 0.56rem; font-weight: 700;
      padding: 0.08rem 0.35rem; border-radius: 999px;
      background: rgba(var(--color-success-rgb), 0.1); color: var(--color-success-dark);
      &--missed { background: rgba(var(--color-warning-rgb), 0.1); color: var(--color-warning-dark); }
      &--lg { font-size: 0.62rem; padding: 0.12rem 0.5rem; }
    }

    .ct-empty {
      padding: 2rem 0.75rem; text-align: center;
      font-size: 0.72rem; color: var(--text-color-secondary);
    }

    .ct-list-footer {
      flex-shrink: 0; display: flex; align-items: center;
      justify-content: center; gap: 0.8rem;
      padding: 0.4rem 0.6rem;
      border-top: var(--border-width) solid var(--surface-border);
      &__stat {
        display: flex; align-items: center; gap: 0.2rem;
        font-size: 0.6rem; font-weight: 600;
        i { font-size: 0.55rem; }
        &--green { color: var(--color-success-dark); }
        &--amber { color: var(--color-warning-dark); }
      }
    }

    // ── Avatar ─────────────────────────────────────────────────
    .ct-avatar {
      flex-shrink: 0;
      width: 2rem; height: 2rem;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: rgba(var(--primary-rgb), 0.1);
      color: var(--primary-color);
      font-size: 0.8rem;
      &--missed {
        background: rgba(var(--color-warning-rgb), 0.1);
        color: var(--color-warning-dark);
      }
    }

    // ── Right detail ────────────────────────────────────────────
    .ct-detail {
      flex: 1; min-width: 0; display: flex;
      flex-direction: column; overflow: hidden;

      &__header {
        flex-shrink: 0; display: flex; align-items: center;
        gap: 0.6rem; padding: 0.5rem 0.75rem;
        border-bottom: var(--border-width) solid var(--surface-border);
      }

      &__identity { min-width: 0; }
      &__name {
        margin: 0; font-size: 0.8rem;
        font-weight: var(--font-weight-bold); color: var(--text-color);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      &__code { font-size: 0.6rem; color: var(--text-color-secondary); }

      &__kpis {
        margin-left: auto; display: flex; gap: 0.75rem;
      }

      &__scroll {
        flex: 1; overflow-y: auto; padding: 0.6rem;
        display: flex; flex-direction: column; gap: 0.6rem;
      }

      &__placeholder {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 0.5rem;
        color: var(--surface-400);
        i { font-size: 1.8rem; }
        span { font-size: 0.75rem; }
      }
    }

    // ── Mini KPIs ───────────────────────────────────────────────
    .ct-mini-kpi {
      display: flex; flex-direction: column; align-items: center;
      padding: 0.2rem 0.5rem;
      &__val {
        font-size: 0.82rem; font-weight: 800; color: var(--text-color);
        line-height: 1.1;
      }
      &__sub { font-size: 0.6rem; font-weight: 600; color: var(--text-color-secondary); }
      &__label {
        font-size: 0.55rem; font-weight: 600; color: var(--text-color-secondary);
        text-transform: uppercase; letter-spacing: 0.03em;
      }
    }

    // ── Charts grid ─────────────────────────────────────────────
    .ct-charts-grid {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 0.6rem;
    }

    .ct-chart-card {
      border: var(--border-width) solid var(--surface-border);
      border-radius: 0.45rem;
      overflow: hidden;

      &__title {
        display: flex; align-items: center; gap: 0.3rem;
        padding: 0.35rem 0.6rem;
        font-size: 0.65rem; font-weight: 700;
        color: var(--text-color-secondary);
        border-bottom: var(--border-width) solid var(--surface-border);
        background: var(--surface-50, var(--surface-ground));
        i { font-size: 0.6rem; }
      }

      &__body {
        height: 160px;
        padding: 0.3rem;
      }
    }

    .ct-donut-wrap { width: 100%; height: 100%; }

    .ct-loading {
      display: flex; align-items: center; justify-content: center;
      height: 100%; font-size: 0.8rem; color: var(--text-color-secondary);
    }

    .ct-empty-sm {
      display: flex; align-items: center; justify-content: center;
      height: 100%; font-size: 0.7rem; color: var(--text-color-secondary);
    }

    // ── Legend inline ────────────────────────────────────────────
    .ct-legend-inline {
      margin-left: auto; display: flex; align-items: center;
      gap: 0.4rem; font-size: 0.55rem; font-weight: 600;
      color: var(--text-color-secondary);

      &__bar {
        width: 10px; height: 7px; border-radius: 2px;
        background: #3b82f6;
      }
      &__missed {
        width: 10px; height: 7px; border-radius: 2px;
        background: rgba(239, 68, 68, 0.08);
        border: 1.5px dashed #ef4444;
      }
    }

    // ── Insight cards ──────────────────────────────────────────
    .ct-insights {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.6rem;
    }

    .ct-insight-card {
      border: var(--border-width) solid var(--surface-border);
      border-radius: 0.45rem;
      overflow: hidden;

      &__title {
        display: flex; align-items: center; gap: 0.3rem;
        padding: 0.35rem 0.6rem;
        font-size: 0.62rem; font-weight: 700;
        color: var(--text-color-secondary);
        border-bottom: var(--border-width) solid var(--surface-border);
        background: var(--surface-50, var(--surface-ground));
        i { font-size: 0.58rem; }
      }

      &__body {
        padding: 0.4rem 0.6rem;
        display: flex; flex-direction: column; gap: 0.35rem;
      }
    }

    // Horizontal bars for top familles
    .ct-bar-row {
      display: flex; align-items: center; gap: 0.35rem;

      &__label {
        width: 4.5rem; flex-shrink: 0;
        font-size: 0.58rem; font-weight: 600; color: var(--text-color);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      &__track {
        flex: 1; height: 6px; border-radius: 3px;
        background: var(--surface-100, var(--surface-hover));
      }
      &__fill {
        height: 100%; border-radius: 3px;
        transition: width 0.3s ease;
      }
      &__val {
        width: 2.5rem; flex-shrink: 0; text-align: right;
        font-size: 0.56rem; font-weight: 600; color: var(--text-color-secondary);
      }
    }

    // Risk stats
    .ct-risk-stat {
      display: flex; align-items: baseline; gap: 0.3rem;
      &__val {
        font-size: 0.9rem; font-weight: 800; line-height: 1.2;
        &--danger { color: #dc2626; }
        &--amber { color: var(--color-warning-dark); }
      }
      &__label { font-size: 0.58rem; color: var(--text-color-secondary); }
    }

    // Action recommendations
    .ct-action {
      display: flex; align-items: flex-start; gap: 0.3rem;
      font-size: 0.6rem; color: var(--text-color);
      line-height: 1.4;
      i { font-size: 0.55rem; color: var(--primary-color); margin-top: 0.12rem; flex-shrink: 0; }
    }

    // ── Products table ──────────────────────────────────────────
    .ct-prod-table {
      max-height: 200px;
      overflow-y: auto;
    }

    .ct-prod-row {
      display: flex; align-items: center; gap: 0.35rem;
      padding: 0.3rem 0.6rem;
      border-bottom: var(--border-width) solid var(--surface-border);
      &:last-child { border-bottom: none; }

      &__dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
      &__name {
        flex: 1; font-size: 0.68rem; color: var(--text-color);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      &__fam {
        flex-shrink: 0; font-size: 0.55rem; font-weight: 600;
        color: var(--text-color-secondary); opacity: 0.7;
        padding: 0.05rem 0.3rem; border-radius: 999px;
        background: var(--surface-100, var(--surface-hover));
      }
      &__val {
        flex-shrink: 0; font-size: 0.65rem; font-weight: 600;
        color: var(--text-color-secondary); white-space: nowrap;
        min-width: 3.5rem; text-align: right;
      }
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
  readonly clientFilter   = input<'all' | 'servis' | 'manques'>('all');

  readonly search         = signal('');
  readonly selectedClient = signal<ClientListItem | null>(null);
  readonly clientProducts = signal<ClientProducts | null>(null);
  readonly history        = signal<HistoryPoint[]>([]);
  readonly detailLoading  = signal(false);
  readonly historyLoading = signal(false);

  readonly selectedCode = computed(() => this.selectedClient()?.code ?? null);
  readonly uniteShort   = computed(() => this.unite() === 'tonnes' ? 't' : 'packs');

  readonly allClients = computed<ClientListItem[]>(() => {
    const toItem = (c: ClientRow, missed: boolean): ClientListItem => ({
      ...c, missed,
      qty: c.by_famille.reduce((s, f) => s + f.total, 0),
    });
    const servisList = this.servis().map(c => toItem(c, false));
    const manquesList = this.manques().map(c => toItem(c, true));
    return [...servisList, ...manquesList];
  });

  readonly filteredClients = computed(() => {
    const filter = this.clientFilter();
    let list = this.allClients();
    if (filter === 'servis') list = list.filter(c => !c.missed);
    else if (filter === 'manques') list = list.filter(c => c.missed);
    const q = this.search().toLowerCase().trim();
    if (!q) return list;
    return list.filter(c => c.nom.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  });

  readonly activePeriods = computed(() => {
    const h = this.history();
    if (!h.length) return null;
    return h.filter(p => p.total > 0).length;
  });

  private readonly familleColorMap = computed(() => {
    const m = new Map<string, string>();
    this.globalFamilles().forEach((f, i) => m.set(f.nom, COLORS[i % COLORS.length]));
    return m;
  });

  readonly productSlices = computed<DonutSlice[]>(() => {
    const prods = this.clientProducts();
    if (!prods) return [];
    return prods.by_famille.map((f, i) => ({
      nom: f.nom,
      value: f.total,
      color: this.familleColorMap().get(f.nom) ?? COLORS[i % COLORS.length],
    }));
  });

  // ── Insight computeds ────────────────────────────────────────

  readonly topFamilles = computed(() => {
    const prods = this.clientProducts();
    if (!prods || !prods.by_famille.length) return [];
    const sorted = [...prods.by_famille].sort((a, b) => b.total - a.total).slice(0, 5);
    const max = sorted[0]?.total || 1;
    return sorted.map((f, i) => ({
      nom: f.nom,
      total: f.total,
      pct: (f.total / max) * 100,
      color: this.familleColorMap().get(f.nom) ?? COLORS[i % COLORS.length],
    }));
  });

  readonly missedImpact = computed(() => {
    const manques = this.manques();
    if (!manques.length) return null;
    return manques.reduce((sum, c) => sum + c.total, 0);
  });

  readonly decliningClients = computed(() => {
    const h = this.history();
    if (!h.length) return null;
    let streak = 0;
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i].total === 0) streak++;
      else break;
    }
    return streak > 0 ? streak : null;
  });

  readonly recommendations = computed<{ icon: string; text: string }[]>(() => {
    const recs: { icon: string; text: string }[] = [];
    const client = this.selectedClient();
    if (!client) return recs;

    const h = this.history();
    const declining = this.decliningClients();
    const prods = this.clientProducts();

    if (client.missed) {
      recs.push({ icon: 'pi-phone', text: 'Recontacter ce client rapidement pour éviter la perte.' });
    }

    if (declining && declining >= 2) {
      recs.push({ icon: 'pi-exclamation-triangle', text: `${declining} mois sans achat — planifier une visite prioritaire.` });
    }

    if (prods && prods.by_famille.length <= 2) {
      recs.push({ icon: 'pi-plus-circle', text: 'Diversifier l\'offre — ce client achète peu de familles.' });
    }

    const missedMonths = h.filter(p => p.missed > 0).length;
    if (missedMonths >= 3) {
      recs.push({ icon: 'pi-chart-line', text: `${missedMonths} opportunités manquées sur 12 mois.` });
    }

    if (!recs.length) {
      recs.push({ icon: 'pi-check-circle', text: 'Client en bonne santé — maintenir le suivi régulier.' });
    }

    return recs.slice(0, 3);
  });

  familleColor(nom: string): string {
    return this.familleColorMap().get(nom) ?? '#94a3b8';
  }

  selectClient(client: ClientListItem): void {
    if (this.selectedClient()?.code === client.code) return;
    this.selectedClient.set(client);
    this.loadClientDetail(client.code);
  }

  private loadClientDetail(code: string): void {
    this.detailLoading.set(true);
    this.historyLoading.set(true);
    this.clientProducts.set(null);
    this.history.set([]);

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

    let hParams = new HttpParams()
      .set('code_client', code)
      .set('commune', this.commune().name)
      .set('unite', this.unite());
    if (c && c !== 'ALL') hParams = hParams.set('canal', c);

    this.http.get<HistoryPoint[]>('/api/v1/geo/client-history', { params: hParams }).subscribe({
      next:  data => { this.history.set(data); this.historyLoading.set(false); },
      error: ()   => this.historyLoading.set(false),
    });
  }
}

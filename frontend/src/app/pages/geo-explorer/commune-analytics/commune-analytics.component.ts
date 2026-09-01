import {
  Component, inject, signal, computed, effect, untracked,
  DestroyRef, ElementRef, HostListener, OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ProduitsTabComponent } from '../commune-drawer/produits-tab.component';
import { D3HbarComponent, type HBarItem } from '../../analytics/d3-hbar.component';
import {
  DateRangePickerComponent,
  type DateRange,
} from '../../../shared/components/date-range-picker/date-range-picker.component';
import { DateHelper } from '../../../core/services/date.helper';
import { DistributorContextService } from '../../../core/services/distributor-context.service';
import { VentesService } from '../../../core/services/ventes.service';
import { type CanalFilter, CANAL_FILTER_OPTIONS } from '../../../core/constants/canal.constants';
import { MONTH_SHORT_FR } from '../../../core/constants/app.constants';

export interface CommuneAnalytics {
  kpis: { total: number; total_prev: number; pct_change: number | null; nb_clients: number; total_da: number; nb_fdv: number };
  by_famille:      { nom: string; total: number; packs?: number }[];
  by_famille_prev: { nom: string; total: number }[];
  by_produit:      { code: string; nom: string; famille: string; total: number; packs?: number; uom?: string }[];
  by_produit_prev: { code: string; nom: string; famille: string; total: number }[];
  by_fdv:      { code: string; nom: string; total: number; nb_clients: number }[];
  monthly_history: { month: string; total: number; nb_clients: number; nb_visits?: number }[];
  canal_split: { vd: number; vh: number };
  clients: {
    servis:  { code: string; nom: string; total: number; total_prev: number; commune: string; by_famille: { nom: string; total: number }[] }[];
    manques: { code: string; nom: string; total: number; total_prev: number; commune: string; by_famille: { nom: string; total: number }[] }[];
  };
}

interface ClientOption {
  code: string;
  nom: string;
  total: number;
  qty: number;
  pctChange: number | null;
  missed: boolean;
}

interface CommuneOption {
  code: number;
  name: string;
  wilaya: string;
  total: number;
  da: number;
  pct_change: number | null;
}

interface ProductDrilldown {
  communes: { name: string; wilaya: string; total: number; nb_clients: number }[];
  clients:  { code: string; nom: string; commune: string; total: number }[];
}

@Component({
  selector: 'app-commune-analytics',
  standalone: true,
  imports: [DecimalPipe, FormsModule, ProduitsTabComponent, DateRangePickerComponent, D3HbarComponent],
  templateUrl: './commune-analytics.component.html',
  styleUrl: './commune-analytics.component.scss',
})
export class CommuneAnalyticsComponent implements OnInit {
  private readonly http       = inject(HttpClient);
  private readonly router     = inject(Router);
  private readonly route      = inject(ActivatedRoute);
  private readonly el         = inject(ElementRef);
  private readonly dateHelper = inject(DateHelper);
  private readonly destroyRef = inject(DestroyRef);
  private readonly distContext = inject(DistributorContextService);
  private readonly ventesService = inject(VentesService);

  private lastDistId: number | null | undefined = undefined;

  constructor() {
    effect(() => {
      const dist = this.distContext.distributor();
      untracked(() => {
        const newId = dist?.id ?? null;
        if (this.lastDistId === undefined) {
          // First run — just record the ID, ngOnInit handles init
          this.lastDistId = newId;
          return;
        }
        if (newId === this.lastDistId) return; // no actual change
        this.lastDistId = newId;
        this.communeName.set('');
        this.selectedClient.set(null);
        this.clientAnalytics.set(null);
        this.analytics.set(null);
        this.drilldownProduct.set(null);
        this.drilldownData.set(null);
        this.loadCommunes();
        this.loadPeriodes();
        this.load();
      });
    });
  }

  readonly loading         = signal(false);
  readonly analytics       = signal<CommuneAnalytics | null>(null);
  readonly selectedClient  = signal<ClientOption | null>(null);
  readonly clientAnalytics = signal<CommuneAnalytics | null>(null);

  readonly openDropdown = signal<'servis' | 'manques' | null>(null);
  readonly clientSearch = signal('');

  readonly drilldownProduct = signal<{ code: string; nom: string } | null>(null);
  readonly drilldownData    = signal<ProductDrilldown | null>(null);
  readonly drilldownLoading = signal(false);
  readonly drilldownPos      = signal({ x: 0, y: 0 });
  readonly drilldownSize     = signal({ w: 720 });

  readonly drilldownCommuneBars = computed<HBarItem[]>(() =>
    (this.drilldownData()?.communes ?? []).map(c => ({
      name: c.name, value: c.total,
      subtitle: `${c.nb_clients} client${c.nb_clients > 1 ? 's' : ''}`,
    }))
  );

  readonly drilldownClientBars = computed<HBarItem[]>(() =>
    (this.drilldownData()?.clients ?? []).map(c => ({
      name: c.nom, value: c.total,
      subtitle: c.commune,
    }))
  );

  readonly drilldownTabbed = computed(() => this.drilldownSize().w < 560);

  readonly drilldownTab    = signal<'communes' | 'clients'>('communes');
  private dragging           = false;
  private dragOffset         = { x: 0, y: 0 };
  private resizing           = false;
  private resizeStartX       = 0;
  private resizeStartW       = 0;

  readonly communeName   = signal('');
  readonly dateFrom      = signal('');
  readonly dateTo        = signal('');
  readonly canal         = signal<CanalFilter>('ALL');
  readonly periodes      = signal<string[]>([]);

  readonly communes       = signal<CommuneOption[]>([]);
  readonly communeDropdownOpen = signal(false);
  readonly communeSearch  = signal('');

  readonly filteredCommunes = computed(() => {
    const q = this.communeSearch().toLowerCase().trim();
    const list = this.communes();
    return q ? list.filter(c => c.name.toLowerCase().includes(q)) : list;
  });

  readonly canals = CANAL_FILTER_OPTIONS;

  readonly customRangeOpen = signal(false);

  private readonly MONTH_SHORT = MONTH_SHORT_FR;

  readonly monthChips = computed(() => {
    const periodes = new Set(this.periodes());
    const now = new Date();

    // Use commune monthly_history (same data as the Historique bar chart) for trends
    const history = this.activeData()?.monthly_history ?? [];
    const histMap = new Map(history.map(m => [m.month, m.total]));

    const chips: { period: string; label: string; hasData: boolean; trend: 'up' | 'down' | null }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = this.dateHelper.getPeriodFromDate(d);
      const total = histMap.get(period) ?? 0;
      const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const prevPeriod = this.dateHelper.getPeriodFromDate(prev);
      const prevTotal = histMap.get(prevPeriod) ?? 0;
      let trend: 'up' | 'down' | null = null;
      if (total > 0 && prevTotal > 0) {
        trend = total >= prevTotal ? 'up' : 'down';
      }
      chips.push({ period, label: this.MONTH_SHORT[d.getMonth()], hasData: periodes.has(period), trend });
    }
    return chips;
  });

  readonly activeMonth = computed(() => {
    const from = this.dateFrom();
    const to = this.dateTo();
    if (!from || !to) return null;
    const period = from.slice(0, 7);
    const expectedFrom = this.dateHelper.getFirstDayOfMonth(period);
    const expectedTo = this.dateHelper.getLastDayOfMonth(period);
    return from === expectedFrom && to === expectedTo ? period : null;
  });

  readonly customRangeLabel = computed(() => {
    if (this.activeMonth()) return null;
    const from = this.dateFrom();
    const to = this.dateTo();
    if (!from || !to) return null;
    const fmtDate = (s: string) => {
      const [y, m, d] = s.split('-');
      return `${d}/${m}`;
    };
    return `${fmtDate(from)} - ${fmtDate(to)}`;
  });

  readonly uniteShort = 't';

  readonly pctChange = computed(() => {
    const a = this.selectedClient() ? this.clientAnalytics() : this.analytics();
    return a?.kpis.pct_change ?? null;
  });

  readonly activeData = computed(() =>
    this.selectedClient() ? this.clientAnalytics() : this.analytics()
  );

  readonly nbServis  = computed(() => this.analytics()?.clients.servis.length ?? 0);
  readonly nbManques = computed(() => this.analytics()?.clients.manques.length ?? 0);
  readonly nbFdv     = computed(() => this.activeData()?.kpis.nb_fdv ?? 0);

  readonly servisTotal = computed(() => {
    const a = this.analytics();
    if (!a) return 0;
    return a.clients.servis.reduce((s, c) => s + c.by_famille.reduce((s2, f) => s2 + f.total, 0), 0);
  });

  readonly manquesTotal = computed(() => {
    const a = this.analytics();
    if (!a) return 0;
    return a.clients.manques.reduce((s, c) => s + c.by_famille.reduce((s2, f) => s2 + f.total, 0), 0);
  });

  readonly vdPct = computed(() => {
    const d = this.activeData();
    if (!d) return 0;
    const total = d.canal_split.vd + d.canal_split.vh;
    return total > 0 ? Math.round((d.canal_split.vd / total) * 100) : 0;
  });

  readonly servisList = computed<ClientOption[]>(() => {
    const a = this.analytics();
    if (!a) return [];
    return a.clients.servis.map(c => ({
      code: c.code, nom: c.nom, total: c.total,
      qty: c.by_famille.reduce((s, f) => s + f.total, 0),
      pctChange: c.total_prev > 0 ? Math.round(((c.total - c.total_prev) / c.total_prev) * 100) : null,
      missed: false,
    }));
  });

  readonly manquesList = computed<ClientOption[]>(() => {
    const a = this.analytics();
    if (!a) return [];
    return a.clients.manques.map(c => ({
      code: c.code, nom: c.nom, total: c.total,
      qty: c.by_famille.reduce((s, f) => s + f.total, 0),
      pctChange: -100,
      missed: true,
    }));
  });

  readonly filteredDropdownClients = computed<ClientOption[]>(() => {
    const which = this.openDropdown();
    if (!which) return [];
    const list = which === 'servis' ? this.servisList() : this.manquesList();
    const q = this.clientSearch().toLowerCase().trim();
    return q ? list.filter(c => c.nom.toLowerCase().includes(q)) : list;
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    const commune = qp['commune'] ?? '';
    const from    = qp['from'] ?? '';
    const to      = qp['to'] ?? '';
    const canal   = (qp['canal'] ?? 'ALL') as CanalFilter;

    this.canal.set(canal);

    if (commune) {
      this.communeName.set(commune);
    }

    if (from && to) {
      this.dateFrom.set(from);
      this.dateTo.set(to);
      this.loadPeriodes();
      this.loadCommunes();
      this.load();
    } else {
      this.ventesService.getPeriodes()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(periodes => {
          this.periodes.set(periodes);
          const latest = periodes.length ? periodes[0] : this.dateHelper.getPeriodFromDate(new Date());
          this.dateFrom.set(this.dateHelper.getFirstDayOfMonth(latest));
          this.dateTo.set(this.dateHelper.getLastDayOfMonth(latest));
          this.loadCommunes();
          this.load();
        });
    }
  }

  setCanal(c: CanalFilter): void {
    this.canal.set(c);
    this.updateUrl();
    this.load();
  }

  pickMonth(period: string): void {
    this.dateFrom.set(this.dateHelper.getFirstDayOfMonth(period));
    this.dateTo.set(this.dateHelper.getLastDayOfMonth(period));
    this.customRangeOpen.set(false);
    this.updateUrl();
    this.loadCommunes();
    this.load();
  }

  toggleCustomRange(): void {
    this.customRangeOpen.set(!this.customRangeOpen());
  }

  onRangeChange(range: DateRange): void {
    this.dateFrom.set(range.from);
    this.dateTo.set(range.to);
    this.customRangeOpen.set(false);
    this.updateUrl();
    this.loadCommunes();
    this.load();
  }

  pickCommune(commune: CommuneOption): void {
    this.communeName.set(commune.name);
    this.communeDropdownOpen.set(false);
    this.communeSearch.set('');
    this.selectedClient.set(null);
    this.clientAnalytics.set(null);
    this.updateUrl();
    this.load();
  }

  clearCommune(): void {
    this.communeName.set('');
    this.communeDropdownOpen.set(false);
    this.communeSearch.set('');
    this.selectedClient.set(null);
    this.clientAnalytics.set(null);
    this.updateUrl();
    this.load();
  }

  toggleCommuneDropdown(): void {
    this.communeDropdownOpen.set(!this.communeDropdownOpen());
    this.communeSearch.set('');
  }

  toggleDropdown(which: 'servis' | 'manques'): void {
    this.openDropdown.set(this.openDropdown() === which ? null : which);
    this.clientSearch.set('');
  }

  pickClient(client: ClientOption): void {
    this.openDropdown.set(null);
    this.clientSearch.set('');
    this.selectClient(client);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (this.communeDropdownOpen()) {
      const communeArea = this.el.nativeElement.querySelector('.ca-commune-picker');
      if (communeArea && !communeArea.contains(e.target as Node)) {
        this.communeDropdownOpen.set(false);
        this.communeSearch.set('');
      }
    }
    if (this.openDropdown()) {
      const kpiArea = this.el.nativeElement.querySelector('.cd-kpis');
      if (kpiArea && !kpiArea.contains(e.target as Node)) {
        this.openDropdown.set(null);
        this.clientSearch.set('');
      }
    }
    if (this.customRangeOpen()) {
      const customArea = this.el.nativeElement.querySelector('.ca-header__custom');
      if (customArea && !customArea.contains(e.target as Node)) {
        this.customRangeOpen.set(false);
      }
    }
  }

  selectClient(client: ClientOption | null): void {
    this.selectedClient.set(client);
    if (client) {
      this.loadClient(client.code);
    } else {
      this.clientAnalytics.set(null);
    }
  }

  onProductDrilldown(product: { code: string; nom: string } | null): void {
    if (!product) {
      this.drilldownProduct.set(null);
      this.drilldownData.set(null);
      return;
    }
    // Position popover over the "Par famille" chart panel on first open
    if (!this.drilldownProduct()) {
      const chartEl = this.el.nativeElement.querySelector('.ca-content');
      if (chartEl) {
        const rect = chartEl.getBoundingClientRect();
        this.drilldownPos.set({
          x: Math.max(16, rect.left + 8),
          y: Math.max(16, rect.top + 4),
        });
      } else {
        this.drilldownPos.set({ x: 16, y: 60 });
      }
    }
    this.drilldownProduct.set(product);
    if (!this.drilldownData()) this.drilldownLoading.set(true);

    let params = new HttpParams()
      .set('code_produit', product.code)
      .set('date_from', this.dateFrom())
      .set('date_to', this.dateTo())
      .set('unite', 'tonnes');
    if (this.canal() !== 'ALL') params = params.set('canal', this.canal());

    this.http.get<ProductDrilldown>('/api/v1/geo/product-drilldown', { params })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => { this.drilldownData.set(data); this.drilldownLoading.set(false); },
        error: () => { this.drilldownLoading.set(false); },
      });
  }

  closeDrilldown(): void {
    this.drilldownProduct.set(null);
    this.drilldownData.set(null);
  }

  onDrilldownCommuneClick(item: HBarItem | null): void {
    if (!item) return;
    this.communeName.set(item.name);
    this.selectedClient.set(null);
    this.clientAnalytics.set(null);
    this.updateUrl();
    this.load();
  }

  onDrilldownClientClick(item: HBarItem | null): void {
    if (!item) return;
    const dd = this.drilldownData();
    const client = dd?.clients.find(c => c.nom === item.name);
    if (!client) return;
    const clientCommune = client.commune;
    if (clientCommune && clientCommune !== this.communeName()) {
      this.communeName.set(clientCommune);
      this.updateUrl();
      this.load();
    }
    this.selectClient({ code: client.code, nom: client.nom, total: 0, qty: 0, pctChange: null, missed: false });
  }

  startDrag(e: MouseEvent): void {
    this.dragging = true;
    const pos = this.drilldownPos();
    this.dragOffset = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }

  startResize(e: MouseEvent): void {
    this.resizing = true;
    this.resizeStartX = e.clientX;
    this.resizeStartW = this.drilldownSize().w;
    e.preventDefault();
    e.stopPropagation();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.dragging) {
      this.drilldownPos.set({
        x: e.clientX - this.dragOffset.x,
        y: e.clientY - this.dragOffset.y,
      });
    } else if (this.resizing) {
      this.drilldownSize.set({
        w: Math.max(340, this.resizeStartW + (e.clientX - this.resizeStartX)),
      });
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.dragging = false;
    this.resizing = false;
  }

  goBack(): void {
    this.router.navigate(['/carte'], {
      queryParams: {
        from: this.dateFrom(),
        to: this.dateTo(),
        canal: this.canal(),
      },
    });
  }

  private updateUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        commune: this.communeName() || null,
        from: this.dateFrom(),
        to: this.dateTo(),
        canal: this.canal(),
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private loadPeriodes(): void {
    this.ventesService.getPeriodes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: periodes => this.periodes.set(periodes) });
  }

  private loadCommunes(): void {
    const params = new HttpParams()
      .set('date_from', this.dateFrom())
      .set('date_to', this.dateTo());

    this.http.get<CommuneOption[]>('/api/v1/geo/distributor-communes', { params })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: communes => this.communes.set(communes),
      });
  }

  private buildAnalyticsParams(extra?: Record<string, string>): HttpParams | null {
    const commune = this.communeName();
    const from = this.dateFrom();
    const to = this.dateTo();
    if (!from || !to) return null;

    let params = new HttpParams()
      .set('date_from', from)
      .set('date_to', to)
      .set('unite', 'tonnes');
    if (commune) params = params.set('commune', commune);
    if (this.canal() !== 'ALL') params = params.set('canal', this.canal());
    if (extra) {
      for (const [k, v] of Object.entries(extra)) params = params.set(k, v);
    }
    return params;
  }

  private load(): void {
    const params = this.buildAnalyticsParams();
    if (!params) return;

    if (!this.analytics()) this.loading.set(true);

    this.http.get<CommuneAnalytics>('/api/v1/geo/commune-analytics', { params })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next:  data => { this.analytics.set(data); this.loading.set(false); },
        error: ()   => this.loading.set(false),
      });
  }

  private loadClient(code: string): void {
    const params = this.buildAnalyticsParams({ code_client: code });
    if (!params) return;

    this.http.get<CommuneAnalytics>('/api/v1/geo/commune-analytics', { params })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: data => this.clientAnalytics.set(data) });
  }
}

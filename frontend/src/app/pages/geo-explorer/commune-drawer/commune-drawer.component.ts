import {
  Component, inject, input, output, signal, computed, effect, untracked,
  ElementRef, HostListener,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ProduitsTabComponent } from './produits-tab.component';
import {
  DateRangePickerComponent,
  type DateRange,
} from '../../../shared/components/date-range-picker/date-range-picker.component';

export interface ClientOption {
  code: string;
  nom: string;
  total: number;
  qty: number;
  pctChange: number | null;
  missed: boolean;
}

export interface CommuneAnalytics {
  kpis: { total: number; total_prev: number; pct_change: number | null; nb_clients: number };
  by_famille:      { nom: string; total: number; packs?: number }[];
  by_famille_prev: { nom: string; total: number }[];
  by_produit:      { code: string; nom: string; famille: string; total: number; packs?: number }[];
  by_produit_prev: { code: string; nom: string; famille: string; total: number }[];
  by_fdv:      { code: string; nom: string; total: number; nb_clients: number }[];
  monthly_history: { month: string; total: number; nb_clients: number; nb_visits?: number }[];
  canal_split: { vd: number; vh: number };
  clients: {
    servis:  { code: string; nom: string; total: number; total_prev: number; by_famille: { nom: string; total: number }[] }[];
    manques: { code: string; nom: string; total: number; total_prev: number; by_famille: { nom: string; total: number }[] }[];
  };
}

@Component({
  selector: 'app-commune-drawer',
  standalone: true,
  imports: [DecimalPipe, FormsModule, ProduitsTabComponent, DateRangePickerComponent],
  host: { '[class.is-open]': 'isOpen()' },
  templateUrl: './commune-drawer.component.html',
  styleUrl: './commune-drawer.component.scss',
})
export class CommuneDrawerComponent {
  private readonly http = inject(HttpClient);
  private readonly el   = inject(ElementRef);

  readonly commune  = input<{ code: number; name: string } | null>(null);
  readonly dateFrom = input('');
  readonly dateTo   = input('');
  readonly canal    = input('');
  readonly periodes = input<string[]>([]);
  readonly canalOptions = input<{ value: string; label: string }[]>([]);
  readonly closed      = output<void>();
  readonly canalChange = output<string>();
  readonly rangeChange = output<DateRange>();

  readonly isOpen          = computed(() => this.commune() !== null);
  readonly loading         = signal(false);
  readonly analytics       = signal<CommuneAnalytics | null>(null);
  readonly selectedClient  = signal<ClientOption | null>(null);

  // When a client is selected, we load filtered data into this
  readonly clientAnalytics = signal<CommuneAnalytics | null>(null);

  // Dropdown state for KPI cards
  readonly openDropdown = signal<'servis' | 'manques' | null>(null);
  readonly clientSearch = signal('');

  readonly uniteShort = 't';
  readonly pctChange  = computed(() => {
    const a = this.selectedClient() ? this.clientAnalytics() : this.analytics();
    return a?.kpis.pct_change ?? null;
  });

  // The active data source — filtered or commune-level
  readonly activeData = computed(() =>
    this.selectedClient() ? this.clientAnalytics() : this.analytics()
  );

  readonly nbServis  = computed(() => this.analytics()?.clients.servis.length ?? 0);
  readonly nbManques = computed(() => this.analytics()?.clients.manques.length ?? 0);

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
    if (!this.openDropdown()) return;
    const kpiArea = this.el.nativeElement.querySelector('.cd-kpis');
    if (kpiArea && !kpiArea.contains(e.target as Node)) {
      this.openDropdown.set(null);
      this.clientSearch.set('');
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

  constructor() {
    effect(() => {
      const c    = this.commune();
      const from = this.dateFrom();
      const to   = this.dateTo();
      const canal = this.canal();
      untracked(() => {
        if (!c || !from || !to) { this.analytics.set(null); return; }
        this.selectedClient.set(null);
        this.clientAnalytics.set(null);
        this.openDropdown.set(null);
        this.clientSearch.set('');
        this.load(c.name, from, to, canal);
      });
    });
  }

  close(): void { this.closed.emit(); }

  private load(commune: string, from: string, to: string, canal: string): void {
    if (!this.analytics()) this.loading.set(true);

    let params = new HttpParams()
      .set('commune', commune)
      .set('date_from', from)
      .set('date_to', to)
      .set('unite', 'tonnes');
    if (canal && canal !== 'ALL') params = params.set('canal', canal);

    this.http.get<CommuneAnalytics>('/api/v1/geo/commune-analytics', { params }).subscribe({
      next:  data => { this.analytics.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  private loadClient(code: string): void {
    const c = this.commune();
    const from = this.dateFrom();
    const to = this.dateTo();
    const canal = this.canal();
    if (!c || !from || !to) return;

    let params = new HttpParams()
      .set('commune', c.name)
      .set('date_from', from)
      .set('date_to', to)
      .set('unite', 'tonnes')
      .set('code_client', code);
    if (canal && canal !== 'ALL') params = params.set('canal', canal);

    this.http.get<CommuneAnalytics>('/api/v1/geo/commune-analytics', { params }).subscribe({
      next: data => this.clientAnalytics.set(data),
    });
  }
}

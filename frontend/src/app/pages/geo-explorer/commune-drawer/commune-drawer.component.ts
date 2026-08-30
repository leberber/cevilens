import {
  Component, inject, input, output, signal, computed, effect, untracked,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ProduitsTabComponent } from './produits-tab.component';
import { ClientsTabComponent } from './clients-tab.component';
import {
  DateRangePickerComponent,
  type DateRange,
} from '../../../shared/components/date-range-picker/date-range-picker.component';

export interface CommuneAnalytics {
  kpis: { total: number; total_prev: number; pct_change: number | null; nb_clients: number };
  by_famille:  { nom: string; total: number }[];
  by_produit:  { code: string; nom: string; famille: string; total: number }[];
  by_fdv:      { code: string; nom: string; total: number; nb_clients: number }[];
  canal_split: { vd: number; vh: number };
  clients: {
    servis:  { code: string; nom: string; total: number; by_famille: { nom: string; total: number }[] }[];
    manques: { code: string; nom: string; total: number; by_famille: { nom: string; total: number }[] }[];
  };
}

@Component({
  selector: 'app-commune-drawer',
  standalone: true,
  imports: [DecimalPipe, ProduitsTabComponent, ClientsTabComponent, DateRangePickerComponent],
  host: { '[class.is-open]': 'isOpen()' },
  templateUrl: './commune-drawer.component.html',
  styleUrl: './commune-drawer.component.scss',
})
export class CommuneDrawerComponent {
  private readonly http = inject(HttpClient);

  readonly commune  = input<{ code: number; name: string } | null>(null);
  readonly dateFrom = input('');
  readonly dateTo   = input('');
  readonly canal    = input('');
  readonly unite    = input('tonnes');
  readonly periodes = input<string[]>([]);
  readonly canalOptions = input<{ value: string; label: string }[]>([]);
  readonly uniteOptions = input<{ value: string; label: string }[]>([]);
  readonly closed      = output<void>();
  readonly canalChange = output<string>();
  readonly uniteChange = output<string>();
  readonly rangeChange = output<DateRange>();

  readonly isOpen    = computed(() => this.commune() !== null);
  readonly loading   = signal(false);
  readonly analytics = signal<CommuneAnalytics | null>(null);

  readonly uniteShort = computed(() => this.unite() === 'tonnes' ? 't' : 'packs');
  readonly pctChange  = computed(() => this.analytics()?.kpis.pct_change ?? null);

  constructor() {
    effect(() => {
      const c    = this.commune();
      const from = this.dateFrom();
      const to   = this.dateTo();
      const canal = this.canal();
      const unite = this.unite();
      untracked(() => {
        if (!c || !from || !to) { this.analytics.set(null); return; }
        this.load(c.name, from, to, canal, unite);
      });
    });
  }

  close(): void { this.closed.emit(); }

  private load(commune: string, from: string, to: string, canal: string, unite: string): void {
    if (!this.analytics()) this.loading.set(true);

    let params = new HttpParams()
      .set('commune', commune)
      .set('date_from', from)
      .set('date_to', to)
      .set('unite', unite);
    if (canal && canal !== 'ALL') params = params.set('canal', canal);

    this.http.get<CommuneAnalytics>('/api/v1/geo/commune-analytics', { params }).subscribe({
      next:  data => { this.analytics.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }
}

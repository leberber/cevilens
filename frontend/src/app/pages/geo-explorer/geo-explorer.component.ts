import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PeriodService } from '../../core/services/period.service';
import { LoadingManager } from '../../core/services/loading-manager.service';
import { CommuneMapComponent, type CommuneDatum } from '../analytics/commune-map.component';

interface GeoData {
  periodes: string[];
  by_produit: { nom: string; code: string; total: number }[];
  kpis: {
    total_ventes: number;
    nb_fdvs: number;
    top_famille: { nom: string; total: number } | null;
    top_fdv: { nom: string; code: string; total: number } | null;
  };
}

interface LocationDatum {
  code: number;
  name: string;
  wilaya: string;
  total: number;
}

type Canal = 'VD' | 'VH';
type Unite = 'packs' | 'tonnes';

@Component({
  selector: 'app-geo-explorer',
  standalone: true,
  imports: [DecimalPipe, CommuneMapComponent],
  templateUrl: './geo-explorer.component.html',
  styleUrl: './geo-explorer.component.scss',
})
export class GeoExplorerComponent implements OnInit {
  private readonly http            = inject(HttpClient);
  private readonly loadingManager  = inject(LoadingManager);
  private readonly periodService   = inject(PeriodService);

  readonly loading         = signal(true);
  readonly data            = signal<GeoData | null>(null);
  readonly mapLocations    = signal<LocationDatum[]>([]);
  readonly canal           = signal<Canal>('VD');
  readonly unite           = signal<Unite>('tonnes');
  readonly periode         = signal('');
  readonly periodes        = signal<string[]>([]);
  readonly selectedProduit = signal<{ nom: string; code: string } | null>(null);
  readonly commune         = signal<{ code: number; name: string } | null>(null);
  readonly search          = signal('');
  readonly panelOpen       = signal(true);

  readonly canals: { value: Canal; label: string }[] = [
    { value: 'VD', label: 'VD' },
    { value: 'VH', label: 'VH' },
  ];

  readonly unites: { value: Unite; label: string }[] = [
    { value: 'packs',  label: 'Packs'  },
    { value: 'tonnes', label: 'Tonnes' },
  ];

  readonly filteredProduits = computed(() => {
    const q    = this.search().toLowerCase().trim();
    const list = this.data()?.by_produit ?? [];
    if (!q) return list;
    return list.filter(p => p.nom.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
  });

  readonly maxProduitTotal = computed(() =>
    Math.max(...(this.data()?.by_produit ?? []).map(p => p.total), 1)
  );

  readonly mapData = computed<CommuneDatum[]>(() =>
    this.mapLocations().map(r => ({ code: r.code, total: r.total }))
  );

  readonly activeCommuneCount = computed(() =>
    this.mapLocations().filter(r => r.total > 0).length
  );

  readonly uniteLabel = computed(() => this.unite() === 'tonnes' ? 'tonnes' : 'packs');

  readonly communeTotal = computed(() => {
    const comm = this.commune();
    if (!comm) return null;
    return this.mapLocations().find(r => r.code === comm.code) ?? null;
  });

  ngOnInit(): void {
    const now = new Date();
    this.periode.set(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    this.load();
  }

  setCanal(c: Canal): void {
    if (this.canal() === c) return;
    this.canal.set(c);
    this.commune.set(null);
    this.load();
  }

  setUnite(u: Unite): void {
    if (this.unite() === u) return;
    this.unite.set(u);
    this.load();
  }

  setPeriode(p: string): void {
    this.periode.set(p);
    this.load();
  }

  selectProduit(p: { nom: string; code: string }): void {
    const cur = this.selectedProduit();
    this.selectedProduit.set(cur?.code === p.code ? null : p);
    this.commune.set(null);
    this.load();
  }

  clearProduit(): void {
    this.selectedProduit.set(null);
    this.commune.set(null);
    this.load();
  }

  setCommune(evt: { code: number; name: string } | null): void {
    this.commune.set(evt);
  }

  clearCommune(): void {
    this.commune.set(null);
  }

  togglePanel(): void {
    this.panelOpen.update(v => !v);
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  barWidth(total: number): string {
    return `${Math.round((total / this.maxProduitTotal()) * 100)}%`;
  }

  formatPeriode(p: string): string {
    return this.periodService.format(p);
  }

  private load(): void {
    let params = new HttpParams()
      .set('annee_mois', this.periode())
      .set('canal', this.canal())
      .set('unite', this.unite());

    const prod = this.selectedProduit();
    if (prod) params = params.set('produit', prod.code);

    this.loadingManager.load(
      this.loading,
      this.http.get<GeoData>('/api/v1/prevendeur/admin/analytics', { params }),
      d => {
        this.data.set(d);
        if (d.periodes.length) {
          this.periodes.set(d.periodes);
          if (!d.periodes.includes(this.periode())) {
            this.periode.set(d.periodes[0]);
            this.load();
            return;
          }
        }
      }
    );

    this.http.get<LocationDatum[]>('/api/v1/geo/by-location', { params })
      .subscribe({ next: locations => this.mapLocations.set(locations) });
  }
}

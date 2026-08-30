import { Component, inject, signal, computed, OnInit, effect, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { DistributorContextService } from '../../core/services/distributor-context.service';
import { RoleService } from '../../core/services/role.service';
import { PeriodService } from '../../core/services/period.service';
import { LoadingManager } from '../../core/services/loading-manager.service';
import { CommuneMapComponent, type CommuneDatum } from '../analytics/commune-map.component';
import {
  ProductTreeComponent,
  type FamilleNode,
  type TreeSelection,
} from '../../shared/components/product-tree/product-tree.component';

interface GeoKpis {
  periodes: string[];
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
  imports: [DecimalPipe, CommuneMapComponent, ProductTreeComponent],
  templateUrl: './geo-explorer.component.html',
  styleUrl: './geo-explorer.component.scss',
})
export class GeoExplorerComponent implements OnInit {
  private readonly http           = inject(HttpClient);
  private readonly loadingManager = inject(LoadingManager);
  private readonly periodService  = inject(PeriodService);
  private readonly distContext    = inject(DistributorContextService);
  private readonly roleService    = inject(RoleService);

  readonly loading      = signal(true);
  readonly treeLoading  = signal(false);
  readonly kpis         = signal<GeoKpis | null>(null);
  readonly treeData     = signal<FamilleNode[]>([]);
  readonly mapLocations = signal<LocationDatum[]>([]);

  readonly canal        = signal<Canal>('VD');
  readonly unite        = signal<Unite>('tonnes');
  readonly periode      = signal('');
  readonly periodes     = signal<string[]>([]);
  readonly selection    = signal<TreeSelection>(null);
  readonly commune      = signal<{ code: number; name: string } | null>(null);
  readonly sidebarWidth = signal(350);
  readonly panelOpen    = computed(() => this.sidebarWidth() > 0);

  private readonly DEFAULT_WIDTH    = 350;
  private readonly MIN_WIDTH        = 180;
  private readonly COLLAPSE_SNAP    = 80;

  readonly canals: { value: Canal; label: string }[] = [
    { value: 'VD', label: 'VD' },
    { value: 'VH', label: 'VH' },
  ];

  readonly unites: { value: Unite; label: string }[] = [
    { value: 'packs',  label: 'Packs'  },
    { value: 'tonnes', label: 'Tonnes' },
  ];

  readonly mapData = computed<CommuneDatum[]>(() =>
    this.mapLocations().map(r => ({ code: r.code, total: r.total }))
  );

  readonly activeCommuneCount = computed(() =>
    this.mapLocations().filter(r => r.total > 0).length
  );

  readonly communeTotal = computed(() => {
    const c = this.commune();
    if (!c) return null;
    return this.mapLocations().find(r => r.code === c.code) ?? null;
  });

  readonly uniteLabel = computed(() => this.unite() === 'tonnes' ? 'tonnes' : 'packs');

  readonly selectionLabel = computed(() => {
    const s = this.selection();
    if (!s) return null;
    if (s.type === 'famille')      return { icon: 'pi-th-large', text: s.nom };
    if (s.type === 'sous_famille') return { icon: 'pi-sitemap',  text: s.nom };
    return { icon: 'pi-box', text: s.nom };
  });

  constructor() {
    effect(() => {
      this.distContext.selectedDistributorId(); // track distributor changes
      if (untracked(() => this.periode())) this.load();
    });
  }

  ngOnInit(): void {
    const now = new Date();
    this.periode.set(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    if (this.roleService.isPlatformAdmin() && !this.distContext.selectedDistributorId()) return;
    this.load();
  }

  setCanal(c: Canal): void {
    if (this.canal() === c) return;
    this.canal.set(c);
    this.commune.set(null);
    this.selection.set(null);
    this.load();
  }

  setUnite(u: Unite): void {
    if (this.unite() === u) return;
    this.unite.set(u);
    this.load();
  }

  setPeriode(p: string): void {
    this.periode.set(p);
    this.commune.set(null);
    this.selection.set(null);
    this.load();
  }

  onSelectionChange(sel: TreeSelection): void {
    this.selection.set(sel);
    this.loadMap();
  }

  clearSelection(): void {
    this.selection.set(null);
    this.loadMap();
  }

  setCommune(evt: { code: number; name: string } | null): void {
    this.commune.set(evt);
    this.loadTree();
  }

  clearCommune(): void {
    this.commune.set(null);
    this.loadTree();
  }

  startResize(event: MouseEvent): void {
    const startX     = event.clientX;
    const startWidth = this.sidebarWidth();
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX);
      this.sidebarWidth.set(newWidth < this.COLLAPSE_SNAP ? 0 : Math.min(Math.max(newWidth, this.MIN_WIDTH), 600));
    };

    const onUp = () => {
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      // Snap: if just above collapse threshold, expand to minimum
      if (this.sidebarWidth() > 0 && this.sidebarWidth() < this.MIN_WIDTH) {
        this.sidebarWidth.set(this.MIN_WIDTH);
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    event.preventDefault();
  }

  formatPeriode(p: string): string {
    return this.periodService.format(p);
  }

  // ── Load methods ───────────────────────────────────────────────────────────

  /** Full reload: KPIs + tree + map (on period/canal/unite change). */
  private load(): void {
    const params = this.baseParams();

    this.loadingManager.load(
      this.loading,
      this.http.get<GeoKpis>('/api/v1/prevendeur/admin/analytics', { params }),
      d => {
        this.kpis.set(d);
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

    this.http.get<FamilleNode[]>('/api/v1/geo/product-tree', { params })
      .subscribe({ next: tree => this.treeData.set(tree) });

    this.http.get<LocationDatum[]>('/api/v1/geo/by-location', { params })
      .subscribe({ next: locs => this.mapLocations.set(locs) });
  }

  /** Reload tree only — when commune selection changes. */
  private loadTree(): void {
    this.treeLoading.set(true);
    let params = this.baseParams();
    const c = this.commune();
    if (c) params = params.set('commune', c.name);

    this.http.get<FamilleNode[]>('/api/v1/geo/product-tree', { params })
      .subscribe({
        next:     tree => this.treeData.set(tree),
        complete: ()   => this.treeLoading.set(false),
        error:    ()   => this.treeLoading.set(false),
      });
  }

  /** Reload map only — when tree selection changes. */
  private loadMap(): void {
    let params = this.baseParams();
    const sel = this.selection();

    if (sel?.type === 'famille') {
      params = params.set('famille', sel.nom);
    } else if (sel?.type === 'sous_famille') {
      params = params.set('famille', sel.famille).set('sous_famille', sel.nom);
    } else if (sel?.type === 'produit') {
      params = params.set('produit', sel.code);
    }

    this.http.get<LocationDatum[]>('/api/v1/geo/by-location', { params })
      .subscribe({ next: locs => this.mapLocations.set(locs) });
  }

  private baseParams(): HttpParams {
    return new HttpParams()
      .set('annee_mois', this.periode())
      .set('canal',      this.canal())
      .set('unite',      this.unite());
  }
}

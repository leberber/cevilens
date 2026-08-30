import { Component, inject, signal, computed, OnInit, effect, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { DistributorContextService } from '../../core/services/distributor-context.service';
import { RoleService } from '../../core/services/role.service';
import { DateHelper } from '../../core/services/date.helper';
import { CommuneMapComponent, type CommuneDatum } from '../analytics/commune-map.component';
import {
  ProductTreeComponent,
  type FamilleNode,
  type TreeSelection,
} from '../../shared/components/product-tree/product-tree.component';
import { type DateRange } from '../../shared/components/date-range-picker/date-range-picker.component';

interface LocationDatum {
  code: number;
  name: string;
  wilaya: string;
  total: number;
}

type Canal = 'VD' | 'VH' | 'ALL';
type Unite = 'packs' | 'tonnes';

@Component({
  selector: 'app-geo-explorer',
  standalone: true,
  imports: [DecimalPipe, CommuneMapComponent, ProductTreeComponent],
  templateUrl: './geo-explorer.component.html',
  styleUrl: './geo-explorer.component.scss',
})
export class GeoExplorerComponent implements OnInit {
  private readonly http        = inject(HttpClient);
  private readonly distContext = inject(DistributorContextService);
  private readonly roleService = inject(RoleService);
  private readonly dateHelper  = inject(DateHelper);

  readonly loading       = signal(false);
  readonly drawerLoading = signal(false);
  readonly treeData      = signal<FamilleNode[]>([]);
  readonly drawerTree    = signal<FamilleNode[]>([]);
  readonly mapLocations  = signal<LocationDatum[]>([]);

  private readonly userDateSet = signal(false);

  readonly canal    = signal<Canal>('ALL');
  readonly unite    = signal<Unite>('tonnes');
  readonly dateFrom = signal('');
  readonly dateTo   = signal('');
  readonly periodes = signal<string[]>([]);
  readonly selection = signal<TreeSelection>(null);
  readonly commune      = signal<{ code: number; name: string } | null>(null);
  readonly sidebarWidth = signal(350);
  readonly panelOpen    = computed(() => this.sidebarWidth() > 0);

  private readonly MIN_WIDTH     = 180;
  private readonly COLLAPSE_SNAP = 80;

  readonly canals: { value: Canal; label: string }[] = [
    { value: 'ALL', label: 'Tous' },
    { value: 'VD',  label: 'VD'   },
    { value: 'VH',  label: 'VH'   },
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

  readonly totalVentes = computed(() =>
    this.mapLocations().reduce((sum, r) => sum + r.total, 0)
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
      // Everything else must be untracked so that date/canal/unite signal reads
      // inside load()/baseParams() don't make this effect re-run on every filter change.
      untracked(() => {
        this.userDateSet.set(false); // reset manual flag on distributor switch
        if (this.dateFrom()) {
          this.load();
          this.loadPeriodes();
        }
      });
    });
  }

  ngOnInit(): void {
    // Set current month so the map loads immediately; the effect below will also call
    // load() + loadPeriodes() once it fires, populating the real list of available months
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.dateFrom.set(this.dateHelper.getFirstDayOfMonth(currentPeriod));
    this.dateTo.set(this.dateHelper.getLastDayOfMonth(currentPeriod));
    this.periodes.set([currentPeriod]); // seed so the chip renders immediately

    if (this.roleService.isPlatformAdmin() && !this.distContext.selectedDistributorId()) return;
    this.load();
  }

  setCanal(c: string): void {
    const canal = c as Canal;
    if (this.canal() === canal) return;
    this.canal.set(canal);
    this.commune.set(null);
    this.selection.set(null);
    this.load();
  }

  setUnite(u: string): void {
    const unite = u as Unite;
    if (this.unite() === unite) return;
    this.unite.set(unite);
    this.load();
  }

  onRangeChange(range: DateRange): void {
    this.userDateSet.set(true);
    this.dateFrom.set(range.from);
    this.dateTo.set(range.to);
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
    if (evt) this.loadDrawerTree();
  }

  clearCommune(): void {
    this.commune.set(null);
    this.drawerTree.set([]);
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

  // ── Load methods ───────────────────────────────────────────────────────────

  private loadPeriodes(): void {
    this.http.get<string[]>('/api/v1/ventes/periodes').subscribe({
      next: periodes => {
        this.periodes.set(periodes);
        if (!periodes.length) return;
        // Auto-redirect to latest available period only when the user hasn't
        // manually selected a custom date range.
        const latestFrom = this.dateHelper.getFirstDayOfMonth(periodes[0]);
        if (latestFrom !== this.dateFrom() && !this.userDateSet()) {
          this.dateFrom.set(latestFrom);
          this.dateTo.set(this.dateHelper.getLastDayOfMonth(periodes[0]));
          this.load();
        }
      },
    });
  }

  /** Full reload: tree + map (on date/canal/unite change). */
  private load(): void {
    const params = this.baseParams();
    this.loading.set(true);

    this.http.get<FamilleNode[]>('/api/v1/geo/product-tree', { params })
      .subscribe({ next: tree => this.treeData.set(tree) });

    this.http.get<LocationDatum[]>('/api/v1/geo/by-location', { params })
      .subscribe({
        next:  locs => { this.mapLocations.set(locs); this.loading.set(false); },
        error: ()   => this.loading.set(false),
      });
  }

  /** Load commune-specific product tree into the drawer. */
  private loadDrawerTree(): void {
    const c = this.commune();
    if (!c) return;
    this.drawerLoading.set(true);
    const params = this.baseParams().set('commune', c.name);
    this.http.get<FamilleNode[]>('/api/v1/geo/product-tree', { params }).subscribe({
      next:  tree => { this.drawerTree.set(tree);  this.drawerLoading.set(false); },
      error: ()   => this.drawerLoading.set(false),
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
    let params = new HttpParams()
      .set('date_from', this.dateFrom())
      .set('date_to',   this.dateTo())
      .set('unite',     this.unite());
    if (this.canal() !== 'ALL') params = params.set('canal', this.canal());
    return params;
  }
}

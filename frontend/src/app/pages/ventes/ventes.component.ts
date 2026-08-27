import { Component, OnInit, AfterViewInit, OnDestroy, inject, ViewChild, ElementRef, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { Select } from 'primeng/select';
import { Popover } from 'primeng/popover';
import { VentesService, VenteRead } from '../../core/services/ventes.service';
import { ColumnStateService, ColDef } from '../../core/services/column-state.service';
import { PaginationHelper } from '../../core/services/pagination.helper';
import { FamilleColorService } from '../../core/services/famille-color.service';
import { DateHelper } from '../../core/services/date.helper';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { DateRangePickerComponent } from '../../shared/components/date-range-picker.component';
import { BATCH_SIZE, SEARCH_DEBOUNCE_MS } from '../../core/constants/app.constants';

const LS_KEY = 'cevital_ventes_columns';

@Component({
  selector: 'app-ventes',
  standalone: true,
  imports: [DecimalPipe, NgStyle, FormsModule, TooltipModule, Select, Popover, SkeletonLoaderComponent, PageLayoutComponent, DateRangePickerComponent],
  templateUrl: './ventes.component.html',
  styleUrl: './ventes.component.scss',
})
export class VentesComponent implements OnInit, AfterViewInit, OnDestroy {
  private ventesService = inject(VentesService);
  private columnState = inject(ColumnStateService);
  private pagination = inject(PaginationHelper);
  private familleColorService = inject(FamilleColorService);
  private dateHelper = inject(DateHelper);
  private router = inject(Router);

  @ViewChild('tableWrapper') tableWrapper!: ElementRef<HTMLElement>;
  @ViewChild('filterPop') filterPop!: Popover;
  @ViewChild('headerActions') headerActions!: TemplateRef<any>;
  @ViewChild('toolbarContent') toolbarContent!: TemplateRef<any>;
  private boundScrollFn = () => this.checkScroll();
  private cdr = inject(ChangeDetectorRef);

  rows: VenteRead[] = [];
  total = 0;
  loading = false;
  loadingMore = false;
  periodes: string[] = [];
  dateFrom = '';
  dateTo = '';
  searchTerm = '';
  fdvs: string[] = [];
  clients: string[] = [];
  familles: string[] = [];
  distributeurs: string[] = [];
  selectedFdv: string | null = null;
  selectedClient: string | null = null;
  selectedFamille: string | null = null;
  selectedDistributeur: string | null = null;
  activeFilters: Partial<Record<string, string>> = {};
  filterOptions: string[] = [];
  filterOptionsLoading = false;
  filterSearchTerm = '';
  activeFilterField: string | null = null;
  private currentPage = 1;
  private searchTimeout: any;

  readonly allColumns: ColDef[] = [
    { field: 'date_commande',        header: 'Date',                width: '110px', visible: true  },
    { field: 'num_commande',         header: 'N° Commande',         width: '160px', visible: true  },
    { field: 'source',               header: 'Source',              width: '90px',  visible: true,  filterable: true  },
    { field: 'canal',                header: 'Canal',               width: '80px',  visible: true,  filterable: true  },
    { field: 'type_commande',        header: 'Type',                width: '80px',  visible: true,  filterable: true  },
    { field: 'code_client',          header: 'Code Client',         width: '140px', visible: false },
    { field: 'nom_client',           header: 'Nom client',          width: '180px', visible: true  },
    { field: 'categorie_client',     header: 'Catégorie',           width: '90px',  visible: true,  filterable: true  },
    { field: 'adresse_client',       header: 'Adresse Client',      width: '200px', visible: false },
    { field: 'route',                header: 'Route',               width: '130px', visible: false, filterable: true  },
    { field: 'commune',              header: 'Commune',             width: '120px', visible: false },
    { field: 'wilaya',               header: 'Wilaya',              width: '120px', visible: false, filterable: true  },
    { field: 'zone',                 header: 'Zone',                width: '80px',  visible: false, filterable: true  },
    { field: 'region',               header: 'Région',              width: '90px',  visible: false, filterable: true  },
    { field: 'tel_client',           header: 'Tél',                 width: '120px', visible: false },
    { field: 'type_client',          header: 'Type Client',         width: '100px', visible: false, filterable: true  },
    { field: 'code_fdv',             header: 'Code-FDV',            width: '120px', visible: false },
    { field: 'nom_fdv',              header: 'Prévendeur',          width: '160px', visible: true,  filterable: true  },
    { field: 'code_distributeur',    header: 'Code Distributeur',   width: '140px', visible: false },
    { field: 'nom_distributeur',     header: 'Distributeur',        width: '160px', visible: true,  filterable: true  },
    { field: 'buid',                 header: 'BUID',                width: '130px', visible: false },
    { field: 'depot_livraison',      header: 'Dépôt Livraison',     width: '130px', visible: false },
    { field: 'statut_commande',      header: 'Statut Commande',     width: '140px', visible: true,  filterable: true  },
    { field: 'date_creation',        header: 'Date Création',       width: '120px', visible: false },
    { field: 'date_confirmation',    header: 'Date Confirmation',   width: '140px', visible: false },
    { field: 'date_facturation',     header: 'Date Facturation',    width: '130px', visible: false },
    { field: 'code_livreur',         header: 'Code Livreur',        width: '120px', visible: false },
    { field: 'nom_livreur',          header: 'Nom Livreur',         width: '150px', visible: false, filterable: true  },
    { field: 'matricule_van',        header: 'Matricule VAN',       width: '120px', visible: false },
    { field: 'code_produit',         header: 'Code Produit',        width: '130px', visible: true  },
    { field: 'description_produit',  header: 'Description Produit', width: '220px', visible: true  },
    { field: 'famille',              header: 'Famille',             width: '120px', visible: true,  filterable: true  },
    { field: 'sous_famille',         header: 'Sous Famille',        width: '160px', visible: true,  filterable: true  },
    { field: 'uom_vente',            header: 'UOM Vente',           width: '100px', visible: false },
    { field: 'cout_produit',         header: 'Cout Produit',        width: '110px', visible: true  },
    { field: 'prix_unitaire',        header: 'Prix Unitaire',       width: '110px', visible: true  },
    { field: 'uom_principale',       header: 'UOM principale',      width: '120px', visible: false },
    { field: 'prix_unitaire_uom_pr', header: 'Prix unit. UOM PR',   width: '130px', visible: false },
    { field: 'qte_commandee',        header: 'Qte Commandée',       width: '120px', visible: true  },
    { field: 'qte_chargee',          header: 'Qte Chargée',         width: '110px', visible: false },
    { field: 'qte_livree',           header: 'Qte Livrée',          width: '100px', visible: true  },
    { field: 'qte_facturee',         header: 'Qte Facturée',        width: '110px', visible: true  },
    { field: 'total_commande',       header: 'Total Commandée',     width: '130px', visible: false },
    { field: 'total_facture',        header: 'Total Facturée',      width: '120px', visible: true  },
  ];

  get visibleColumns(): ColDef[] {
    return this.allColumns.filter(c => c.visible);
  }

  readonly skWidths = ['72%','55%','88%','50%','78%','63%','90%','42%','70%','82%','58%','68%'];

  get hasMore(): boolean {
    return this.rows.length < this.total;
  }

  ngOnInit() {
    this.loadColumnState();
    this.ventesService.getPeriodes().subscribe(periodes => {
      this.periodes = periodes;
      if (periodes.length) {
        this.dateFrom = this.dateHelper.getFirstDayOfMonth(periodes[0]);
        this.dateTo   = this.dateHelper.getLastDayOfMonth(periodes[0]);
        this.loadFdvsAndClients();
        this.reset();
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => this.attachScrollListener(), 0);
  }

  ngOnDestroy() {
    this.tableWrapper?.nativeElement.removeEventListener('scroll', this.boundScrollFn);
  }

  private attachScrollListener() {
    const el = this.tableWrapper?.nativeElement;
    if (el) el.addEventListener('scroll', this.boundScrollFn);
  }

  private checkScroll() {
    const el = this.tableWrapper?.nativeElement;
    if (!el) return;
    const { scrollHeight, scrollTop, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < 300 && this.hasMore && !this.loadingMore && !this.loading) {
      this.currentPage++;
      this.loadBatch(true);
    }
  }

  get filteredOptions(): string[] {
    if (!this.filterSearchTerm) return this.filterOptions;
    const q = this.filterSearchTerm.toLowerCase();
    return this.filterOptions.filter(o => o.toLowerCase().includes(q));
  }

  get activeFilterCount(): number {
    return Object.keys(this.activeFilters).length;
  }

  openColumnFilter(field: string, event: Event): void {
    event.stopPropagation();
    this.activeFilterField = field;
    this.filterSearchTerm = '';
    this.filterOptions = [];
    this.filterOptionsLoading = true;
    this.ventesService.getDistinct(field, this.dateFrom || undefined, this.dateTo || undefined)
      .subscribe(vals => { this.filterOptions = vals; this.filterOptionsLoading = false; });
    this.filterPop.toggle(event);
  }

  applyColumnFilter(value: string | null): void {
    if (value === null) {
      delete this.activeFilters[this.activeFilterField!];
    } else {
      this.activeFilters[this.activeFilterField!] = value;
    }
    this.filterPop.hide();
    this.reset();
  }

  removeFilter(field: string): void {
    delete this.activeFilters[field];
    this.reset();
  }

  clearAllColumnFilters(): void {
    this.activeFilters = {};
    this.reset();
  }

  getColumnFilter(field: string): string | undefined {
    return this.activeFilters[field];
  }

  getActiveFilterChips(): { field: string; label: string; value: string }[] {
    return Object.entries(this.activeFilters).map(([field, value]) => ({
      field,
      label: this.allColumns.find(c => c.field === field)?.header ?? field,
      value: value as string,
    }));
  }

  onRangeChange(range: { from: string; to: string }): void {
    this.dateFrom = range.from;
    this.dateTo   = range.to;
    this.selectedFdv = null;
    this.selectedClient = null;
    this.selectedFamille = null;
    this.selectedDistributeur = null;
    this.activeFilters = {};
    this.loadFdvsAndClients();
    this.reset();
  }

  goToRapport(): void {
    this.router.navigate(['/rapport-facturation'], {
      queryParams: {
        date_from: this.dateFrom || undefined,
        date_to:   this.dateTo   || undefined,
        nom_fdv:   this.selectedFdv || undefined,
      },
    });
  }

  reload(): void {
    this.reset();
  }

  onFdvChange(): void {
    this.selectedClient = null;
    this.ventesService.getClients(this.dateFrom || undefined, this.dateTo || undefined, this.selectedFdv || undefined)
      .subscribe(d => this.clients = d);
    this.reset();
  }

  onDistributeurChange(): void {
    this.reset();
  }

  onFilterChange(): void {
    this.reset();
  }

  onSearch() {
    this.pagination.debounceSearch(() => this.reset(), SEARCH_DEBOUNCE_MS);
  }

  toggleColumn(field: string) {
    this.columnState.toggle(this.allColumns, field, LS_KEY);
  }

  private loadFdvsAndClients(): void {
    this.ventesService.getFdvs(this.dateFrom || undefined, this.dateTo || undefined).subscribe(d => this.fdvs = d);
    this.ventesService.getClients(this.dateFrom || undefined, this.dateTo || undefined).subscribe(d => this.clients = d);
    this.ventesService.getFamilles(this.dateFrom || undefined, this.dateTo || undefined).subscribe(d => this.familles = d);
    this.ventesService.getDistinct('nom_distributeur', this.dateFrom || undefined, this.dateTo || undefined).subscribe(d => this.distributeurs = d);
  }

  private reset() {
    this.rows = [];
    this.currentPage = 1;
    this.total = 0;
    this.loadBatch(false);
  }

  private loadBatch(append: boolean) {
    if (!this.dateFrom && !this.dateTo) return;
    if (append) this.loadingMore = true;
    else this.loading = true;

    const f = this.activeFilters;
    this.ventesService.list({
      page: this.currentPage,
      per_page: BATCH_SIZE,
      date_from: this.dateFrom || undefined,
      date_to: this.dateTo || undefined,
      famille:          (f['famille']          as string) || this.selectedFamille || undefined,
      sous_famille:     (f['sous_famille']     as string) || undefined,
      type_commande:    (f['type_commande']    as string) || undefined,
      categorie_client: (f['categorie_client'] as string) || undefined,
      statut_commande:  (f['statut_commande']  as string) || undefined,
      wilaya:           (f['wilaya']           as string) || undefined,
      zone:             (f['zone']             as string) || undefined,
      region:           (f['region']           as string) || undefined,
      source:           (f['source']           as string) || undefined,
      canal:            (f['canal']            as string) || undefined,
      route:            (f['route']            as string) || undefined,
      nom_fdv:          (f['nom_fdv']          as string) || this.selectedFdv || undefined,
      nom_livreur:      (f['nom_livreur']      as string) || undefined,
      nom_distributeur: (f['nom_distributeur'] as string) || this.selectedDistributeur || undefined,
      nom_client: this.selectedClient || undefined,
      search: this.searchTerm || undefined,
    }).subscribe({
      next: res => {
        this.pagination.handleBatchLoad(res, this.rows, append, (items, total) => {
          this.rows = items;
          this.total = total;
        });
        this.loading = false;
        this.loadingMore = false;
      },
      error: () => {
        this.loading = false;
        this.loadingMore = false;
      },
    });
  }

  private loadColumnState() {
    this.columnState.load(this.allColumns, LS_KEY);
  }

  getFamilleStyle(famille: string | null): { background: string; color: string } {
    return this.familleColorService.getStyle(famille);
  }

  getRowValue(row: VenteRead, field: string): any {
    return (row as any)[field] ?? '—';
  }
}

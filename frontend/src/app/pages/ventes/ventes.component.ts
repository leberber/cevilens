import { Component, OnInit, inject, ViewChild, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { Popover } from 'primeng/popover';
import { Paginator } from 'primeng/paginator';
import { VentesService, VenteRead } from '../../core/services/ventes.service';
import { ColumnStateService, ColDef } from '../../core/services/column-state.service';
import { FamilleColorService } from '../../core/services/famille-color.service';
import { DateHelper } from '../../core/services/date.helper';
import { NotificationService } from '../../core/services/notification.service';
import { DistributorContextService } from '../../core/services/distributor-context.service';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { DateRangePickerComponent } from '../../shared/components/date-range-picker/date-range-picker.component';
import { ActiveFilterChipsComponent } from '../../shared/components/active-filter-chips/active-filter-chips.component';
import { VentesFilterService } from './services/ventes-filter.service';
import { BATCH_SIZE } from '../../core/constants/app.constants';

const LS_KEY = 'cevital_ventes_columns';

@Component({
  selector: 'app-ventes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TooltipModule,
    Popover,
    Paginator,
    SkeletonLoaderComponent,
    PageLayoutComponent,
    DateRangePickerComponent,
    ActiveFilterChipsComponent,
  ],
  templateUrl: './ventes.component.html',
  styleUrl: './ventes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentesComponent implements OnInit {
  private readonly ventesService        = inject(VentesService);
  private readonly columnState          = inject(ColumnStateService);
  private readonly familleColorService  = inject(FamilleColorService);
  private readonly dateHelper           = inject(DateHelper);
  private readonly notify               = inject(NotificationService);
  private readonly destroyRef           = inject(DestroyRef);
  private readonly cdr                  = inject(ChangeDetectorRef);
  private readonly distContext          = inject(DistributorContextService);
  readonly filterService                = inject(VentesFilterService);

  @ViewChild('filterPop') filterPop!: Popover;

  readonly BATCH_SIZE = BATCH_SIZE;

  readonly rows = signal<VenteRead[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly periodes = signal<string[]>([]);
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly fdvs = signal<string[]>([]);
  readonly clients = signal<string[]>([]);
  readonly selectedFdv = signal<string | null>(null);
  readonly selectedClient = signal<string | null>(null);
  readonly selectedDistributeur = signal<string | null>(null);

  readonly allColumns: ColDef[] = [
    { field: 'date_commande',        header: 'Date',                width: '110px', visible: true,  filterable: true  },
    { field: 'num_commande',         header: 'N° Commande',         width: '160px', visible: true  },
    { field: 'source',               header: 'Source',              width: '90px',  visible: true,  filterable: true  },
    { field: 'canal',                header: 'Canal',               width: '80px',  visible: true,  filterable: true  },
    { field: 'type_commande',        header: 'Type',                width: '80px',  visible: true,  filterable: true  },
    { field: 'code_client',          header: 'Code Client',         width: '140px', visible: false },
    { field: 'nom_client',           header: 'Nom client',          width: '180px', visible: true, filterable: true  },
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

  readonly visibleColumns = computed(() => this.allColumns.filter(c => c.visible));
  readonly skWidths = ['72%','55%','88%','50%','78%','63%','90%','42%','70%','82%','58%','68%'];

  // Watch for distributor changes and reload data
  private readonly distributorEffect = effect(() => {
    this.distContext.selectedDistributorId();
    if (this.dateFrom() && this.dateTo()) {
      this.reset();
    }
  });

  ngOnInit() {
    this.loadColumnState();
    this.ventesService.getPeriodes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(periodes => {
        this.periodes.set(periodes);
        if (periodes.length) {
          this.dateFrom.set(this.dateHelper.getFirstDayOfMonth(periodes[0]));
          this.dateTo.set(this.dateHelper.getLastDayOfMonth(periodes[0]));
          this.loadFdvsAndClients();
          this.reset();
        }
      });
  }

  onPageChange(event: { page?: number }): void {
    if (event.page !== undefined) {
      this.loadBatch(event.page + 1);
    }
  }

  get filteredOptions(): string[] {
    return this.filterService.filteredOptions;
  }

  async openColumnFilter(field: string, event: Event): Promise<void> {
    event.stopPropagation();
    await this.filterService.openColumnFilter(field, this.dateFrom() || undefined, this.dateTo() || undefined);
    this.filterPop.toggle(event);
  }

  applyColumnFilter(value: string | null): void {
    this.filterService.applyColumnFilter(value);
    this.filterPop.hide();
    this.reset();
  }

  removeFilter(field: string): void {
    this.filterService.removeFilter(field);
    this.reset();
  }

  clearAllColumnFilters(): void {
    this.filterService.clearAllColumnFilters();
    this.reset();
  }

  getColumnFilter(field: string): string | undefined {
    return this.filterService.getColumnFilter(field);
  }

  getActiveFilterChips(): { field: string; label: string; value: string }[] {
    return this.filterService.getActiveFilterChips(this.allColumns);
  }

  onRangeChange(range: { from: string; to: string }): void {
    this.dateFrom.set(range.from);
    this.dateTo.set(range.to);
    this.selectedFdv.set(null);
    this.selectedClient.set(null);
    this.selectedDistributeur.set(null);
    this.filterService.clearAllColumnFilters();
    this.loadFdvsAndClients();
    this.reset();
  }

  reload(): void {
    this.reset();
  }

  onFdvChange(): void {
    this.selectedClient.set(null);
    this.ventesService.getClients(this.dateFrom() || undefined, this.dateTo() || undefined, this.selectedFdv() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(d => this.clients.set(d));
    this.reset();
  }

  toggleColumn(field: string) {
    this.columnState.toggle(this.allColumns, field, LS_KEY);
  }

  private loadFdvsAndClients(): void {
    this.ventesService.getFdvs(this.dateFrom() || undefined, this.dateTo() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(d => this.fdvs.set(d));
    this.ventesService.getClients(this.dateFrom() || undefined, this.dateTo() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(d => this.clients.set(d));
  }

  private reset() {
    this.loadBatch(1);
  }

  private loadBatch(page: number) {
    if (!this.dateFrom() && !this.dateTo()) return;

    this.loading.set(true);

    const f = this.filterService.activeFilters;
    this.ventesService.list({
      page: page,
      per_page: BATCH_SIZE,
      date_from: this.dateFrom() || undefined,
      date_to: this.dateTo() || undefined,
      date_commande:    (f['date_commande']    as string) || undefined,
      famille:          (f['famille']          as string) || undefined,
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
      nom_fdv:          (f['nom_fdv']          as string) || this.selectedFdv() || undefined,
      nom_livreur:      (f['nom_livreur']      as string) || undefined,
      nom_distributeur: (f['nom_distributeur'] as string) || this.selectedDistributeur() || undefined,
      nom_client:       (f['nom_client']       as string) || this.selectedClient() || undefined,
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.rows.set([...res.items]);
          this.total.set(res.total);
          this.loading.set(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.showHttpError(err);
          this.cdr.detectChanges();
        },
      });
  }

  private loadColumnState() {
    this.columnState.load(this.allColumns, LS_KEY);
  }

  getFamilleStyle(famille: string | null): { background: string; color: string } {
    return this.familleColorService.getStyle(famille);
  }

  getRowValue(row: VenteRead, field: string): unknown {
    return (row as unknown as Record<string, unknown>)[field] ?? '—';
  }

  getFooterTotal(field: string): string {
    if (!this.rows().length) return '—';

    let sum = 0;
    this.rows().forEach(row => {
      const value = (row as unknown as Record<string, unknown>)[field];
      if (typeof value === 'number') {
        sum += value;
      }
    });

    return sum > 0 ? Math.round(sum).toString() : '—';
  }
}

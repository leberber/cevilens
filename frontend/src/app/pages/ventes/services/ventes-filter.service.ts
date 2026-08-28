import { Injectable, inject } from '@angular/core';
import { SearchFilterHelper } from '../../../core/services/search-filter.helper';
import { VentesService } from '../../../core/services/ventes.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VentesFilterService {
  private readonly searchFilter  = inject(SearchFilterHelper);
  private readonly ventesService = inject(VentesService);
  private readonly destroyRef    = inject(DestroyRef);

  activeFilters: Partial<Record<string, string>> = {};
  filterOptions: string[] = [];
  allClientNames: string[] = [];
  filterOptionsLoading = false;
  filterSearchTerm = '';
  activeFilterField: string | null = null;

  get filteredOptions(): string[] {
    // For nom_client, filter in-memory from loaded list
    if (this.activeFilterField === 'nom_client') {
      if (!this.filterSearchTerm.trim()) {
        return this.allClientNames;
      }
      const term = this.filterSearchTerm.toLowerCase();
      return this.allClientNames.filter(name =>
        name.toLowerCase().includes(term)
      );
    }
    return this.searchFilter.filterByField(this.filterOptions, this.filterSearchTerm, 0);
  }

  get activeFilterCount(): number {
    return Object.keys(this.activeFilters).length;
  }

  openColumnFilter(field: string, dateFrom: string | undefined, dateTo: string | undefined): Promise<void> {
    return new Promise((resolve) => {
      this.activeFilterField = field;
      this.filterSearchTerm = '';
      this.filterOptions = [];
      this.filterOptionsLoading = false;
      this.dateFrom = dateFrom;
      this.dateTo = dateTo;

      // For nom_client, load all names once and filter in-memory
      if (field === 'nom_client') {
        if (this.allClientNames.length === 0) {
          this.filterOptionsLoading = true;
          this.ventesService.getClientNames()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(names => {
              this.allClientNames = names;
              this.filterOptionsLoading = false;
              resolve();
            });
        } else {
          resolve();
        }
      } else {
        // For other fields, load from server with date filters
        this.filterOptionsLoading = true;
        this.ventesService.getDistinct(field, dateFrom, dateTo)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(vals => {
            this.filterOptions = vals;
            this.filterOptionsLoading = false;
            resolve();
          });
      }
    });
  }

  private dateFrom: string | undefined;
  private dateTo: string | undefined;
  private searchTimeout: ReturnType<typeof setTimeout> | undefined;

  onSearchTermChange(): void {
    // nom_client filtering is now in-memory (see filteredOptions getter)
    // No server call needed anymore
    // This method kept for other field types that may need debounced search
  }

  applyColumnFilter(value: string | null): void {
    if (value === null) {
      delete this.activeFilters[this.activeFilterField!];
    } else {
      this.activeFilters[this.activeFilterField!] = value;
    }
  }

  removeFilter(field: string): void {
    delete this.activeFilters[field];
  }

  clearAllColumnFilters(): void {
    this.activeFilters = {};
  }

  getColumnFilter(field: string): string | undefined {
    return this.activeFilters[field];
  }

  getActiveFilterChips(allColumns: any[]): { field: string; label: string; value: string }[] {
    return Object.entries(this.activeFilters).map(([field, value]) => ({
      field,
      label: allColumns.find(c => c.field === field)?.header ?? field,
      value: value as string,
    }));
  }

  reset(): void {
    this.activeFilters = {};
    this.filterOptions = [];
    this.filterSearchTerm = '';
    this.activeFilterField = null;
    this.filterOptionsLoading = false;
  }
}

import { Injectable, inject } from '@angular/core';
import { RapportsService } from '../../../core/services/rapports.service';
import { FormatService } from '../../../core/services/format.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RapportClientFilterService {
  private readonly rapportSvc    = inject(RapportsService);
  private readonly formatService = inject(FormatService);
  private readonly destroyRef    = inject(DestroyRef);

  allClients: string[] = [];
  selectedClients: Set<string> = new Set();
  clientSearch: string = '';
  loadingClients: boolean = false;

  get filteredClients(): string[] {
    const q = this.clientSearch.trim().toLowerCase();
    const list = q ? this.allClients.filter(c => c.toLowerCase().includes(q)) : this.allClients;
    return [...list].sort((a, b) => this.formatService.localeCompare(a, b));
  }

  loadClients(
    dateFrom: string,
    dateTo: string,
    selectedFdv: string,
    source: string,
    onComplete?: () => void
  ): void {
    if (!dateFrom || !selectedFdv) return;
    this.loadingClients = true;
    this.rapportSvc.getClients(dateFrom, dateTo, selectedFdv, source)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: d => {
          this.allClients = d;
          this.selectedClients = new Set(d);
          this.loadingClients = false;
          if (onComplete) onComplete();
        },
        error: () => this.loadingClients = false,
      });
  }

  toggleClient(name: string): void {
    const s = new Set(this.selectedClients);
    s.has(name) ? s.delete(name) : s.add(name);
    this.selectedClients = s;
  }

  selectAll(): void {
    this.selectedClients = new Set(this.allClients);
  }

  deselectAll(): void {
    this.selectedClients = new Set();
  }

  reset(): void {
    this.allClients = [];
    this.selectedClients = new Set();
    this.clientSearch = '';
    this.loadingClients = false;
  }
}

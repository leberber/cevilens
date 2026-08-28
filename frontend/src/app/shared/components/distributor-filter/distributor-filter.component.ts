import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { VentesService } from '../../../core/services/ventes.service';

@Component({
  selector: 'app-distributor-filter',
  standalone: true,
  imports: [Select, FormsModule],
  template: `
    <div class="distributor-filter">
      <p-select
        class="filter-select--glass"
        panelStyleClass="filter-select-panel--glass"
        [options]="distributors"
        [(ngModel)]="selectedDistributor"
        (ngModelChange)="onDistributorChange($event)"
        [placeholder]="placeholder"
        [filter]="filter"
        [showClear]="showClear"
        [disabled]="disabled"
        [style]="style">
      </p-select>
    </div>
  `,
})
export class DistributorFilterComponent implements OnInit, OnChanges {
  @Input() selectedDistributor: string | null = null;
  @Input() dateFrom?: string;
  @Input() dateTo?: string;
  @Input() placeholder: string = 'Tous les distributeurs';
  @Input() filter: boolean = true;
  @Input() showClear: boolean = true;
  @Input() disabled: boolean = false;
  @Input() style?: Record<string, string>;
  @Output() distributorChange = new EventEmitter<string | null>();

  distributors: string[] = [];
  private readonly ventesService = inject(VentesService);

  ngOnInit() {
    this.loadDistributors();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['dateFrom'] || changes['dateTo']) && !changes['dateFrom']?.firstChange) {
      this.loadDistributors();
    }
  }

  private loadDistributors() {
    this.ventesService.getDistinct('nom_distributeur', this.dateFrom, this.dateTo)
      .subscribe(d => this.distributors = d);
  }

  onDistributorChange(value: string | null) {
    this.selectedDistributor = value;
    this.distributorChange.emit(value);
  }
}

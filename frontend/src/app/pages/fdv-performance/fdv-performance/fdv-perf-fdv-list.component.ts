import { Component, inject, output } from '@angular/core';
import { FdvPerfStateService } from '../services/fdv-perf-state.service';
import { FdvPerfFormatterService } from '../services/fdv-perf-formatter.service';
import { calculatePercentage } from '../../../core/utils/math.util';

@Component({
  selector: 'app-fdv-perf-fdv-list',
  standalone: true,
  imports: [],
  templateUrl: './fdv-perf-fdv-list.component.html',
  styleUrl: './fdv-perf-fdv-list.component.scss',
})
export class FdvPerfFdvListComponent {
  state = inject(FdvPerfStateService);
  formatter = inject(FdvPerfFormatterService);

  // Outputs
  fdvSelect = output<string>();

  readonly skeletonRows = Array(5).fill(0);

  // Getters for template
  get loading() { return this.state.loading(); }
  get fdvPerfTitle() { return this.state.fdvPerfTitle(); }
  get fdvPerfItems() { return this.state.fdvPerfItems(); }
  get fdvPerfMax() { return this.state.fdvPerfMax(); }
  get selectedFdv() { return this.state.selectedFdv(); }
  get selectedProduct() { return this.state.selectedProduct(); }

  onSelectFdv(code: string) {
    this.fdvSelect.emit(code);
  }

  formatNum(n: number | undefined | null): string {
    return this.formatter.formatNum(n);
  }

  fdvObjPct(item: { total: number }, obj: number): number {
    return calculatePercentage(item.total, obj);
  }
}

import { Component, inject, output } from '@angular/core';
import { DashboardStateService } from '../services/dashboard-state.service';
import { DashboardFormatterService } from '../services/dashboard-formatter.service';
import { calculatePercentage } from '../../../core/utils/math.util';

@Component({
  selector: 'app-dashboard-fdv-performance',
  standalone: true,
  imports: [],
  templateUrl: './dashboard-fdv-performance.component.html',
  styleUrl: './dashboard-fdv-performance.component.scss',
})
export class DashboardFdvPerformanceComponent {
  state = inject(DashboardStateService);
  formatter = inject(DashboardFormatterService);

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

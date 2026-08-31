import { Component, inject, output } from '@angular/core';
import { DashboardStateService } from '../services/dashboard-state.service';
import { DashboardFormatterService } from '../services/dashboard-formatter.service';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
})
export class DashboardHeaderComponent {
  state = inject(DashboardStateService);
  formatter = inject(DashboardFormatterService);

  // Outputs
  prevPeriod = output<void>();
  nextPeriod = output<void>();
  canalChange = output<'VD' | 'VH'>();
  drillToRoot = output<void>();

  onPrevPeriod() { this.prevPeriod.emit(); }
  onNextPeriod() { this.nextPeriod.emit(); }
  onCanalChange(canal: 'VD' | 'VH') { this.canalChange.emit(canal); }
  onDrillToRoot() { this.drillToRoot.emit(); }

  // Getters for template
  get selectedFamille() { return this.state.selectedFamille(); }
  get selectedCanal() { return this.state.selectedCanal(); }
  get selectedFdv() { return this.state.selectedFdv(); }
  get selectedFdvName() { return this.state.selectedFdvName(); }
  get canGoPrev() { return this.state.canGoPrev(); }
  get canGoNext() { return this.state.canGoNext(); }
  get selectedPeriode() { return this.state.selectedPeriode(); }

  capitalize(s: string): string {
    return this.formatter.capitalize(s);
  }

  formatPeriod(periode: string): string {
    return this.formatter.formatPeriod(periode);
  }
}

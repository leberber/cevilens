import { Component, OnInit, inject, output, HostListener, signal, computed } from '@angular/core';
import { RoleService } from '../../../core/services/role.service';
import { DistributorContextService } from '../../../core/services/distributor-context.service';
import { DistributorService } from '../../../core/services/distributor.service';
import { Distributor } from '../../../core/models/distributor.model';

/**
 * Distributor selector for platform admins.
 * Allows switching between active distributors to filter data.
 * Non-admins see read-only display of their assigned distributor.
 */
@Component({
  selector: 'app-distributor-switcher',
  standalone: true,
  imports: [],
  templateUrl: './distributor-switcher.component.html',
})
export class DistributorSwitcherComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly distContext = inject(DistributorContextService);
  private readonly distService = inject(DistributorService);

  readonly isPlatformAdmin = this.roleService.isPlatformAdmin();
  readonly distributors = signal<Distributor[]>([]);
  readonly selected = signal<Distributor | null>(null);
  readonly showMenu = signal(false);

  readonly displayName = computed(() =>
    this.isPlatformAdmin
      ? this.selected()?.nom ?? null
      : this.distContext.distributor()?.nom ?? null
  );

  readonly distributorChange = output<Distributor | null>();

  ngOnInit() {
    if (!this.isPlatformAdmin) return;

    this.distService.listDistributors().subscribe(list => {
      const active = list.filter(d => d.is_active);
      this.distributors.set(active);
      if (active.length > 0 && !this.selected()) {
        this.selectDistributor(active[0]);
      }
    });
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.showMenu.update(v => !v);
  }

  select(dist: Distributor, event: Event) {
    event.stopPropagation();
    this.selectDistributor(dist);
    this.showMenu.set(false);
  }

  @HostListener('document:click')
  onOutsideClick() {
    this.showMenu.set(false);
  }

  private selectDistributor(dist: Distributor) {
    this.selected.set(dist);
    this.distContext.setSelectedDistributor(dist);
    this.distributorChange.emit(dist);
  }
}

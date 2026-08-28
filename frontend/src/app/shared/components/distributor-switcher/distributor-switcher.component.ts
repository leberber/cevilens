import { Component, OnInit, inject, output, HostListener, signal, computed } from '@angular/core';
import { RoleService } from '../../../core/services/role.service';
import { DistributorContextService } from '../../../core/services/distributor-context.service';
import { DistributorService } from '../../../core/services/distributor.service';
import { Distributor } from '../../../core/models/distributor.model';

/**
 * DistributorSwitcherComponent
 *
 * Shows "Données de vente · [Distributor Name]" as context.
 * - Non-platform-admin: static display of their own distributor.
 * - Platform admin: clickable dropdown to switch between all active distributors.
 *   Emits null to indicate "all distributors" (no filter).
 *
 * Usage:
 * <app-distributor-switcher (distributorChange)="onDistributeurChange($event)" />
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

  readonly displayName = computed(() => {
    if (this.isPlatformAdmin) {
      return this.selected()?.nom ?? null;
    }
    return this.distContext.distributor()?.nom ?? null;
  });

  readonly distributorChange = output<string | null>();

  ngOnInit() {
    if (this.isPlatformAdmin) {
      this.distService.listDistributors().subscribe(list => {
        const active = list.filter(d => d.is_active);
        this.distributors.set(active);
        // Always default to first distributor
        if (active.length > 0 && !this.selected()) {
          this.selected.set(active[0]);
          this.distributorChange.emit(active[0].nom);
        }
      });
    }
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.showMenu.update(v => !v);
  }

  select(dist: Distributor, event: Event) {
    event.stopPropagation();
    this.selected.set(dist);
    this.showMenu.set(false);
    this.distributorChange.emit(dist.nom);
  }

  @HostListener('document:click')
  onOutsideClick() {
    this.showMenu.set(false);
  }
}

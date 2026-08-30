import { Component, inject, output, HostListener, signal, computed } from '@angular/core';
import { RoleService } from '../../../core/services/role.service';
import { DistributorContextService } from '../../../core/services/distributor-context.service';
import { Distributor } from '../../../core/models/distributor.model';

@Component({
  selector: 'app-distributor-switcher',
  standalone: true,
  imports: [],
  templateUrl: './distributor-switcher.component.html',
})
export class DistributorSwitcherComponent {
  private readonly roleService = inject(RoleService);
  private readonly distContext = inject(DistributorContextService);

  readonly isPlatformAdmin = this.roleService.isPlatformAdmin();
  readonly showMenu = signal(false);

  readonly distributors = this.distContext.distributors;
  readonly selected = this.distContext.distributor;

  readonly displayName = computed(() =>
    this.distContext.distributor()?.nom ?? (this.isPlatformAdmin ? 'Sélectionner' : 'Aucun')
  );

  readonly distributorChange = output<Distributor | null>();

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.showMenu.update(v => !v);
  }

  select(dist: Distributor, event: Event) {
    event.stopPropagation();
    this.distContext.setSelectedDistributor(dist);
    this.distributorChange.emit(dist);
    this.showMenu.set(false);
  }

  @HostListener('document:click')
  onOutsideClick() {
    this.showMenu.set(false);
  }
}

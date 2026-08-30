import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { RoleService } from './role.service';
import { DistributorService } from './distributor.service';
import { Distributor } from '../models/distributor.model';

@Injectable({ providedIn: 'root' })
export class DistributorContextService {
  private readonly auth = inject(AuthService);
  private readonly roleService = inject(RoleService);
  private readonly distributorSvc = inject(DistributorService);

  private readonly currentDistributorSignal = signal<Distributor | null>(null);
  private readonly selectedDistributorIdSignal = signal<number | null>(null);

  readonly distributors = signal<Distributor[]>([]);

  readonly formattedName = computed(() => {
    const dist = this.currentDistributorSignal();
    return dist ? `${dist.code} - ${dist.nom}` : null;
  });

  readonly distributor = computed(() => this.currentDistributorSignal());
  readonly selectedDistributorId = computed(() => this.selectedDistributorIdSignal());

  constructor() {
    if (this.roleService.isPlatformAdmin()) {
      this.distributorSvc.listDistributors().subscribe(list => {
        const active = list.filter(d => d.is_active);
        this.distributors.set(active);
        if (active.length > 0) this.setSelectedDistributor(active[0]);
      });
    } else {
      const user = this.auth.currentUser();
      if (user?.distributor_id) {
        this.distributorSvc.getDistributor(user.distributor_id).subscribe({
          next: dist => this.currentDistributorSignal.set(dist),
          error: () => this.currentDistributorSignal.set(null),
        });
      }
    }
  }

  setSelectedDistributor(distributor: Distributor | null) {
    this.selectedDistributorIdSignal.set(distributor?.id ?? null);
    this.currentDistributorSignal.set(distributor);
  }

  refresh() {
    const user = this.auth.currentUser();
    if (user?.distributor_id) {
      this.distributorSvc.getDistributor(user.distributor_id).subscribe({
        next: dist => this.currentDistributorSignal.set(dist),
        error: () => this.currentDistributorSignal.set(null),
      });
    } else {
      this.currentDistributorSignal.set(null);
    }
  }
}

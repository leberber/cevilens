import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { DistributorService } from './distributor.service';
import { Distributor } from '../models/distributor.model';

/**
 * Manages global distributor context.
 * - For non-admin users: loads their assigned distributor
 * - For platform admins: tracks their selected distributor for filtering
 */
@Injectable({ providedIn: 'root' })
export class DistributorContextService {
  private readonly auth = inject(AuthService);
  private readonly distributorSvc = inject(DistributorService);

  private readonly currentDistributorSignal = signal<Distributor | null>(null);
  private readonly selectedDistributorIdSignal = signal<number | null>(null);

  readonly formattedName = computed(() => {
    const dist = this.currentDistributorSignal();
    return dist ? `${dist.code} - ${dist.nom}` : null;
  });

  readonly distributor = computed(() => this.currentDistributorSignal());
  readonly selectedDistributorId = computed(() => this.selectedDistributorIdSignal());

  constructor() {
    // Load distributor context on initialization
    this.loadDistributorContext();
  }

  /**
   * Load current user's distributor if not platform admin
   */
  private loadDistributorContext() {
    const user = this.auth.currentUser();
    if (user?.distributor_id) {
      this.distributorSvc.getDistributor(user.distributor_id).subscribe({
        next: (dist) => this.currentDistributorSignal.set(dist),
        error: () => this.currentDistributorSignal.set(null),
      });
    }
  }

  /**
   * Set the selected distributor for platform admin
   */
  setSelectedDistributor(distributor: Distributor | null) {
    this.selectedDistributorIdSignal.set(distributor?.id ?? null);
  }

  /**
   * Refresh distributor context (call after changes)
   */
  refresh() {
    const user = this.auth.currentUser();
    if (user?.distributor_id) {
      this.loadDistributorContext();
    } else {
      this.currentDistributorSignal.set(null);
    }
  }
}

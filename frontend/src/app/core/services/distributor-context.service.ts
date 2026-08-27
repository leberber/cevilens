import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { DistributorService } from './distributor.service';
import { Distributor } from '../models/distributor.model';

/**
 * Global distributor context service
 * Caches and provides distributor information to all components
 */
@Injectable({ providedIn: 'root' })
export class DistributorContextService {
  private auth = inject(AuthService);
  private distributorSvc = inject(DistributorService);

  // Signal to track the current distributor info
  private currentDistributorSignal = signal<Distributor | null>(null);

  // Computed to get formatted distributor name
  readonly formattedName = computed(() => {
    const dist = this.currentDistributorSignal();
    return dist ? `${dist.code} - ${dist.nom}` : null;
  });

  readonly distributor = computed(() => this.currentDistributorSignal());

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

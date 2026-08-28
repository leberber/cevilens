import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DistributorService } from '../../core/services/distributor.service';
import { AuthService } from '../../core/services/auth.service';
import { LoadingManager } from '../../core/services/loading-manager.service';
import { Distributor } from '../../core/models/distributor.model';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-distributors',
  standalone: true,
  imports: [CommonModule, PageLayoutComponent, EmptyStateComponent, LoadingStateComponent],
  templateUrl: './distributors.component.html',
  styleUrl: './distributors.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistributorsComponent implements OnInit {
  private distributorService = inject(DistributorService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private loadingManager = inject(LoadingManager);

  distributors: Distributor[] = [];
  loading = signal(true);
  error: string | null = null;

  ngOnInit() {
    // Only platform admin can view this
    if (this.authService.currentUser()?.role !== 'platform_admin') {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadDistributors();
  }

  loadDistributors() {
    this.error = null;
    this.loadingManager.load(
      this.loading,
      this.distributorService.listDistributors(),
      distributors => { this.distributors = distributors; },
      () => { this.error = 'Failed to load distributors'; }
    );
  }
}

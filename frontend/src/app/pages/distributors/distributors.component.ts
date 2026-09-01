import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { DistributorService } from '../../core/services/distributor.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Distributor } from '../../core/models/distributor.model';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';

@Component({
  selector: 'app-distributors',
  standalone: true,
  imports: [DatePipe, PageLayoutComponent, EmptyStateComponent, SkeletonLoaderComponent, StatusBadgeComponent, SearchInputComponent],
  templateUrl: './distributors.component.html',
  styleUrl: './distributors.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DistributorsComponent implements OnInit {
  private readonly distributorService = inject(DistributorService);
  private readonly authService        = inject(AuthService);
  private readonly notify             = inject(NotificationService);
  private readonly router             = inject(Router);
  private readonly destroyRef         = inject(DestroyRef);

  readonly loading      = signal(true);
  readonly error        = signal<string | null>(null);
  readonly distributors = signal<Distributor[]>([]);
  readonly search       = signal('');

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.distributors();
    return this.distributors().filter(d =>
      d.nom.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
    );
  });

  readonly subtitle = computed(() =>
    this.loading() ? '' : `${this.distributors().length} distributeur${this.distributors().length !== 1 ? 's' : ''}`
  );

  ngOnInit() {
    if (this.authService.currentUser()?.role !== 'platform_admin') {
      this.router.navigate(['/fdv-performance']);
      return;
    }
    this.load();
  }

  load() {
    this.error.set(null);
    this.loading.set(true);
    this.distributorService.listDistributors()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dists) => { this.distributors.set(dists); this.loading.set(false); },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.error?.detail ?? 'Impossible de charger les distributeurs';
          this.error.set(msg);
          this.notify.error(msg);
        },
      });
  }

  initials(nom: string): string {
    return nom.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}

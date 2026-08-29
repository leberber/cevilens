import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { RoleService } from '../../core/services/role.service';
import { UsersService } from '../../core/services/users.service';
import { DistributorService } from '../../core/services/distributor.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { User } from '../../core/models/user.model';
import { Distributor } from '../../core/models/distributor.model';
import { ROLE_LABELS, ROLE_BADGES } from '../../core/constants/roles';

interface DistributorStat {
  distributor: Distributor;
  total: number;
  active: number;
  admins: number;
  superviseurs: number;
  prevendeurs: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, PageLayoutComponent, EmptyStateComponent, SkeletonLoaderComponent, StatusBadgeComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  private readonly roleService        = inject(RoleService);
  private readonly router             = inject(Router);
  private readonly usersService       = inject(UsersService);
  private readonly distributorService = inject(DistributorService);
  private readonly notify             = inject(NotificationService);
  private readonly destroyRef         = inject(DestroyRef);

  readonly loading      = signal(true);
  readonly users        = signal<User[]>([]);
  readonly distributors = signal<Distributor[]>([]);

  readonly roleLabels = ROLE_LABELS;
  readonly roleBadges = ROLE_BADGES;

  // ── KPI counts ────────────────────────────────────────────────────────────
  readonly totalDistributors  = computed(() => this.distributors().length);
  readonly activeDistributors = computed(() => this.distributors().filter(d => d.is_active).length);
  readonly totalUsers         = computed(() => this.users().length);
  readonly activeUsers        = computed(() => this.users().filter(u => u.is_active).length);

  // ── Per-distributor breakdown ─────────────────────────────────────────────
  readonly distributorStats = computed((): DistributorStat[] => {
    const users = this.users();
    return this.distributors()
      .map(d => {
        const du = users.filter(u => u.distributor_id === d.id);
        return {
          distributor: d,
          total:       du.length,
          active:      du.filter(u => u.is_active).length,
          admins:      du.filter(u => u.role === 'distributor_admin').length,
          superviseurs:du.filter(u => u.role === 'superviseur').length,
          prevendeurs: du.filter(u => u.role === 'prevendeur' || u.role === 'prevender').length,
        };
      })
      .sort((a, b) => b.total - a.total);
  });

  // ── Recent additions (last 8) ─────────────────────────────────────────────
  readonly recentUsers = computed(() =>
    [...this.users()]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
  );

  private readonly distributorMap = computed(() =>
    new Map(this.distributors().map(d => [d.id, d.nom]))
  );

  ngOnInit() {
    if (!this.roleService.isPlatformAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.load();
  }

  load() {
    this.loading.set(true);
    forkJoin({
      distributors: this.distributorService.listDistributors(),
      users:        this.usersService.listAll(),
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: ({ distributors, users }) => {
        this.distributors.set(distributors);
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err?.error?.detail ?? 'Impossible de charger les données');
      },
    });
  }

  distributorName(id: number | null | undefined): string {
    if (!id) return '—';
    return this.distributorMap().get(id) ?? '—';
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}

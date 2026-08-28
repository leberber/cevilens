import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { RoleService } from '../../core/services/role.service';
import { LoadingManager } from '../../core/services/loading-manager.service';
import { UsersService } from '../../core/services/users.service';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { User, UserRole } from '../../core/models/user.model';
import { ROLE_LABELS, ROLE_BADGES } from '../../core/constants/roles';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, PageLayoutComponent, LoadingStateComponent, EmptyStateComponent, StatusBadgeComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private readonly roleService    = inject(RoleService);
  private readonly router         = inject(Router);
  private readonly loadingManager = inject(LoadingManager);
  private readonly usersService   = inject(UsersService);

  readonly users   = signal<User[]>([]);
  readonly loading = signal(true);
  readonly error   = signal<string | null>(null);

  readonly roles: UserRole[] = ['platform_admin', 'distributor_admin', 'superviseur', 'prevendeur'];
  readonly roleLabels = ROLE_LABELS;
  readonly roleBadges = ROLE_BADGES;

  ngOnInit() {
    if (!this.roleService.isPlatformAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.loadUsers();
  }

  loadUsers() {
    this.error.set(null);
    this.loadingManager.load(
      this.loading,
      this.usersService.listAll(),
      (users) => { this.users.set(users); },
      () => { this.error.set('Erreur lors du chargement des utilisateurs'); }
    );
  }

  getRoleCount(role: UserRole): number {
    return this.users().filter(u => u.role === role).length;
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { RoleService } from '../../core/services/role.service';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { User, UserRole } from '../../core/models/user.model';
import { ROLE_LABELS } from '../../core/constants/roles';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, PageLayoutComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private roleService = inject(RoleService);
  private router = inject(Router);

  users: User[] = [];
  loading = true;
  error: string | null = null;

  readonly roles: UserRole[] = ['platform_admin', 'distributor_admin', 'superviseur', 'prevendeur'];

  readonly roleLabels = ROLE_LABELS;

  readonly roleColors: Record<UserRole | string, string> = {
    platform_admin: '#ff6b6b',
    distributor_admin: '#4ecdc4',
    superviseur: '#45b7d1',
    prevendeur: '#ffeaa7',
    admin: '#ff6b6b',
    prevender: '#ffeaa7',
  };

  ngOnInit() {
    // Only platform admin can view this
    if (!this.roleService.isPlatformAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.error = null;
    this.http.get<User[]>('/api/v1/users/admin/all').subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load users';
        this.loading = false;
      },
    });
  }

  getRoleLabel(role: UserRole | string): string {
    return this.roleLabels[role] || role;
  }

  getRoleColor(role: UserRole | string): string {
    return this.roleColors[role] || '#999';
  }

  getRoleCount(role: UserRole): number {
    return this.users.filter(u => u.role === role).length;
  }
}

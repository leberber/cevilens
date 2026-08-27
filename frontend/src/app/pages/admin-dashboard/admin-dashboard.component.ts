import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { User, UserRole } from '../../core/models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);

  users: User[] = [];
  loading = true;
  error: string | null = null;

  readonly roles: UserRole[] = ['platform_admin', 'distributor_admin', 'superviseur', 'prevendeur'];

  roleLabels: Record<UserRole, string> = {
    platform_admin: '🔑 Platform Admin',
    distributor_admin: '📦 Distributor Admin',
    superviseur: '👮 Superviseur',
    prevendeur: '🚚 Prevendeur',
    // Legacy
    admin: '🔑 Admin (Legacy)',
    prevender: '🚚 Prevendeur (Legacy)',
  };

  roleColors: Record<UserRole, string> = {
    platform_admin: '#ff6b6b',
    distributor_admin: '#4ecdc4',
    superviseur: '#45b7d1',
    prevendeur: '#ffeaa7',
    admin: '#ff6b6b',
    prevender: '#ffeaa7',
  };

  ngOnInit() {
    // Only platform admin can view this
    if (this.authService.currentUser()?.role !== 'platform_admin' && this.authService.currentUser()?.role !== 'admin') {
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

  getRoleLabel(role: UserRole): string {
    return this.roleLabels[role] || role;
  }

  getRoleColor(role: UserRole): string {
    return this.roleColors[role] || '#999';
  }

  getRoleCount(role: UserRole): number {
    return this.users.filter(u => u.role === role).length;
  }
}

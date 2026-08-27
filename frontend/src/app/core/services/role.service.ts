import { Injectable, inject } from '@angular/core';
import { User, UserRole } from '../models/user.model';
import { AuthService } from './auth.service';
import { ROLE_LABELS, ROLE_BADGES, ROLE_HIERARCHY } from '../constants/roles';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private auth = inject(AuthService);

  /**
   * Check if user has platform admin role
   */
  isPlatformAdmin(user?: User | null): boolean {
    const u = user ?? this.auth.currentUser();
    const role = u?.role;
    return role === 'platform_admin' || role === 'admin';
  }

  /**
   * Check if user has distributor admin role
   */
  isDistributorAdmin(user?: User | null): boolean {
    const u = user ?? this.auth.currentUser();
    const role = u?.role;
    return role === 'distributor_admin' || role === 'admin';
  }

  /**
   * Check if user has superviseur role
   */
  isSuperviseur(user?: User | null): boolean {
    const u = user ?? this.auth.currentUser();
    return u?.role === 'superviseur';
  }

  /**
   * Check if user has prevendeur role
   */
  isPrevendeur(user?: User | null): boolean {
    const u = user ?? this.auth.currentUser();
    const role = u?.role;
    return role === 'prevendeur' || role === 'prevender';
  }

  /**
   * Check if user is admin-level (platform_admin or distributor_admin)
   */
  isAdmin(user?: User | null): boolean {
    const u = user ?? this.auth.currentUser();
    const role = u?.role;
    return role === 'platform_admin' || role === 'distributor_admin' || role === 'admin';
  }

  /**
   * Check if user is admin-level or superviseur
   */
  isAdminOrSuperviseur(user?: User | null): boolean {
    return this.isAdmin(user) || this.isSuperviseur(user);
  }

  /**
   * Get label for a role
   */
  getLabel(role: UserRole | string): string {
    return ROLE_LABELS[role] ?? role;
  }

  /**
   * Get badge CSS class for a role
   */
  getBadgeClass(role: UserRole | string): string {
    return ROLE_BADGES[role] ?? '';
  }

  /**
   * Get role hierarchy level (higher = more permissions)
   */
  getHierarchy(role: UserRole | string): number {
    return ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] ?? 0;
  }

  /**
   * Check if user can manage another user's role
   */
  canManageRole(targetRole: UserRole | string, user?: User | null): boolean {
    const u = user ?? this.auth.currentUser();
    if (!u) return false;

    // Platform admins can manage everyone
    if (this.isPlatformAdmin(u)) return true;

    // Distributor admins can manage their own distributor's non-admin users
    if (this.isDistributorAdmin(u)) {
      const targetHierarchy = this.getHierarchy(targetRole);
      const userHierarchy = this.getHierarchy(u.role);
      return targetHierarchy < userHierarchy;
    }

    return false;
  }
}

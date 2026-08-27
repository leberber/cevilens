import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { RoleService } from '../core/services/role.service';
import { DistributorContextService } from '../core/services/distributor-context.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.component.html',
})
export class LayoutComponent {
  collapsed  = signal(false);
  drawerOpen = signal(false);
  auth       = inject(AuthService);
  roleService = inject(RoleService);
  distributorContext = inject(DistributorContextService);

  // Computed signals
  distributorName = computed(() => this.distributorContext.formattedName());

  get user()             { return this.auth.currentUser(); }
  get isPlatformAdmin()  { return this.roleService.isPlatformAdmin(); }
  get isDistributorAdmin() { return this.roleService.isDistributorAdmin(); }
  get isSuperviseur()    { return this.roleService.isSuperviseur(); }
  get isPrevendeur()     { return this.roleService.isPrevendeur(); }

  logout() { this.auth.logout(); }
}

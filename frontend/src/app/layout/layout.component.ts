import { Component, inject, computed, signal, ViewEncapsulation } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { RoleService } from '../core/services/role.service';
import { DistributorContextService } from '../core/services/distributor-context.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [TitleCasePipe, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LayoutComponent {
  collapsed  = signal(false);
  drawerOpen = signal(false);
  readonly auth               = inject(AuthService);
  readonly roleService        = inject(RoleService);
  readonly distributorContext = inject(DistributorContextService);

  // Computed signals
  distributorName = computed(() => this.distributorContext.formattedName());

  get user()             { return this.auth.currentUser(); }
  get isPlatformAdmin()  { return this.roleService.isPlatformAdmin(); }
  get isDistributorAdmin() { return this.roleService.isDistributorAdmin(); }
  get isSuperviseur()    { return this.roleService.isSuperviseur(); }
  get isPrevendeur()     { return this.roleService.isPrevendeur(); }

  logout() { this.auth.logout(); }
}

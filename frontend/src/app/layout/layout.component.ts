import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { DistributorService } from '../core/services/distributor.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit {
  collapsed  = signal(false);
  drawerOpen = signal(false);
  auth       = inject(AuthService);
  distributorService = inject(DistributorService);
  distributorName = signal<string | null>(null);

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user?.distributor_id) {
      this.distributorService.getDistributor(user.distributor_id).subscribe({
        next: (dist) => this.distributorName.set(`${dist.code} - ${dist.nom}`),
        error: () => this.distributorName.set(null),
      });
    }
  }

  get user()             { return this.auth.currentUser(); }
  get isPlatformAdmin()  {
    const r = this.auth.currentUser()?.role;
    return r === 'platform_admin' || r === 'admin';
  }
  get isDistributorAdmin() {
    const r = this.auth.currentUser()?.role;
    return r === 'distributor_admin' || r === 'admin';
  }
  get isSuperviseur()    { return this.auth.currentUser()?.role === 'superviseur'; }
  get isPrevendeur()     {
    const r = this.auth.currentUser()?.role;
    return r === 'prevendeur' || r === 'prevender';
  }

  logout() { this.auth.logout(); }
}

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DistributorService } from '../../core/services/distributor.service';
import { AuthService } from '../../core/services/auth.service';
import { Distributor } from '../../core/models/distributor.model';

@Component({
  selector: 'app-distributors',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './distributors.component.html',
  styleUrl: './distributors.component.scss',
})
export class DistributorsComponent implements OnInit {
  private distributorService = inject(DistributorService);
  private authService = inject(AuthService);
  private router = inject(Router);

  distributors: Distributor[] = [];
  loading = true;
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
    this.loading = true;
    this.error = null;
    this.distributorService.listDistributors().subscribe({
      next: (distributors) => {
        this.distributors = distributors;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load distributors';
        this.loading = false;
      },
    });
  }
}

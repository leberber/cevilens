import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Toast } from 'primeng/toast';
import { sortItems, toggleSort } from '../../core/utils/sort.util';

import { UsersService } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';
import { RoleService } from '../../core/services/role.service';
import { DistributorService } from '../../core/services/distributor.service';
import { NotificationService } from '../../core/services/notification.service';
import { UtilityService } from '../../core/services/utility.service';
import { SearchFilterHelper } from '../../core/services/search-filter.helper';
import { ConfirmDialogHelper } from '../../core/services/confirm-dialog.helper';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { SortHeaderComponent } from '../../shared/components/sort-header/sort-header.component';
import { SearchInputComponent } from '../../shared/components/search-input/search-input.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { User } from '../../core/models/user.model';
import { ROLE_LABELS, ROLE_BADGES } from '../../core/constants/roles';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule, Toast, PageLayoutComponent, ConfirmDialogComponent, EmptyStateComponent, StatusBadgeComponent, SortHeaderComponent, SearchInputComponent, SkeletonLoaderComponent],
  templateUrl: './utilisateurs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UtilisateursComponent implements OnInit {
  private readonly usersService        = inject(UsersService);
  private readonly distributorService  = inject(DistributorService);
  private readonly notification        = inject(NotificationService);
  private readonly utility             = inject(UtilityService);
  private readonly searchFilter        = inject(SearchFilterHelper);
  private readonly confirmDialogHelper = inject(ConfirmDialogHelper);
  private readonly router              = inject(Router);
  private readonly destroyRef          = inject(DestroyRef);
  readonly auth                        = inject(AuthService);
  readonly roleService                 = inject(RoleService);

  // Signals for reactive state
  users = signal<User[]>([]);
  distributors = signal<any[]>([]);
  distributorMap = signal<Map<number, string>>(new Map());
  loading = signal(false);
  searchQuery = signal('');
  sortCol = signal('full_name');
  sortDir = signal<1 | -1>(1);

  editingPhoneId = signal<number | null>(null);
  editingPhoneValue = signal('');

  // Confirmation dialog state
  showConfirmDelete = signal(false);
  userToDelete = signal<User | null>(null);

  // Computed sorted/filtered users (memoized)
  sorted = computed(() => {
    const filtered = this.searchFilter.filterByFields(this.users(), this.searchQuery(), ['full_name', 'phone']);
    return sortItems(filtered, this.sortCol() as keyof User, this.sortDir());
  });

  readonly roleLabel = ROLE_LABELS;
  readonly roleBadge = ROLE_BADGES;

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase();
  }

  avatarClass(role: string): string {
    if (role === 'platform_admin' || role === 'admin') return 'table-user-avatar--admin';
    if (role === 'distributor_admin')                  return 'table-user-avatar--dist';
    if (role === 'superviseur')                        return 'table-user-avatar--sup';
    if (role === 'prevendeur' || role === 'prevender') return 'table-user-avatar--prev';
    return '';
  }

  sortBy(col: string) {
    const s = toggleSort(this.sortCol(), this.sortDir(), col);
    this.sortCol.set(s.col);
    this.sortDir.set(s.dir);
  }

  ngOnInit() {
    this.distributorService.listDistributors()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dists) => {
          this.distributors.set(dists);
          this.distributorMap.set(new Map(dists.map(d => [d.id, d.nom])));
        },
        error: () => {},
      });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.usersService.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => { this.users.set(data); this.loading.set(false); },
        error: () => { this.loading.set(false); this.notification.error('Erreur de chargement'); },
      });
  }

  openAdd() { this.router.navigate(['/utilisateurs/nouveau']); }

  openEdit(u: User) {
    this.router.navigate(['/utilisateurs', u.id, 'modifier'], { state: { utilisateur: u } });
  }

  confirmDelete(u: User): void {
    const state = this.confirmDialogHelper.createDeleteConfirm(u, u.full_name);
    this.userToDelete.set(state.item);
    this.showConfirmDelete.set(state.visible);
  }

  onDeleteConfirmed(): void {
    const user = this.userToDelete();
    if (!user) return;
    this.showConfirmDelete.set(false);
    this.usersService.delete(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.load(); this.notification.success('Utilisateur supprimé'); this.userToDelete.set(null); },
        error: e  => this.notification.showHttpError(e, 'Erreur'),
      });
  }

  onDeleteCancelled(): void {
    this.showConfirmDelete.set(false);
    this.userToDelete.set(null);
  }

  startEditPhone(u: User): void {
    this.editingPhoneId.set(u.id);
    this.editingPhoneValue.set(u.phone);
  }

  savePhone(u: User): void {
    const phone = this.editingPhoneValue().replace(/\s/g, '');
    if (!phone || phone === u.phone) { this.editingPhoneId.set(null); return; }
    this.usersService.update(u.id, { phone })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: updated => {
          u.phone = updated.phone;
          this.editingPhoneId.set(null);
        },
        error: e => this.notification.showHttpError(e, 'Erreur'),
      });
  }

  cancelEditPhone(): void { this.editingPhoneId.set(null); }

  formatPhone(phone: string): string {
    return this.utility.formatPhone(phone);
  }

  isSelf(u: User): boolean { return u.id === this.auth.currentUser()?.id; }

  getDistributorName(distributorId: number | null | undefined): string {
    if (!distributorId) return '—';
    return this.distributorMap().get(distributorId) ?? '—';
  }
}

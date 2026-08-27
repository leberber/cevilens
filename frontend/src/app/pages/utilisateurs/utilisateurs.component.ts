import { Component, OnInit, inject, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { User } from '../../core/models/user.model';
import { ROLE_LABELS, ROLE_BADGES } from '../../core/constants/roles';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule, Toast, PageLayoutComponent, ConfirmDialogComponent],
  templateUrl: './utilisateurs.component.html',
})
export class UtilisateursComponent implements OnInit {
  private usersService        = inject(UsersService);
  private distributorService  = inject(DistributorService);
  private notification        = inject(NotificationService);
  private utility             = inject(UtilityService);
  private searchFilter        = inject(SearchFilterHelper);
  private confirmDialogHelper = inject(ConfirmDialogHelper);
  private router              = inject(Router);
  auth                        = inject(AuthService);
  roleService                 = inject(RoleService);

  users: User[] = [];
  distributors: any[] = [];
  distributorMap: Map<number, string> = new Map();
  loading = false;
  searchQuery = '';
  sortCol = 'full_name';
  sortDir: 1 | -1 = 1;

  editingPhoneId: number | null = null;
  editingPhoneValue = '';

  // Confirmation dialog state
  showConfirmDelete = false;
  userToDelete: User | null = null;

  @ViewChild('toolbarContent') toolbarContent!: TemplateRef<any>;

  readonly roleLabel = ROLE_LABELS;
  readonly roleBadge = ROLE_BADGES;

  get sorted(): User[] {
    const filtered = this.searchFilter.filterByFields(this.users, this.searchQuery, ['full_name', 'phone']);
    return sortItems(filtered, this.sortCol as keyof User, this.sortDir);
  }

  sortBy(col: string) {
    const s = toggleSort(this.sortCol, this.sortDir, col);
    this.sortCol = s.col; this.sortDir = s.dir;
  }

  ngOnInit() {
    this.distributorService.listDistributors().subscribe({
      next: (dists) => {
        this.distributors = dists;
        this.distributorMap = new Map(dists.map(d => [d.id, `${d.code} - ${d.nom}`]));
      },
      error: () => console.error('Failed to load distributors'),
    });
    this.load();
  }

  load() {
    this.loading = true;
    this.usersService.list().subscribe({
      next: data => { this.users = data; this.loading = false; },
      error: () => { this.loading = false; this.notification.error('Erreur de chargement'); },
    });
  }

  openAdd() { this.router.navigate(['/utilisateurs/nouveau']); }

  openEdit(u: User) {
    this.router.navigate(['/utilisateurs', u.id, 'modifier'], { state: { utilisateur: u } });
  }

  confirmDelete(u: User): void {
    const state = this.confirmDialogHelper.createDeleteConfirm(u, u.full_name);
    this.userToDelete = state.item;
    this.showConfirmDelete = state.visible;
  }

  onDeleteConfirmed(): void {
    if (!this.userToDelete) return;
    const user = this.userToDelete;
    this.showConfirmDelete = false;
    this.usersService.delete(user.id).subscribe({
      next: () => { this.load(); this.notification.success('Utilisateur supprimé'); this.userToDelete = null; },
      error: e  => this.notification.showHttpError(e, 'Erreur'),
    });
  }

  onDeleteCancelled(): void {
    this.showConfirmDelete = false;
    this.userToDelete = null;
  }

  startEditPhone(u: User): void {
    this.editingPhoneId = u.id;
    this.editingPhoneValue = u.phone;
  }

  savePhone(u: User): void {
    const phone = this.editingPhoneValue.replace(/\s/g, '');
    if (!phone || phone === u.phone) { this.editingPhoneId = null; return; }
    this.usersService.update(u.id, { phone }).subscribe({
      next: updated => {
        u.phone = updated.phone;
        this.editingPhoneId = null;
      },
      error: e => this.notification.showHttpError(e, 'Erreur'),
    });
  }

  cancelEditPhone(): void { this.editingPhoneId = null; }

  get isAdmin(): boolean { return this.auth.isAdmin; }

  formatPhone(phone: string): string {
    return this.utility.formatPhone(phone);
  }

  isSelf(u: User): boolean { return u.id === this.auth.currentUser()?.id; }

  getDistributorName(distributorId: number | null | undefined): string {
    if (!distributorId) return '—';
    return this.distributorMap.get(distributorId) ?? '—';
  }
}

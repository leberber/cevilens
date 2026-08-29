import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { ObjectifsUploadDialogComponent } from './components/objectifs-upload-dialog.component';
import { RoleService } from '../../core/services/role.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-objectifs',
  standalone: true,
  imports: [CommonModule, PageLayoutComponent, ObjectifsUploadDialogComponent],
  template: `
    <app-page-layout
      icon="pi-bullseye"
      title="Objectifs"
      subtitle="Définir et gérer les objectifs de vente"
      [actions]="actionsTemplate">
    </app-page-layout>

    <ng-template #actionsTemplate>
      <button class="btn-define-objectifs" (click)="showUploadDialog.set(true)">
        <i class="pi pi-plus"></i> Définir les objectifs
      </button>
    </ng-template>

    <!-- Upload Dialog -->
    <app-objectifs-upload-dialog
      [visible]="showUploadDialog()"
      (visibleChange)="showUploadDialog.set($event)"
      (close)="showUploadDialog.set(false)">
    </app-objectifs-upload-dialog>
  `,
  styles: [`
    .btn-define-objectifs {
      background: linear-gradient(135deg, #FFB81C, #FF9500);
      color: #1a1a1a;
      border: none;
      border-radius: var(--radius-md);
      padding: 0.7rem 1.5rem;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(255, 184, 28, 0.3);
    }

    .btn-define-objectifs:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(255, 184, 28, 0.4);
    }

    .btn-define-objectifs:active {
      transform: translateY(0);
    }
  `],
})
export class ObjectifsComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly showUploadDialog = signal(false);
  readonly isPlatformAdmin = this.roleService.isPlatformAdmin();

  ngOnInit() {
    // Initialize component
  }
}

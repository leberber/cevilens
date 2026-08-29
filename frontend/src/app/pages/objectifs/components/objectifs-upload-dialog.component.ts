import { Component, Input, Output, EventEmitter, ViewChild, inject, signal, computed, OnInit, AfterViewInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { HttpClient } from '@angular/common/http';
import { DistributorContextService } from '../../../core/services/distributor-context.service';
import { RoleService } from '../../../core/services/role.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Distributor } from '../../../core/models/distributor.model';
import { UploadComponent } from '../../upload/upload.component';

@Component({
  selector: 'app-objectifs-upload-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, Select, TooltipModule, UploadComponent],
  template: `
    <p-dialog
      [visible]="visible"
      [modal]="true"
      [header]="'Ajouter les objectifs'"
      [style]="{ width: '1000px' }"
      [styleClass]="'objectifs-dialog'"
      (visibleChange)="onVisibleChange($event)">

      <div class="objectifs-dialog-content">

        <!-- Header with Config Info -->
        <div class="dialog-header">
          <div class="header-left">
            <div class="header-meta">
              @if (isPlatformAdmin) {
                <div class="distributor-select-wrapper">
                  <i class="pi pi-building"></i>
                  <p-select
                    [options]="distributors()"
                    [(ngModel)]="selectedDistributor"
                    optionLabel="nom"
                    optionValue="id"
                    (onChange)="selectedDistributor !== null && onDistributorChange(selectedDistributor)"
                    placeholder="Sélectionner..."
                    [showClear]="false"
                    [filter]="true"
                    class="glass-select"
                    panelStyleClass="glass-panel">
                  </p-select>
                </div>
              } @else {
                <span class="meta-item">
                  <i class="pi pi-building"></i>
                  {{ distributorName() || 'Chargement...' }}
                </span>
              }
              @if (!loadingCounts()) {
                <div class="prevendeur-select-wrapper">
                  <i class="pi pi-users"></i>
                  <span class="canal-type-label">Sélectionner type de vente</span>
                  <button class="canal-btn" [class.active]="selectedCanal() === 'VD'" (click)="selectedCanal.set('VD')" type="button">
                    @if (selectedCanal() === 'VD') { <i class="pi pi-check"></i> }
                    VD: <strong>{{ prevendeurVDValue }}</strong>
                  </button>
                  <span class="prevendeur-separator">|</span>
                  <button class="canal-btn" [class.active]="selectedCanal() === 'VH'" (click)="selectedCanal.set('VH')" type="button">
                    @if (selectedCanal() === 'VH') { <i class="pi pi-check"></i> }
                    VH: <strong>{{ prevendeurVHValue }}</strong>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Main Upload Area -->
        <div class="upload-zone-wrapper">
          <app-upload #uploadComponent [selectedCanal]="selectedCanal()"></app-upload>
        </div>

        <!-- Error Message -->
        @if (errorMessage()) {
          <div class="error-message">
            <i class="pi pi-exclamation-circle"></i>
            {{ errorMessage() }}
          </div>
        }

        <!-- Footer -->
        <div class="dialog-footer">
          <button class="btn-secondary" type="button" (click)="onDialogClose()" [disabled]="loadingCounts()">
            Annuler
          </button>
          <button class="btn-primary" type="button" (click)="onImport()" [disabled]="isImportDisabled()">
            <i class="pi pi-upload"></i> Importer
          </button>
        </div>

      </div>

    </p-dialog>
  `,
  styles: [`
    :host ::ng-deep .objectifs-dialog .p-dialog-content {
      padding: 2rem;
    }

    .objectifs-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin: 0 -2rem -2rem -2rem;
      padding: 0;
    }

    .dialog-header {
      border-bottom: 1px solid var(--surface-border);
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .header-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.9rem;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-color-secondary);
    }

    .meta-item i {
      color: var(--primary-color);
      font-size: 1rem;
    }

    .meta-item strong {
      color: var(--primary-color);
      font-weight: 700;
    }

    .distributor-select-wrapper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 1.2rem;
      background: rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: none;
      border-radius: var(--radius-lg);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .distributor-select-wrapper:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    .distributor-select-wrapper i {
      color: var(--primary-color);
      font-size: 1rem;
      flex-shrink: 0;
    }

    :host ::ng-deep .distributor-select-wrapper .glass-select {
      width: auto !important;
      flex: 1;
    }

    :host ::ng-deep .distributor-select-wrapper .glass-select .p-select {
      border: none !important;
      background: transparent !important;
      padding: 0 !important;
      height: auto;
      box-shadow: none !important;
      outline: none !important;
      --p-select-shadow: none !important;
    }

    :host ::ng-deep .distributor-select-wrapper .glass-select .p-inputwrapper {
      border: none !important;
    }

    :host ::ng-deep .distributor-select-wrapper .glass-select .p-select-label {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--text-color);
      padding: 0 !important;
    }

    :host ::ng-deep .distributor-select-wrapper .glass-select .p-select-trigger {
      background: transparent !important;
      border: none !important;
      color: var(--text-color-secondary);
      width: auto;
      padding: 0 !important;
    }

    :host ::ng-deep .distributor-select-wrapper .p-inputwrapper-filled .p-select-label {
      font-weight: 600;
    }

    :host ::ng-deep .distributor-select-wrapper .p-component {
      border: none !important;
    }

    .prevendeur-select-wrapper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 1.2rem;
      background: rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: none;
      border-radius: var(--radius-lg);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .prevendeur-select-wrapper:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    .prevendeur-select-wrapper i {
      color: var(--primary-color);
      font-size: 1rem;
      flex-shrink: 0;
    }

    .prevendeur-text {
      font-size: 0.9rem;
      color: var(--text-color-secondary);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .prevendeur-text strong {
      color: var(--primary-color);
      font-weight: 700;
    }

    .prevendeur-separator {
      color: var(--surface-border);
      font-weight: 300;
      margin: 0 0.25rem;
    }

    :host ::ng-deep .glass-panel {
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.7) !important;
      border: 1px solid rgba(var(--primary-rgb), 0.2) !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
    }

    :host ::ng-deep .glass-panel .p-select-items {
      padding: 0.5rem 0;
    }

    :host ::ng-deep .glass-panel .p-select-item {
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
    }

    :host ::ng-deep .glass-panel .p-select-item:hover {
      background: rgba(var(--primary-rgb), 0.1);
    }

    .upload-zone-wrapper {
      flex: 1;
      padding: 4rem;
      min-height: 400px;
      align-items: center;
      justify-content: center;
    }

    .dialog-footer {
      padding: 2rem;
      border-top: 1px solid var(--surface-border);
      background: var(--surface-card);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.5rem;
      border: none;
      background: var(--primary-color);
      color: white;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, var(--primary-color), rgba(var(--primary-rgb), 0.8));
      box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
      transform: translateY(-2px);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }

    .canal-btn {
      background: none;
      border: none;
      color: var(--text-color-secondary);
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s ease;
    }

    .canal-btn:hover {
      color: var(--primary-color);
    }

    .canal-btn.active {
      color: var(--primary-color);
      font-weight: 700;
    }

    .canal-btn i {
      font-size: 0.8rem;
    }

    .canal-type-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-color-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      opacity: 0.7;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 2rem;
      background: rgba(var(--red-rgb), 0.1);
      border-left: 4px solid var(--red-500);
      color: var(--red-600);
      font-size: 0.9rem;
      font-weight: 500;
    }

    .error-message i {
      font-size: 1rem;
      color: var(--red-500);
    }

    :host ::ng-deep .upload-zone-wrapper .upload-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: auto;
      padding: 0;
      margin: 0;
    }

    :host ::ng-deep .upload-zone-wrapper .upload-page .upload-card__header {
      display: none;
    }

    :host ::ng-deep .upload-zone-wrapper .upload-page .stats-grid {
      display: none;
    }

    :host ::ng-deep .upload-zone-wrapper .upload-page .progress-section {
      display: none;
    }

    :host ::ng-deep .upload-zone-wrapper .upload-page .overlap-box {
      display: none;
    }

    :host ::ng-deep .upload-zone-wrapper .upload-page .upload-result {
      display: none;
    }

    :host ::ng-deep .upload-zone-wrapper input[type="file"] {
      display: none;
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone {
      margin: 0;
      width: 100%;
      min-height: 280px;
      border: 2px solid var(--primary-color);
      border-radius: var(--radius-lg);
      background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.15), rgba(var(--primary-rgb), 0.08));
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      padding: 3rem 2rem;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(var(--primary-rgb), 0.1);
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 20% 50%, rgba(var(--primary-rgb), 0.12), transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(var(--primary-rgb), 0.12), transparent 50%);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone:hover::before {
      opacity: 1;
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone:hover {
      border-color: var(--primary-color);
      background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.22), rgba(var(--primary-rgb), 0.15));
      box-shadow: 0 16px 48px rgba(var(--primary-rgb), 0.25),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transform: translateY(-3px);
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone.drop-zone--over {
      border-color: var(--primary-color);
      background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.28), rgba(var(--primary-rgb), 0.2));
      box-shadow: 0 20px 56px rgba(var(--primary-rgb), 0.35),
                  inset 0 1px 0 rgba(255, 255, 255, 0.15);
      transform: translateY(-6px);
      border-width: 3px;
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone__icon {
      font-size: 3.5rem;
      color: var(--primary-color);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      filter: drop-shadow(0 2px 8px rgba(var(--primary-rgb), 0.2));
      position: relative;
      z-index: 2;
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone:hover .drop-zone__icon {
      transform: scale(1.2) translateY(-5px);
      filter: drop-shadow(0 6px 16px rgba(var(--primary-rgb), 0.35));
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone.drop-zone--over .drop-zone__icon {
      transform: scale(1.3) translateY(-8px);
      filter: drop-shadow(0 8px 24px rgba(var(--primary-rgb), 0.45));
      animation: icon-float 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes icon-float {
      0% {
        transform: scale(1.3) translateY(-8px);
        opacity: 1;
      }
      50% {
        transform: scale(1.38) translateY(-12px);
      }
      100% {
        transform: scale(1.3) translateY(-8px);
      }
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone__text {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-color);
      letter-spacing: -0.3px;
      transition: color 0.3s ease;
      position: relative;
      z-index: 2;
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone:hover .drop-zone__text {
      color: var(--primary-color);
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone__hint {
      font-size: 0.95rem;
      color: var(--text-color-secondary);
      font-weight: 500;
      transition: color 0.3s ease;
      position: relative;
      z-index: 2;
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone:hover .drop-zone__hint {
      color: var(--text-color);
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone__badges {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.75rem;
      position: relative;
      z-index: 2;
      flex-wrap: wrap;
      justify-content: center;
    }

    :host ::ng-deep .upload-zone-wrapper .upload-badge {
      padding: 0.6rem 1.2rem;
      background: var(--primary-color);
      border: none;
      border-radius: var(--radius-md);
      font-size: 0.75rem;
      font-weight: 700;
      color: white;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone:hover .upload-badge {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(var(--primary-rgb), 0.45);
    }

    :host ::ng-deep .upload-zone-wrapper .drop-zone.drop-zone--over .upload-badge {
      transform: translateY(-4px);
      box-shadow: 0 10px 28px rgba(var(--primary-rgb), 0.5);
    }

    .canal-required-message {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 3rem 2rem;
      min-height: 280px;
      border: 2px dashed var(--surface-300);
      border-radius: 1.25rem;
      background: var(--surface-ground);
      color: var(--text-color-secondary);
      font-size: 0.95rem;
      font-weight: 500;

      i {
        font-size: 1.5rem;
        color: var(--primary-color);
      }
    }

  `],
})
export class ObjectifsUploadDialogComponent implements OnInit, AfterViewInit {
  private readonly http = inject(HttpClient);
  private readonly distContext = inject(DistributorContextService);
  private readonly roleService = inject(RoleService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<void>();
  @ViewChild(UploadComponent) uploadComponent!: UploadComponent;

  readonly isPlatformAdmin = this.roleService.isPlatformAdmin();
  readonly loadingCounts = signal(false);
  readonly distributors = signal<Distributor[]>([]);
  readonly selectedCanal = signal<'VD' | 'VH' | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isImportDisabled = computed(() => {
    if (!this.selectedCanal()) return true;
    if (!this.uploadComponent || !this.uploadComponent.selectedFile()) return true;
    return false;
  });

  prevendeurVDValue = 0;
  prevendeurVHValue = 0;
  selectedDistributor: number | null = null;

  readonly distributorName = computed(() => this.distContext.formattedName());

  ngOnInit() {
    if (this.isPlatformAdmin) {
      this.loadDistributors();
    } else {
      this.loadPrevendeurCounts();
    }
  }

  ngAfterViewInit() {
    if (this.uploadComponent) {
      this.uploadComponent.autoUpload = false;
    }
  }

  private loadDistributors() {
    this.http.get<Distributor[]>('/api/v1/distributors')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dists) => {
          this.distributors.set(dists);
          if (dists.length > 0) {
            this.selectedDistributor = dists[0].id;
            this.loadPrevendeurCounts();
          }
        },
        error: () => {
          this.notify.error('Erreur lors du chargement des distributeurs');
        }
      });
  }

  onDistributorChange(distributorId: number) {
    this.selectedDistributor = distributorId;
    this.loadPrevendeurCounts();
  }

  private loadPrevendeurCounts() {
    this.loadingCounts.set(true);

    // Query users table for prevendeurs by canal
    this.http.get<Record<string, unknown>[]>(`/api/v1/users?role=prevendeur`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.countPrevendeursFromUsers(users);
          this.loadingCounts.set(false);
        },
        error: () => {
          this.loadingCounts.set(false);
          this.notify.error('Erreur lors de la détection des prévendeurs');
        }
      });
  }

  private countPrevendeursFromUsers(users: Record<string, unknown>[]) {
    let vdCount = 0;
    let vhCount = 0;

    for (const user of users) {
      const canal = user['canal'];
      if (canal === 'VD') {
        vdCount++;
      } else if (canal === 'VH') {
        vhCount++;
      }
    }

    this.prevendeurVDValue = vdCount;
    this.prevendeurVHValue = vhCount;
  }

  onVisibleChange(value: boolean) {
    if (!value) {
      this.visibleChange.emit(false);
      this.close.emit();
    }
  }

  onDialogClose() {
    this.visibleChange.emit(false);
    this.close.emit();
  }

  onImport() {
    if (this.uploadComponent && this.selectedCanal()) {
      this.uploadComponent.uploadObjectives(this.selectedCanal()!);
    }
  }
}

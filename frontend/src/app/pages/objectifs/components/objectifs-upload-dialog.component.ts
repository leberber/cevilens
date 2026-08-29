import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter, ViewChild, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { HttpClient } from '@angular/common/http';
import { DistributorContextService } from '../../../core/services/distributor-context.service';
import { RoleService } from '../../../core/services/role.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Distributor } from '../../../core/models/distributor.model';
import { UploadComponent } from '../../upload/upload.component';

@Component({
  selector: 'app-objectifs-upload-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, Select, UploadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible"
      [modal]="true"
      [header]="uploadComponent?.result()?.success ? 'Import réussi' : confirmState().visible ? 'Confirmation — Ajouter les objectifs' : 'Ajouter les objectifs'"
      [style]="{ width: '1000px' }"
      [styleClass]="'objectifs-dialog'"
      (visibleChange)="onVisibleChange($event)">

      <div class="objectifs-dialog-content">

        <!-- Header -->
        @if (!confirmState().visible && !uploadComponent?.result()?.success) {
        <div class="dialog-header">
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
            @if (!loadingCounts() && !confirmState().visible) {
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
        }

        <!-- Upload view (always mounted so @ViewChild stays valid) -->
        <div class="upload-zone-wrapper" [hidden]="confirmState().visible">
          <app-upload #uploadComponent [autoUpload]="false" [selectedCanal]="selectedCanal()" [successStyle]="'overlay'"></app-upload>
        </div>

        <!-- Confirmation view -->
        @if (confirmState().visible) {
          <div class="confirmation-body">
            <div class="confirm-icon">
              <i class="pi pi-file-check"></i>
            </div>
            <div class="confirm-summary">
              <div class="confirm-row">
                <span class="confirm-label"><i class="pi pi-building"></i> Distributeur</span>
                <span class="confirm-value">{{ confirmState().distributor }}</span>
              </div>
              <div class="confirm-row">
                <span class="confirm-label"><i class="pi pi-tag"></i> Canal</span>
                <span class="confirm-value">
                  <span class="canal-chip" [class.canal-chip--vd]="confirmState().canal === 'VD'" [class.canal-chip--vh]="confirmState().canal === 'VH'">
                    {{ confirmState().canal === 'VD' ? 'VD — Vente Directe' : 'VH — Vente Horeca' }}
                  </span>
                </span>
              </div>
              <div class="confirm-row">
                <span class="confirm-label"><i class="pi pi-calendar"></i> Période</span>
                <span class="confirm-value">
                  @if (confirmState().mois && confirmState().annee) {
                    {{ confirmState().mois | number: '2.0-0' }}/{{ confirmState().annee }}
                  } @else { N/A }
                </span>
              </div>
              <div class="confirm-row">
                <span class="confirm-label"><i class="pi pi-users"></i> Prévendeurs</span>
                <span class="confirm-value">{{ confirmState().routeCount }}</span>
              </div>
              <div class="confirm-row confirm-row--clickable" (click)="productsExpanded.set(!productsExpanded())">
                <span class="confirm-label"><i class="pi pi-box"></i> Produits</span>
                <span class="confirm-value confirm-value--toggle">
                  @if (confirmState().rowCount) {
                    <span>{{ confirmState().rowCount | number }}</span>
                  } @else { <span>N/A</span> }
                  <i class="pi" [class.pi-chevron-down]="!productsExpanded()" [class.pi-chevron-up]="productsExpanded()"></i>
                </span>
              </div>
              @if (productsExpanded()) {
                <div class="confirm-products-table-wrap">
                  <table class="confirm-products-table">
                    <thead>
                      <tr>
                        @for (h of confirmState().headers; track h) {
                          @if (h) { <th>{{ h }}</th> }
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of confirmState().products; track $index) {
                        <tr>
                          @for (h of confirmState().headers; track h) {
                            @if (h) { <td>{{ p[h] ?? '—' }}</td> }
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
            @if (confirmState().routeCount > 0) {
              <div class="confirm-calc-note">
                <i class="pi pi-info-circle"></i>
                Objectif par prévendeur&nbsp;=&nbsp;Total&nbsp;÷&nbsp;{{ confirmState().routeCount }}&nbsp;prévendeurs
              </div>
            }
          </div>
        }

        <!-- Footer -->
        <div class="dialog-footer">
          @if (uploadComponent?.result()?.success) {
            <button class="btn-secondary" type="button" (click)="onDialogClose()">
              <i class="pi pi-times"></i> Fermer
            </button>
          } @else if (confirmState().visible) {
            <button class="btn-secondary" type="button" (click)="onCancelConfirm()">
              <i class="pi pi-arrow-left"></i> Retour
            </button>
            <button class="btn-primary" type="button" (click)="onConfirmImport()">
              <i class="pi pi-check"></i> Confirmer l'import
            </button>
          } @else {
            <button class="btn-secondary" type="button" (click)="onDialogClose()" [disabled]="loadingCounts()">
              Annuler
            </button>
            <button class="btn-primary" type="button" (click)="onImport()" [disabled]="isImportDisabled() || isConfirming()">
              @if (isConfirming()) { <i class="pi pi-spin pi-spinner"></i> } @else { <i class="pi pi-upload"></i> }
              Importer
            </button>
          }
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
      padding: 1rem 2rem;
      border-bottom: 1px solid var(--surface-border);
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

    .upload-zone-wrapper[hidden] {
      display: none !important;
    }

    .dialog-footer {
      padding: 2rem;
      border-top: 1px solid var(--surface-border);
      background: var(--surface-card);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
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

    .confirmation-body {
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }

    .confirm-icon {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      background: linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, #6366f1));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px color-mix(in srgb, var(--primary-color) 30%, transparent);

      i {
        font-size: 1.75rem;
        color: white;
      }
    }

    .confirm-summary {
      width: 100%;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--surface-border);
      border-radius: 0.875rem;
      overflow: hidden;
    }

    .confirm-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1.25rem;
      background: var(--surface-card);
      border-bottom: 1px solid var(--surface-border);

      &:last-child {
        border-bottom: none;
      }
    }

    .confirm-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-color-secondary);
      font-weight: 500;

      i {
        color: var(--primary-color);
        font-size: 0.875rem;
      }
    }

    .confirm-value {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-color);
    }

    .canal-chip {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.9rem;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.02em;

      &--vd {
        background: color-mix(in srgb, var(--primary-color) 15%, transparent);
        color: var(--primary-color);
        border: 1px solid color-mix(in srgb, var(--primary-color) 30%, transparent);
      }

      &--vh {
        background: color-mix(in srgb, #8b5cf6 15%, transparent);
        color: #7c3aed;
        border: 1px solid color-mix(in srgb, #8b5cf6 30%, transparent);
      }
    }

    .confirm-calc-note {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.7rem 1rem;
      border-radius: 0.625rem;
      background: color-mix(in srgb, var(--primary-color) 6%, var(--surface-ground));
      border: 1px dashed color-mix(in srgb, var(--primary-color) 25%, transparent);
      font-size: 0.8rem;
      color: var(--text-color-secondary);
      width: 100%;

      i {
        color: var(--primary-color);
        flex-shrink: 0;
      }
    }

    .confirm-value--toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      i {
        font-size: 0.75rem;
        color: var(--text-color-secondary);
        transition: transform 0.2s ease;
      }
    }

    .confirm-row--clickable {
      cursor: pointer;
      user-select: none;
      transition: background 0.15s ease;

      &:hover {
        background: color-mix(in srgb, var(--primary-color) 5%, var(--surface-card));
      }
    }

    .confirm-products-table-wrap {
      max-height: 220px;
      overflow: auto;
      background: var(--surface-ground);
      border-bottom: 1px solid var(--surface-border);
    }

    .confirm-products-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;

      th {
        position: sticky;
        top: 0;
        background: var(--surface-200);
        color: var(--text-color-secondary);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 0.45rem 0.85rem;
        text-align: left;
        white-space: nowrap;
        border-bottom: 1px solid var(--surface-border);
      }

      td {
        padding: 0.35rem 0.85rem;
        color: var(--text-color);
        border-bottom: 1px solid var(--surface-100);
        white-space: nowrap;
      }

      tbody tr:last-child td {
        border-bottom: none;
      }

      tbody tr:hover td {
        background: color-mix(in srgb, var(--primary-color) 4%, var(--surface-ground));
      }
    }

    .btn-secondary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--surface-300);
      color: var(--text-color);
      border: none;
      border-radius: var(--radius-md);
      padding: 0.625rem 1.5rem;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: var(--surface-400);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
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

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, var(--primary-color), rgba(var(--primary-rgb), 0.8));
        box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
        transform: translateY(-2px);
      }

      &:active:not(:disabled) {
        transform: translateY(0);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        box-shadow: none;
      }
    }

  `],
})
export class ObjectifsUploadDialogComponent implements OnInit {
  private readonly http       = inject(HttpClient);
  private readonly distContext = inject(DistributorContextService);
  private readonly roleService = inject(RoleService);
  private readonly notify      = inject(NotificationService);
  private readonly destroyRef  = inject(DestroyRef);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<void>();
  @ViewChild(UploadComponent) uploadComponent!: UploadComponent;

  readonly isPlatformAdmin = this.roleService.isPlatformAdmin();
  readonly loadingCounts = signal(false);
  readonly distributors = signal<Distributor[]>([]);
  readonly selectedCanal = signal<'VD' | 'VH' | null>(null);
  readonly isImportDisabled = computed(() => {
    if (!this.selectedCanal()) return true;
    if (!this.uploadComponent || !this.uploadComponent.selectedFile()) return true;
    return false;
  });

  readonly confirmState = signal<{
    visible: boolean;
    distributor: string;
    mois: number | null;
    annee: number | null;
    rowCount: number | null;
    canal: 'VD' | 'VH' | null;
    routeCount: number;
    headers: string[];
    products: Record<string, unknown>[];
  }>({ visible: false, distributor: '', mois: null, annee: null, rowCount: null, canal: null, routeCount: 0, headers: [], products: [] });

  readonly productsExpanded = signal(false);

  readonly isConfirming = signal(false);

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

    const distParam = this.selectedDistributor ? `&distributor_id=${this.selectedDistributor}` : '';
    this.http.get<Record<string, unknown>[]>(`/api/v1/users?role=prevendeur${distParam}`)
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
      this.resetDialog();
      this.visibleChange.emit(false);
      this.close.emit();
    }
  }

  onDialogClose() {
    this.resetDialog();
    this.visibleChange.emit(false);
    this.close.emit();
  }

  private resetDialog() {
    this.uploadComponent?.reset();
    this.confirmState.set({ visible: false, distributor: '', mois: null, annee: null, rowCount: null, canal: null, routeCount: 0, headers: [], products: [] });
    this.productsExpanded.set(false);
    this.selectedCanal.set(null);
  }

  async onImport() {
    if (!this.uploadComponent || !this.selectedCanal()) return;

    this.isConfirming.set(true);
    const preview = await this.uploadComponent.previewObjectifsFile(this.selectedCanal()!);
    this.isConfirming.set(false);

    if (!preview) {
      this.notify.error('Impossible de lire le fichier');
      return;
    }

    const distributor = this.isPlatformAdmin && this.selectedDistributor
      ? this.distributors().find(d => d.id === this.selectedDistributor)?.nom || 'Inconnu'
      : this.distributorName() || 'Distributeur';

    const canal = this.selectedCanal()!;
    const routeCount = canal === 'VD' ? this.prevendeurVDValue : this.prevendeurVHValue;
    this.productsExpanded.set(false);
    this.confirmState.set({
      visible: true,
      distributor,
      mois: preview.mois,
      annee: preview.annee,
      rowCount: preview.rowCount,
      canal,
      routeCount,
      headers: preview.headers,
      products: preview.products,
    });
  }

  onConfirmImport() {
    const state = this.confirmState();
    if (this.uploadComponent && state.canal) {
      const routeCount = state.canal === 'VD' ? this.prevendeurVDValue : this.prevendeurVHValue;
      this.confirmState.update(s => ({ ...s, visible: false }));
      this.uploadComponent.uploadObjectives(state.canal as 'VD' | 'VH', this.selectedDistributor || undefined, routeCount || 1);
    }
  }

  onCancelConfirm() {
    this.confirmState.update(s => ({ ...s, visible: false }));
  }
}

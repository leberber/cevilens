import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Dialog } from 'primeng/dialog';
import { VentesService } from '../../../core/services/ventes.service';
import { AuthService } from '../../../core/services/auth.service';
import { DistributorContextService } from '../../../core/services/distributor-context.service';
import { RoleService } from '../../../core/services/role.service';
import { UploadComponent } from '../../upload/upload.component';

@Component({
  selector: 'app-objectifs-define-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, Dialog, UploadComponent],
  template: `
    <p-dialog
      [visible]="visible()"
      [modal]="true"
      [header]="'Ajouter les objectifs'"
      [style]="{ width: '90vw', maxWidth: '900px' }"
      (onHide)="onDialogClose()">

      <div class="define-dialog-content">

        <!-- Distributor Section -->
        <div class="define-section">
          <div class="define-section__label">Distributeur</div>
          <div class="define-section__value">
            {{ distributorName() || 'Aucun' }}
          </div>
        </div>

        <!-- Prevendeur Counts -->
        <div class="define-section">
          <div class="define-section__label">Nombre de prévendeurs détectés</div>
          <div class="prevendeur-fields">
            <div class="field">
              <label class="field-label">VD Prévendeurs</label>
              <input type="number" min="0" [(ngModel)]="prevendeurVD" class="field-input" />
            </div>
            <div class="field">
              <label class="field-label">VH Prévendeurs</label>
              <input type="number" min="0" [(ngModel)]="prevendeurVH" class="field-input" />
            </div>
          </div>
          @if (loading()) {
            <span class="define-loading">Détection en cours...</span>
          }
        </div>

        <!-- Upload Component -->
        <div class="define-section">
          <div class="define-section__label">Fichier à importer</div>
          <app-upload></app-upload>
        </div>

        <!-- Dialog Actions -->
        <div class="define-actions">
          <button class="btn-secondary" type="button" (click)="onDialogClose()">
            Annuler
          </button>
        </div>

      </div>

    </p-dialog>
  `,
  styles: [`
    .define-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1rem 0;
    }

    .define-section {
      padding: 1rem;
      background: var(--surface-50);
      border-radius: var(--radius-lg);
      border: 1px solid var(--surface-border);
    }

    .define-section__label {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-color-secondary);
      margin-bottom: 0.5rem;
    }

    .define-section__value {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-color);
    }

    .prevendeur-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 0.75rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .field-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-color);
    }

    .field-input {
      padding: 0.6rem;
      border: 1px solid var(--surface-border);
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      font-family: inherit;
    }

    .field-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
    }

    .define-loading {
      display: block;
      margin-top: 0.75rem;
      font-size: 0.85rem;
      color: var(--text-color-secondary);
    }

    .define-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--surface-border);
    }
  `],
})
export class ObjectifsDefineDialogComponent implements OnInit {
  private readonly ventesService = inject(VentesService);
  private readonly auth = inject(AuthService);
  private readonly distContext = inject(DistributorContextService);
  private readonly roleService = inject(RoleService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() visible = signal(false);
  @Output() close = new EventEmitter<void>();

  readonly loading = signal(false);
  readonly prevendeurVD = signal(0);
  readonly prevendeurVH = signal(0);

  readonly isPlatformAdmin = this.roleService.isPlatformAdmin();
  readonly distributorName = computed(() => this.distContext.formattedName());

  ngOnInit() {
    this.loadPrevendeurCounts();
  }

  private loadPrevendeurCounts() {
    this.loading.set(true);
    // TODO: Query latest month in vente data and count prevendeurs by canal
    // For now, set default values
    this.prevendeurVD.set(0);
    this.prevendeurVH.set(0);
    this.loading.set(false);
  }

  onDialogClose() {
    this.close.emit();
    this.visible.set(false);
  }
}

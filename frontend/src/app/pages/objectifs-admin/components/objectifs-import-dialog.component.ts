import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PeriodStepperComponent } from '../../../shared/period-stepper/period-stepper.component';

@Component({
  selector: 'app-objectifs-import-dialog',
  standalone: true,
  imports: [CommonModule, PeriodStepperComponent],
  styleUrl: './objectifs-import-dialog.component.scss',
  template: `
    @if (visible) {
      <div class="obj-backdrop" (click)="cancel.emit()">
        <div class="obj-dialog" (click)="$event.stopPropagation()">
          <h3 class="obj-dialog__title"><i class="pi pi-upload"></i> Importer depuis Excel</h3>
          <div class="obj-import-period-banner">
            <i class="pi pi-calendar"></i>
            <span>Période cible&nbsp;:</span>
            <app-period-stepper [mois]="importMois" [annee]="importAnnee" (periodChange)="periodChange.emit($event)"></app-period-stepper>
          </div>
          <p class="obj-dialog__body">
            Fichier&nbsp;: <strong>{{ importFile?.name }}</strong>
          </p>
          <p class="obj-dialog__body">Pour quel canal importer les objectifs ?</p>
          <div class="obj-import-canal">
            <button class="obj-import-canal-btn"
              [class.obj-import-canal-btn--active-vd]="importCanal === 'VD'"
              (click)="canalChange.emit('VD')">
              <i class="pi pi-car"></i> Direct (VD)
            </button>
            <button class="obj-import-canal-btn"
              [class.obj-import-canal-btn--active-vh]="importCanal === 'VH'"
              (click)="canalChange.emit('VH')">
              <i class="pi pi-car"></i> Horeca (VH)
            </button>
          </div>
          <div class="obj-dialog__actions">
            <button class="btn-secondary" (click)="cancel.emit()" [disabled]="isImporting">Annuler</button>
            <button class="btn-save" (click)="confirm.emit()" [disabled]="isImporting">
              @if (isImporting) {
                <i class="pi pi-spin pi-spinner"></i> Import en cours…
              } @else {
                <i class="pi pi-check"></i> Importer
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ObjectifsImportDialogComponent {
  @Input() visible: boolean = false;
  @Input() importFile: File | null = null;
  @Input() importMois: number = 0;
  @Input() importAnnee: number = 0;
  @Input() importCanal: 'VD' | 'VH' = 'VD';
  @Input() isImporting: boolean = false;
  @Output() periodChange = new EventEmitter<{ mois: number; annee: number }>();
  @Output() canalChange = new EventEmitter<'VD' | 'VH'>();
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}

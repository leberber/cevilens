import { Component, Input, Output, EventEmitter, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { CanalToggleComponent } from '../../../shared/components/canal-toggle/canal-toggle.component';
import { PeriodStepperComponent } from '../../../shared/period-stepper/period-stepper.component';

@Component({
  selector: 'app-objectifs-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, Select, CanalToggleComponent, PeriodStepperComponent],
  styleUrl: './objectifs-toolbar.component.scss',
  template: `
    <div class="obj-toolbar">
      <div class="obj-toolbar__left">
        @if (!editMode) {
          <app-canal-toggle
            [canal]="canal"
            (canalChange)="canalChange.emit($event)">
          </app-canal-toggle>
          <app-period-stepper [mois]="mois" [annee]="annee" (periodChange)="periodChange.emit($event)"></app-period-stepper>

          <div class="obj-distributor-sel">
            <p-select
              [options]="distributeurs"
              [(ngModel)]="selectedDistributeur"
              placeholder="Tous les distributeurs"
              [filter]="true"
              [showClear]="true"
              (onChange)="distributeurChange.emit(selectedDistributeur)"
              [style]="{'width':'280px'}"
              class="filter-select--glass"
              panelStyleClass="filter-select-panel--glass"
            />
          </div>

          <!-- Route counts -->
          <div class="obj-routes">
            <label class="obj-route-pill obj-route-pill--vd">
              <i class="pi pi-car"></i>
              <input type="number" min="1" [(ngModel)]="routesVD" (change)="routesVDChange.emit(routesVD)" class="obj-route-input"> tournées VD
            </label>
            <label class="obj-route-pill obj-route-pill--vh">
              <i class="pi pi-car"></i>
              <input type="number" min="1" [(ngModel)]="routesVH" (change)="routesVHChange.emit(routesVH)" class="obj-route-input"> tournées VH
            </label>
            @if (routesFallbackMois) {
              <span class="obj-route-fallback" title="Aucune donnée pour ce mois — tournées basées sur {{ routesFallbackMois }}">
                <i class="pi pi-info-circle"></i> basé sur {{ routesFallbackMois }}
              </span>
            }
          </div>
        }
      </div>

      <div class="obj-toolbar__right">
        @if (sortCol) {
          <button class="btn-reset-sort" (click)="resetSort.emit()">
            <i class="pi pi-sort-alt-slash"></i> Réinitialiser le tri
          </button>
        }
        @if (!editMode) {
          @if (!loading) {
            @if (hasGoals) {
              <button class="btn-secondary" (click)="enterEditMode.emit()">
                <i class="pi pi-pencil"></i> Modifier
              </button>
            } @else {
              <button class="btn-add" (click)="defineObjectifs.emit()">
                <i class="pi pi-plus"></i> Définir les objectifs
              </button>
            }
            @if (nextMissingLabel && !isNextMissingPeriod) {
              <button class="btn-add" (click)="nextMissing.emit()">
                <i class="pi pi-arrow-right"></i> {{ nextMissingLabel }}
              </button>
            }
          }
        } @else {
          <!-- Hidden file input for Excel import -->
          <input #fileInput type="file" accept=".xlsx,.xls" style="display:none"
            (change)="fileSelected.emit($event)">

          <button class="btn-teal" (click)="fileInput.click()" [disabled]="isSaving || isImporting">
            <i class="pi pi-file-excel"></i> Importer Excel
          </button>
          <button class="btn-secondary" (click)="copyFromPrevious.emit()" [disabled]="isSaving">
            <i class="pi pi-copy"></i> Copier depuis {{ prevMonthLabel }}
          </button>
          <button class="btn-danger" (click)="cancel.emit()" [disabled]="isSaving">
            <i class="pi pi-times"></i> Annuler
          </button>
          <button class="btn-save" (click)="save.emit()" [disabled]="isSaving">
            @if (isSaving) {
              <i class="pi pi-spin pi-spinner"></i> Enregistrement…
            } @else {
              <i class="pi pi-check"></i> Sauvegarder
              @if (dirtyCount > 0) { <span class="obj-badge">{{ dirtyCount }}</span> }
            }
          </button>
        }
      </div>
    </div>
  `,
})
export class ObjectifsToolbarComponent {
  @Input() canal: 'VD' | 'VH' = 'VD';
  @Input() mois: number = 0;
  @Input() annee: number = 0;
  @Input() editMode: boolean = false;
  @Input() isSaving: boolean = false;
  @Input() isImporting: boolean = false;
  @Input() loading: boolean = false;
  @Input() hasGoals: boolean = false;
  @Input() distributeurs: string[] = [];
  @Input() selectedDistributeur: string | null = null;
  @Input() routesVD: number = 0;
  @Input() routesVH: number = 0;
  @Input() routesFallbackMois: string | null = null;
  @Input() sortCol: string = '';
  @Input() dirtyCount: number = 0;
  @Input() nextMissingLabel: string = '';
  @Input() isNextMissingPeriod: boolean = false;
  @Input() prevMonthLabel: string = '';

  @Output() canalChange = new EventEmitter<'VD' | 'VH'>();
  @Output() periodChange = new EventEmitter<{ mois: number; annee: number }>();
  @Output() distributeurChange = new EventEmitter<string | null>();
  @Output() routesVDChange = new EventEmitter<number>();
  @Output() routesVHChange = new EventEmitter<number>();
  @Output() resetSort = new EventEmitter<void>();
  @Output() defineObjectifs = new EventEmitter<void>();
  @Output() enterEditMode = new EventEmitter<void>();
  @Output() nextMissing = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<Event>();
  @Output() copyFromPrevious = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput!: any;
}

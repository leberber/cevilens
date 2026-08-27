import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div class="import-backdrop" (click)="onClose()">
        <div class="import-dialog" (click)="$event.stopPropagation()">
          <h3 class="import-dialog__title">
            <i class="pi pi-upload"></i>
            {{ title }}
          </h3>

          @if (subtitle) {
            <div class="import-dialog__subtitle">{{ subtitle }}</div>
          }

          <p class="import-dialog__body">{{ message }}</p>

          @if (extraContent) {
            <div class="import-dialog__extra">
              <ng-container [ngTemplateOutlet]="extraContent"></ng-container>
            </div>
          }

          <div class="import-dialog__actions">
            <button class="btn-secondary" (click)="onClose()" [disabled]="isLoading">
              {{ cancelLabel }}
            </button>
            <button class="btn-save" (click)="onConfirm()" [disabled]="isLoading">
              @if (isLoading) {
                <i class="pi pi-spin pi-spinner"></i> {{ loadingLabel }}
              } @else {
                <i class="pi pi-check"></i> {{ confirmLabel }}
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .import-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .import-dialog {
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .import-dialog__title {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .import-dialog__subtitle {
      font-size: 12px;
      color: #999;
      margin: 0 0 16px 0;
    }

    .import-dialog__body {
      font-size: 14px;
      color: #666;
      margin: 0 0 16px 0;
    }

    .import-dialog__extra {
      margin: 16px 0;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 4px;
    }

    .import-dialog__actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn-save {
      background: #4f46e5;
      color: white;
    }
  `],
})
export class ImportDialogComponent {
  @Input() visible = false;
  @Input() title = 'Import Data';
  @Input() subtitle: string | null = null;
  @Input() message = 'Select options below and confirm to import.';
  @Input() confirmLabel = 'Import';
  @Input() cancelLabel = 'Cancel';
  @Input() loadingLabel = 'Importing…';
  @Input() isLoading = false;
  @Input() extraContent: any = null;

  @Output() onConfirmed = new EventEmitter<void>();
  @Output() onClosed = new EventEmitter<void>();

  onConfirm() {
    this.onConfirmed.emit();
  }

  onClose() {
    this.onClosed.emit();
  }
}

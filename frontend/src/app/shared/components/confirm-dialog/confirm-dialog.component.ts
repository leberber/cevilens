import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div class="confirm-backdrop" (click)="onCancel()">
        <div class="confirm-dialog" (click)="$event.stopPropagation()">
          <h3 class="confirm-dialog__title">{{ title }}</h3>
          <p class="confirm-dialog__message">{{ message }}</p>
          <div class="confirm-dialog__actions">
            <button class="btn-secondary" (click)="onCancel()" [disabled]="isLoading">
              {{ cancelLabel }}
            </button>
            <button class="btn-save" (click)="onConfirm()" [disabled]="isLoading">
              @if (isLoading) {
                <i class="pi pi-spin pi-spinner"></i>
              } @else {
                <i class="pi pi-check"></i>
              }
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .confirm-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .confirm-dialog {
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .confirm-dialog__title {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 12px 0;
    }

    .confirm-dialog__message {
      font-size: 14px;
      color: #666;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }

    .confirm-dialog__actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
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
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure?';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() isLoading = false;

  @Output() onConfirmed = new EventEmitter<void>();
  @Output() onCancelled = new EventEmitter<void>();

  onConfirm() {
    this.onConfirmed.emit();
  }

  onCancel() {
    this.onCancelled.emit();
  }
}

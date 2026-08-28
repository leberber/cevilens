import { Component, Input } from '@angular/core';
/**
 * Reusable loading state component
 * Consolidates all loading spinner patterns across the app
 */
@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [],
  template: `
    <div class="loading-state" [class]="containerClass">
      <div class="loading-state__content">
        <i class="pi pi-spin pi-spinner loading-state__spinner"></i>
        @if (message) {
          <span class="loading-state__message">{{ message }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      min-height: 200px;
    }
    .loading-state__content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .loading-state__spinner {
      color: var(--primary-color);
      font-size: 1.5rem;
    }
    .loading-state__message {
      color: var(--text-color-subdued);
      font-size: 0.9rem;
    }
    .loading-state--compact {
      min-height: 100px;
      padding: 1rem;
    }
  `],
})
export class LoadingStateComponent {
  @Input() message: string = 'Chargement…';
  @Input() compact: boolean = false;

  get containerClass(): string {
    return this.compact ? 'loading-state--compact' : '';
  }
}

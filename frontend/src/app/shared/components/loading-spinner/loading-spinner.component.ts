import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * LoadingSpinnerComponent - Displays a centered loading spinner with optional message
 *
 * @description
 * A reusable component for indicating asynchronous operations to the user. Shows a large
 * centered spinner with smooth rotation animation and an optional descriptive message.
 * Useful for full-page loading states or large content area loading states.
 *
 * @example
 * // Basic usage with just loading state
 * <app-loading-spinner [loading]="isLoadingData"></app-loading-spinner>
 *
 * @example
 * // With custom message
 * <app-loading-spinner
 *   [loading]="isLoadingData"
 *   [message]="'Chargement des ventes...'" />
 *
 * @example
 * // In component logic
 * export class VentesComponent {
 *   isLoadingData = false;
 *
 *   loadVentes() {
 *     this.isLoadingData = true;
 *     this.ventesService.getVentes().subscribe({
 *       next: (data) => { this.data = data; this.isLoadingData = false; },
 *       error: () => { this.isLoadingData = false; }
 *     });
 *   }
 * }
 *
 * @styling
 * CSS Classes:
 * - `.loading-spinner-container`: Main flex container (min-height: 120px, centered content)
 * - `.loading-spinner`: Spinner icon container (font-size: 2.5rem, primary color)
 * - `.loading-message`: Message text below spinner (font-size: 0.875rem, secondary color)
 *
 * CSS Variables Used:
 * - `--primary-color`: Color of spinner icon
 * - `--text-color-secondary`: Color of message text
 *
 * Animation: `spin` - 360° rotation in 1 second, runs infinitely
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading) {
      <div class="loading-spinner-container">
        <div class="loading-spinner">
          <i class="pi pi-spin pi-spinner"></i>
        </div>
        @if (message) {
          <p class="loading-message">{{ message }}</p>
        }
      </div>
    }
  `,
  styles: [`
    .loading-spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 1rem;
      min-height: 120px;
    }

    .loading-spinner {
      font-size: 2.5rem;
      color: var(--primary-color);
      opacity: 0.8;

      i {
        animation: spin 1s linear infinite;
      }
    }

    .loading-message {
      font-size: 0.875rem;
      color: var(--text-color-secondary);
      margin: 0;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoadingSpinnerComponent {
  /**
   * Controls visibility of the loading spinner
   * @type {boolean}
   * @default false
   *
   * When true, displays the spinner and message (if provided).
   * When false, the entire component is hidden from the DOM.
   */
  @Input() loading: boolean = false;

  /**
   * Optional message to display below the spinner
   * @type {string}
   * @default ''
   *
   * If provided and non-empty, displays a secondary text line below the spinner.
   * Commonly used for contextual loading messages like 'Chargement des données...'
   * or 'Connexion en cours...'. If empty, only the spinner is shown.
   */
  @Input() message: string = '';
}

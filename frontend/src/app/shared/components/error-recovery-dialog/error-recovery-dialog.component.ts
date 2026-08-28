import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorRecovery } from '../../../core/services/error-recovery.service';

/**
 * ErrorRecoveryDialogComponent - Displays errors with recovery suggestions and actions
 *
 * @description
 * A user-friendly error dialog that presents errors in a structured way with:
 * - Clear error title and message
 * - Contextual recovery suggestions
 * - Actionable recovery buttons
 * - Optional dismiss capability
 *
 * Integrates with ErrorRecoveryService to provide consistent error handling
 * across the application. Shows errors in a card format with helpful guidance.
 *
 * @example
 * // Basic error display
 * import { ErrorRecovery } from '../../../core/services/error-recovery.service';
 *
 * export class DataLoadComponent {
 *   error: ErrorRecovery | null = null;
 *
 *   loadData() {
 *     this.service.getData().subscribe({
 *       next: (data) => { this.data = data; },
 *       error: (err) => {
 *         this.error = {
 *           title: 'Erreur de chargement',
 *           message: 'Impossible de charger les données. Veuillez réessayer.',
 *           suggestions: [
 *             'Vérifiez votre connexion Internet',
 *             'Rafraîchissez la page'
 *           ],
 *           dismissible: true
 *         };
 *       }
 *     });
 *   }
 * }
 *
 * // In template:
 * <app-error-recovery-dialog [error]="error" />
 *
 * @example
 * // Error with recovery action
 * this.error = {
 *   title: 'Session expirée',
 *   message: 'Votre session a expiré. Veuillez vous reconnecter.',
 *   suggestions: [
 *     'Vous serez redirigé vers la page de connexion',
 *     'Vos données non sauvegardées seront perdues'
 *   ],
 *   action: {
 *     label: 'Se reconnecter',
 *     callback: () => this.router.navigate(['/login'])
 *   },
 *   dismissible: false
 * };
 *
 * @example
 * // Error with multiple contextual suggestions
 * this.error = {
 *   title: 'Fichier trop volumineux',
 *   message: 'Le fichier sélectionné dépasse la limite de 50 MB.',
 *   suggestions: [
 *     'Compressez le fichier avant de l\'importer',
 *     'Scindez le fichier en plusieurs fichiers plus petits',
 *     'Contactez l\'administrateur pour augmenter la limite'
 *   ],
 *   action: {
 *     label: 'Réessayer',
 *     callback: () => this.triggerFileUpload()
 *   },
 *   dismissible: true
 * };
 *
 * @error_types
 * The ErrorRecovery interface supports various error types:
 *
 * - **Network Errors**: Connection timeouts, server unavailable
 *   - Suggestions: Check internet, retry, contact support
 *
 * - **Validation Errors**: Invalid input data, file format errors
 *   - Suggestions: Correct the input, review file requirements
 *
 * - **Authorization Errors**: Insufficient permissions, session expired
 *   - Suggestions: Re-authenticate, contact administrator
 *
 * - **Data Errors**: Conflicts, missing data, integrity issues
 *   - Suggestions: Refresh data, verify inputs, contact support
 *
 * - **File Errors**: Invalid format, size limit exceeded, upload failed
 *   - Suggestions: Check file format, reduce size, retry upload
 *
 * @integration_patterns
 * Pattern 1: Global error handler with dialog
 * ```typescript
 * // In ErrorRecoveryService
 * private dialogComponent: ErrorRecoveryDialogComponent;
 *
 * showError(error: ErrorRecovery) {
 *   this.dialogComponent.error = error;
 * }
 * ```
 *
 * Pattern 2: Local component error handling
 * ```typescript
 * // In component
 * @ViewChild(ErrorRecoveryDialogComponent) errorDialog!: ErrorRecoveryDialogComponent;
 *
 * handleError(error: any) {
 *   this.errorDialog.error = this.mapErrorToRecovery(error);
 * }
 * ```
 *
 * Pattern 3: HTTP interceptor integration
 * ```typescript
 * // In HTTP error interceptor
 * catchError((error: HttpErrorResponse) => {
 *   const recovery = this.buildRecovery(error);
 *   this.errorRecoveryService.display(recovery);
 *   return throwError(() => error);
 * })
 * ```
 *
 * @styling
 * CSS Classes:
 * - `.error-recovery-dialog`: Main card container
 * - `.error-header`: Title section with icon
 * - `.error-message`: Main error description text
 * - `.suggestions`: Optional suggestions box
 * - `.suggestions-list`: List of recovery suggestions
 * - `.error-actions`: Button container at bottom
 * - `.action-btn`: Base button styling
 * - `.action-btn--primary`: Primary action button (red, hover effect)
 * - `.action-btn--secondary`: Secondary action button (gray, dismiss)
 *
 * CSS Variables Used:
 * - `--surface-card`: Dialog background
 * - `--border-color-light`: Dialog border
 * - `--text-color`: Primary text (title, message)
 * - `--text-color-secondary`: Secondary text (suggestions header)
 *
 * Color Scheme:
 * - Error red: #f87171 (icon, suggestions border, primary button)
 * - Hover red: #ef4444 (primary button hover)
 * - Button shadow: rgba(239, 68, 68, 0.3) (red with opacity)
 *
 * Layout:
 * - Card format with border and shadow
 * - Vertical stack: Icon + Title, Message, Suggestions, Actions
 * - Buttons right-aligned at bottom
 * - Suggestions box has left red border accent
 */
@Component({
  selector: 'app-error-recovery-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (error) {
      <div class="error-recovery-dialog">
        <!-- Header -->
        <div class="error-header">
          <i class="pi pi-exclamation-circle"></i>
          <h3>{{ error.title }}</h3>
        </div>

        <!-- Message -->
        <p class="error-message">{{ error.message }}</p>

        <!-- Suggestions -->
        @if (error.suggestions && error.suggestions.length > 0) {
          <div class="suggestions">
            <h4>Suggestions:</h4>
            <ul class="suggestions-list">
              @for (suggestion of error.suggestions; track suggestion) {
                <li>{{ suggestion }}</li>
              }
            </ul>
          </div>
        }

        <!-- Actions -->
        <div class="error-actions">
          @if (error.action) {
            <button class="action-btn action-btn--primary" (click)="onAction()">
              {{ error.action.label }}
            </button>
          }
          @if (error.dismissible) {
            <button class="action-btn action-btn--secondary" (click)="onDismiss()">
              Fermer
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .error-recovery-dialog {
      background: var(--surface-card);
      border: 1px solid var(--border-color-light);
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .error-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;

      i {
        font-size: 1.5rem;
        color: #f87171;
        flex-shrink: 0;
      }

      h3 {
        margin: 0;
        font-size: 1.125rem;
        color: var(--text-color);
      }
    }

    .error-message {
      margin: 0 0 1rem;
      color: var(--text-color);
      line-height: 1.5;
    }

    .suggestions {
      background: rgba(248, 113, 113, 0.05);
      border-left: 3px solid #f87171;
      padding: 1rem;
      margin-bottom: 1.5rem;
      border-radius: 4px;

      h4 {
        margin: 0 0 0.75rem;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-color-secondary);
      }
    }

    .suggestions-list {
      margin: 0;
      padding-left: 1.25rem;

      li {
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        color: var(--text-color);
        line-height: 1.4;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }

    .error-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
    }

    .action-btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;

      &--primary {
        background: #f87171;
        color: white;

        &:hover {
          background: #ef4444;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }
      }

      &--secondary {
        background: var(--surface-200);
        color: var(--text-color);

        &:hover {
          background: var(--surface-300);
        }
      }
    }
  `]
})
export class ErrorRecoveryDialogComponent {
  /**
   * Error recovery object to display
   * @type {ErrorRecovery | null}
   * @default null
   *
   * The ErrorRecovery object contains:
   *
   * @property {string} title - Short error title (e.g., "Erreur de chargement")
   *
   * @property {string} message - Detailed error description explaining what happened
   *   and why the operation failed
   *
   * @property {string[]} [suggestions] - Optional array of actionable suggestions
   *   to help the user recover from the error. Each suggestion should be a complete
   *   sentence or action item.
   *   Example: ['Vérifiez votre connexion', 'Rafraîchissez la page']
   *
   * @property {RecoveryAction} [action] - Optional primary action button
   *   @property {string} label - Button text (e.g., "Réessayer", "Se reconnnecter")
   *   @property {() => void} callback - Function executed when button is clicked
   *
   * @property {boolean} [dismissible] - If true, shows a "Fermer" button allowing
   *   user to dismiss the error without taking the primary action. Default: false
   *
   * When error is null, the component renders nothing (hidden from DOM).
   * Set to null to hide the error dialog.
   *
   * @example
   * // Complete error object
   * error = {
   *   title: 'Erreur d\'authentification',
   *   message: 'Votre session a expiré ou vos identifiants ne sont pas valides.',
   *   suggestions: [
   *     'Vérifiez que votre nom d\'utilisateur et mot de passe sont corrects',
   *     'Réinitialisez votre mot de passe si vous l\'avez oublié'
   *   ],
   *   action: {
   *     label: 'Réessayer',
   *     callback: () => this.login()
   *   },
   *   dismissible: true
   * };
   */
  @Input() error: ErrorRecovery | null = null;

  /**
   * Executes the error recovery action if defined
   * @internal
   *
   * Called when user clicks the primary action button.
   * Invokes the callback function from error.action if it exists.
   */
  onAction(): void {
    if (this.error?.action?.callback) {
      this.error.action.callback();
    }
  }

  /**
   * Dismisses the error dialog
   * @internal
   *
   * Called when user clicks the dismiss/"Fermer" button.
   * Sets error to null, removing the dialog from DOM.
   */
  onDismiss(): void {
    this.error = null;
  }
}

import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Error recovery information with user-friendly suggestions and actions
 *
 * @interface ErrorRecovery
 * @property title - Short error title displayed to user
 * @property message - Detailed error message in user's language (French)
 * @property suggestions - Array of actionable suggestions (2-4 items) to help resolve the error
 * @property action - Optional primary action with label and callback (e.g., retry, login)
 * @property dismissible - Whether user can dismiss this error dialog (false for critical 401 errors)
 */
export interface ErrorRecovery {
  title: string;
  message: string;
  suggestions: string[];
  action?: {
    label: string;
    callback: () => void;
  };
  dismissible: boolean;
}

/**
 * ErrorRecoveryService - Provides contextual error recovery guidance
 *
 * Categorizes HTTP errors and other error codes into user-friendly recovery information.
 * Each error includes a title, detailed message, actionable suggestions, and optional
 * recovery actions (e.g., retry, login, navigate).
 *
 * All messages are in French (Français) for French user base.
 *
 * Supported error categories:
 * - **Authentication (401)**: Session expired, redirect to login
 * - **Authorization (403)**: Permission denied, suggest contact admin
 * - **Not Found (404)**: Resource missing, suggest check URL
 * - **Conflict (409)**: Data conflict, suggest refresh and retry
 * - **Validation (422)**: Invalid data format, suggest field checks
 * - **Server Error (500)**: Internal error, suggest retry or contact support
 * - **Service Unavailable (503)**: Maintenance, suggest wait
 * - **Network (0, NETWORK_ERROR)**: Connection lost, suggest check internet
 * - **Custom**: DUPLICATE_ENTRY, INVALID_FORMAT with contextual messages
 *
 * @example
 * ```typescript
 * export class MyComponent {
 *   errorService = inject(ErrorRecoveryService);
 *
 *   onError(error: HttpErrorResponse) {
 *     const recovery = this.errorService.getRecovery(error.status);
 *     // Show recovery in dialog or toast
 *     console.log(recovery.title);  // "Erreur serveur"
 *     console.log(recovery.suggestions);  // ["L'équipe technique...", "Attendez...", ...]
 *     recovery.action?.callback();  // Execute action if provided
 *   }
 *
 *   onFormatError() {
 *     const recovery = this.errorService.getRecovery('INVALID_FORMAT', {
 *       message: 'Format de téléphone invalide'
 *     });
 *   }
 * }
 * ```
 *
 * @see ErrorRecoveryDialogComponent - Component that displays ErrorRecovery data to user
 */
@Injectable({ providedIn: 'root' })
export class ErrorRecoveryService {
  constructor(private router: Router) {}

  /**
   * Get recovery suggestions for an error condition
   *
   * Maps HTTP status codes, error strings, and error numbers to localized recovery
   * information. Supports context parameter for custom error messages.
   *
   * Error codes recognized:
   * - HTTP: 401, 403, 404, 409, 422, 500, 503, 0
   * - String: AUTH_EXPIRED, FORBIDDEN, NOT_FOUND, CONFLICT, VALIDATION_ERROR,
   *   SERVER_ERROR, SERVICE_UNAVAILABLE, NETWORK_ERROR, DUPLICATE_ENTRY, INVALID_FORMAT
   *
   * @param errorCode HTTP status code (number or string) or error name string
   * @param context Optional object with error-specific context
   *   - context.message: Custom error message to override default
   *   - Other context properties available via context['key']
   * @returns ErrorRecovery object with title, message, suggestions[], and optional action
   *
   * @example
   * ```typescript
   * // HTTP error
   * const recovery = errorService.getRecovery(401);
   * // { title: "Session expirée", dismissible: false, action: { label: "Se reconnecter", ... } }
   *
   * // Named error with context
   * const recovery = errorService.getRecovery('VALIDATION_ERROR', {
   *   message: 'Le format d\'e-mail est invalide'
   * });
   * // { title: "Données invalides", message: "Le format d'e-mail est invalide", ... }
   *
   * // Unknown error defaults gracefully
   * const recovery = errorService.getRecovery('UNKNOWN');
   * // { title: "Erreur", message: "Une erreur est survenue.", ... }
   * ```
   */
  getRecovery(errorCode: string | number, context?: Record<string, any>): ErrorRecovery {
    switch (String(errorCode)) {
      case '401':
      case 'AUTH_EXPIRED':
        return {
          title: 'Session expirée',
          message: 'Votre session a expiré. Veuillez vous reconnecter.',
          suggestions: [
            'Votre session de sécurité a expiré après une période d\'inactivité.',
            'Tous les formulaires non enregistrés seront perdus.',
          ],
          action: {
            label: 'Se reconnecter',
            callback: () => this.router.navigate(['/login']),
          },
          dismissible: false,
        };

      case '403':
      case 'FORBIDDEN':
        return {
          title: 'Accès refusé',
          message: 'Vous n\'avez pas les permissions nécessaires pour cette action.',
          suggestions: [
            'Contactez votre administrateur pour demander l\'accès.',
            'Vérifiez que votre rôle permet cette action.',
          ],
          action: {
            label: 'Retour au tableau de bord',
            callback: () => this.router.navigate(['/fdv-performance']),
          },
          dismissible: true,
        };

      case '404':
      case 'NOT_FOUND':
        return {
          title: 'Ressource non trouvée',
          message: 'L\'élément que vous cherchez n\'existe pas ou a été supprimé.',
          suggestions: [
            'L\'URL peut être incorrecte.',
            'L\'élément a peut-être été supprimé.',
            'Vérifiez les paramètres de l\'URL.',
          ],
          action: {
            label: 'Retour à la liste',
            callback: () => this.router.navigate(['/utilisateurs']),
          },
          dismissible: true,
        };

      case '409':
      case 'CONFLICT':
        return {
          title: 'Conflit de données',
          message: 'Les données ont été modifiées par quelqu\'un d\'autre. Veuillez actualiser et réessayer.',
          suggestions: [
            'Un autre utilisateur a modifié cet élément.',
            'Actualisez la page pour voir les dernières données.',
            'Appliquez vos modifications sur la version la plus récente.',
          ],
          action: {
            label: 'Actualiser',
            callback: () => window.location.reload(),
          },
          dismissible: true,
        };

      case '422':
      case 'VALIDATION_ERROR':
        return {
          title: 'Données invalides',
          message: context?.['message'] || 'Les données fournies ne respectent pas le format requis.',
          suggestions: [
            'Vérifiez que tous les champs obligatoires sont remplis.',
            'Vérifiez le format des données (téléphone, e-mail, etc.).',
            'Consultez les messages d\'erreur de chaque champ.',
          ],
          dismissible: true,
        };

      case '500':
      case 'SERVER_ERROR':
        return {
          title: 'Erreur serveur',
          message: 'Une erreur interne s\'est produite. Veuillez réessayer.',
          suggestions: [
            'L\'équipe technique a été notifiée.',
            'Attendez quelques instants et réessayez.',
            'Contactez le support si le problème persiste.',
          ],
          action: {
            label: 'Réessayer',
            callback: () => window.location.reload(),
          },
          dismissible: true,
        };

      case '503':
      case 'SERVICE_UNAVAILABLE':
        return {
          title: 'Service indisponible',
          message: 'Le service est actuellement en maintenance. Veuillez réessayer plus tard.',
          suggestions: [
            'Le serveur est actuellement en maintenance.',
            'Attendez quelques minutes avant de réessayer.',
            'Vérifiez notre page de statut pour les mises à jour.',
          ],
          dismissible: true,
        };

      case 'NETWORK_ERROR':
      case '0':
        return {
          title: 'Erreur de connexion',
          message: 'Impossible de se connecter au serveur. Vérifiez votre connexion Internet.',
          suggestions: [
            'Vérifiez que vous êtes connecté à Internet.',
            'Essayez avec une autre connexion (Wi-Fi/données).',
            'Attendez quelques instants et réessayez.',
            'Le firewall peut bloquer la connexion.',
          ],
          action: {
            label: 'Réessayer',
            callback: () => window.location.reload(),
          },
          dismissible: true,
        };

      case 'DUPLICATE_ENTRY':
        return {
          title: 'Entrée dupliquée',
          message: context?.['message'] || 'Cet élément existe déjà.',
          suggestions: [
            'Vérifiez que vous ne créez pas un doublon.',
            'Modifiez les données pour qu\'elles soient uniques.',
            'Consultez la liste existante pour voir les doublons potentiels.',
          ],
          dismissible: true,
        };

      case 'INVALID_FORMAT':
        return {
          title: 'Format invalide',
          message: context?.['message'] || 'Le format des données est invalide.',
          suggestions: [
            'Numéro de téléphone: 0XXX XXX XXX',
            'E-mail: utilisateur@domaine.fr',
            'Date: JJ/MM/AAAA',
          ],
          dismissible: true,
        };

      default:
        return {
          title: 'Erreur',
          message: context?.['message'] || 'Une erreur est survenue.',
          suggestions: ['Réessayez l\'opération.', 'Contactez le support si le problème persiste.'],
          dismissible: true,
        };
    }
  }

  /**
   * Format error message with numbered recovery suggestions as single string
   *
   * Combines error recovery information into a formatted text block with
   * title, message, and numbered suggestions. Useful for logging, console output,
   * or plain text display where structured ErrorRecovery can't be used.
   *
   * @param errorCode HTTP status code or error name (same as getRecovery)
   * @param context Optional context object with custom message or other data
   * @returns Single formatted string with title, message, and "Suggestions: 1. ... 2. ..."
   *
   * @example
   * ```typescript
   * const formatted = errorService.formatWithSuggestions(401);
   * console.log(formatted);
   * // Output:
   * // Session expirée: Votre session a expiré. Veuillez vous reconnecter.
   * //
   * // Suggestions:
   * // 1. Votre session de sécurité a expiré après une période d'inactivité.
   * // 2. Tous les formulaires non enregistrés seront perdus.
   * ```
   */
  formatWithSuggestions(errorCode: string | number, context?: Record<string, any>): string {
    const recovery = this.getRecovery(errorCode, context);
    return `${recovery.title}: ${recovery.message}\n\nSuggestions:\n${recovery.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  }
}

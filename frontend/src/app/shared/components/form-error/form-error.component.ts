import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';

/**
 * FormErrorComponent - Displays validation error messages for form controls
 *
 * Standalone component for displaying form field validation errors.
 * Shows only when control is invalid AND touched (prevents error flash on pristine fields).
 * Error messages are localized in French.
 *
 * Key features:
 * - Automatically hides/shows based on field state (touched + invalid)
 * - Customizable field label for error messages
 * - Supports all standard Angular validators + custom validators
 * - Visual indicator with PrimeNG icon (pi-exclamation-circle)
 * - Uses CSS custom property for color (--color-danger)
 *
 * @example
 * ```typescript
 * export class MyFormComponent {
 *   form = this.fb.group({
 *     email: ['', [Validators.required, Validators.email]],
 *   });
 *
 *   constructor(private fb: FormBuilder) {}
 * }
 * ```
 *
 * ```html
 * <input formControl="form.get('email')" />
 * <!-- Shows error only after user touches field and value is invalid -->
 * <app-form-error
 *   [control]="form.get('email')"
 *   fieldLabel="Adresse e-mail"
 * />
 * <!-- Output when invalid + touched:
 *   ⚠ Adresse e-mail est requis
 *   or
 *   ⚠ Adresse e-mail doit être une adresse e-mail valide
 * -->
 * ```
 *
 * @note Requires CSS custom property: --color-danger for error red color
 * @note Works with FormControl, FormGroup, and FormArray
 */
@Component({
  selector: 'app-form-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (hasError && control?.touched) {
      <div class="form-error">
        <i class="pi pi-exclamation-circle"></i>
        <span>{{ getErrorMessage() }}</span>
      </div>
    }
  `,
  styles: [`
    .form-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--color-danger, #f87171);
      margin-top: 0.25rem;
      i { font-size: 0.75rem; }
    }
  `]
})
export class FormErrorComponent {
  /**
   * Form control to validate and display errors for
   * @input
   * @type AbstractControl | null
   * @default null - No error displayed if null
   *
   * @example
   * [control]="form.get('email')"
   * [control]="myFormControl"
   */
  @Input() control: AbstractControl | null = null;

  /**
   * Human-readable field label for error messages (in French)
   * Used in "Ce champ est requis" vs "Email est requis"
   * @input
   * @type string
   * @default 'Ce champ'
   *
   * @example
   * fieldLabel="Email"        → "Email est requis"
   * fieldLabel="Mot de passe" → "Mot de passe doit contenir au moins 8 caractères"
   */
  @Input() fieldLabel: string = 'Ce champ';

  /**
   * Computed property: whether error should display
   * Shows error only when field is BOTH invalid AND touched
   * Prevents showing errors on pristine fields before user interacts
   *
   * @returns true if control is invalid and touched
   */
  get hasError(): boolean {
    return !!(this.control?.invalid && this.control?.touched);
  }

  /**
   * Generate user-friendly French error message for current validation error
   *
   * Maps Angular validation errors to localized messages:
   * - required → "Email est requis"
   * - email → "Email doit être une adresse e-mail valide"
   * - minlength → "Email doit contenir au moins 8 caractères"
   * - maxlength → "Email ne doit pas dépasser 50 caractères"
   * - pattern → "Email ne respecte pas le format requis"
   * - min/max → "Email doit être supérieur/inférieur à X"
   * - invalidPhone → "Numéro de téléphone invalide (ex: 0550 00 00 00)"
   * - matchPassword → "Les mots de passe ne correspondent pas"
   *
   * @returns Localized error message string, or empty string if no errors
   */
  getErrorMessage(): string {
    const errors = this.control?.errors;
    if (!errors) return '';

    if (errors['required']) return `${this.fieldLabel} est requis`;
    if (errors['invalidPhone']) return 'Numéro de téléphone invalide (ex: 0550 00 00 00)';
    if (errors['minlength']) return `${this.fieldLabel} doit contenir au moins ${errors['minlength'].requiredLength} caractères`;
    if (errors['maxlength']) return `${this.fieldLabel} ne doit pas dépasser ${errors['maxlength'].requiredLength} caractères`;
    if (errors['pattern']) return `${this.fieldLabel} ne respecte pas le format requis`;
    if (errors['email']) return `${this.fieldLabel} doit être une adresse e-mail valide`;
    if (errors['min']) return `${this.fieldLabel} doit être supérieur à ${errors['min'].min}`;
    if (errors['max']) return `${this.fieldLabel} ne doit pas dépasser ${errors['max'].max}`;
    if (errors['matchPassword']) return 'Les mots de passe ne correspondent pas';

    return 'Validation error';
  }
}

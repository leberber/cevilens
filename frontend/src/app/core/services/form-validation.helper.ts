import { Injectable } from '@angular/core';
import { AbstractControl } from '@angular/forms';

/**
 * FormValidationHelper - Centralized form validation utilities
 *
 * Provides consistent error message generation, CSS class management, and form state tracking
 * for all form components across the application.
 *
 * @example
 * ```typescript
 * export class MyFormComponent {
 *   validation = inject(FormValidationHelper);
 *   form = this.fb.group({
 *     email: ['', [Validators.required, Validators.email]]
 *   });
 *
 *   getError() {
 *     return this.validation.getErrorMessage(this.form.get('email'), 'Email');
 *   }
 * }
 * ```
 *
 * Features:
 * - Consistent error messages in French
 * - CSS class management for form field states (error, valid, pristine)
 * - Touch/dirty tracking helpers
 * - Form-level error collection
 * - Error counting utilities
 */
@Injectable({ providedIn: 'root' })
export class FormValidationHelper {
  /**
   * Get user-friendly error message for a form control
   *
   * Translates Angular validation errors into French error messages suitable
   * for end users. Handles all standard validators (required, minlength,
   * maxlength, pattern, email, min, max) plus custom validators like invalidPhone.
   *
   * @param control The form control to check for errors (or null)
   * @param fieldLabel Human-readable field name for the error message (default: 'Ce champ')
   * @returns Localized error message string, or empty string if no errors
   *
   * @example
   * ```typescript
   * const message = this.validation.getErrorMessage(
   *   this.form.get('phone'),
   *   'Téléphone'
   * );
   * // Returns: "Téléphone est requis" or "Numéro de téléphone invalide"
   * ```
   */
  getErrorMessage(control: AbstractControl | null, fieldLabel: string = 'Ce champ'): string {
    if (!control?.errors) return '';

    const errors = control.errors;

    if (errors['required']) return `${fieldLabel} est requis`;
    if (errors['invalidPhone']) return 'Numéro de téléphone invalide (ex: 0550 00 00 00)';
    if (errors['minlength']) return `${fieldLabel} doit contenir au moins ${errors['minlength'].requiredLength} caractères`;
    if (errors['maxlength']) return `${fieldLabel} ne doit pas dépasser ${errors['maxlength'].requiredLength} caractères`;
    if (errors['pattern']) return `${fieldLabel} ne respecte pas le format requis`;
    if (errors['email']) return `${fieldLabel} doit être une adresse e-mail valide`;
    if (errors['min']) return `${fieldLabel} doit être supérieur à ${errors['min'].min}`;
    if (errors['max']) return `${fieldLabel} ne doit pas dépasser ${errors['max'].max}`;
    if (errors['matchPassword']) return 'Les mots de passe ne correspondent pas';

    return 'Erreur de validation';
  }

  /**
   * Check if a field should show error state (invalid + touched)
   *
   * A field shows error state only when it's invalid AND has been touched by the user.
   * This prevents showing errors on pristine fields that haven't been interacted with yet.
   *
   * @param control The form control to check (or null)
   * @returns true if control is invalid and touched, false otherwise
   *
   * @example
   * ```typescript
   * if (this.validation.hasError(this.form.get('email'))) {
   *   // Show error styling
   * }
   * ```
   */
  hasError(control: AbstractControl | null): boolean {
    return !!(control?.invalid && control?.touched);
  }

  /**
   * Get CSS classes for form field styling based on state
   *
   * Returns an object of CSS class flags that can be bound with [ngClass] for
   * dynamic styling based on form control state.
   *
   * @param control The form control to check
   * @returns Object with classes: { 'field-error': boolean, 'field-valid': boolean, 'field-pristine': boolean }
   *
   * @example
   * ```html
   * <input [ngClass]="validation.getFieldClasses(form.get('email'))" />
   * <!-- Applies 'field-error' class when invalid + touched -->
   * <!-- Applies 'field-valid' class when valid + touched -->
   * ```
   */
  getFieldClasses(control: AbstractControl | null): { [key: string]: boolean } {
    return {
      'field-error': this.hasError(control),
      'field-valid': !!(control?.valid && control?.touched),
      'field-pristine': control?.pristine ?? true,
    };
  }

  /**
   * Mark all form controls as touched to trigger validation display
   *
   * Recursively marks a form control and all its children as touched. This causes
   * error messages to display for invalid controls. Useful for showing all validation
   * errors when user attempts to submit an invalid form.
   *
   * @param control The form control (or form group) to mark as touched
   *
   * @example
   * ```typescript
   * if (this.form.invalid) {
   *   this.validation.markAllAsTouched(this.form);
   *   // All fields now show error messages
   * }
   * ```
   */
  markAllAsTouched(control: AbstractControl): void {
    control.markAsTouched({ onlySelf: true });
    if ('controls' in control) {
      const formGroup = control as any;
      Object.values(formGroup.controls || {}).forEach((ctrl: any) => {
        if (ctrl instanceof AbstractControl) {
          this.markAllAsTouched(ctrl);
        }
      });
    }
  }

  /**
   * Reset form field visual state
   */
  resetFieldState(control: AbstractControl): void {
    control.markAsPristine();
    control.markAsUntouched();
  }

  /**
   * Get all validation errors in form as flat object
   */
  getFormErrors(form: AbstractControl): Record<string, any> {
    const errors: Record<string, any> = {};
    if ('controls' in form) {
      const formGroup = form as any;
      Object.keys(formGroup.controls || {}).forEach(key => {
        const control = form.get(key);
        if (control?.errors) {
          errors[key] = control.errors;
        }
      });
    }
    return errors;
  }

  /**
   * Check if form has any validation errors
   */
  hasFormErrors(form: AbstractControl): boolean {
    if ('controls' in form) {
      const formGroup = form as any;
      return Object.values(formGroup.controls || {}).some((ctrl: any) => ctrl?.invalid);
    }
    return form.invalid;
  }

  /**
   * Get count of fields with errors
   */
  getErrorCount(form: AbstractControl): number {
    if ('controls' in form) {
      const formGroup = form as any;
      return Object.values(formGroup.controls || {}).filter((ctrl: any) => ctrl?.invalid).length;
    }
    return form.invalid ? 1 : 0;
  }
}

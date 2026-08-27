import { Injectable } from '@angular/core';

/**
 * Helper service for form prefilling and state persistence
 * Consolidates repeated sessionStorage/localStorage patterns
 */
@Injectable({
  providedIn: 'root',
})
export class FormPrefillHelper {
  private readonly storagePrefix = 'form_prefill_';

  /**
   * Save form data to sessionStorage for later prefill
   */
  saveFormState(key: string, data: Record<string, any>): void {
    const prefixedKey = this.storagePrefix + key;
    sessionStorage.setItem(prefixedKey, JSON.stringify(data));
  }

  /**
   * Load form data from sessionStorage
   */
  loadFormState(key: string): Record<string, any> | null {
    const prefixedKey = this.storagePrefix + key;
    const stored = sessionStorage.getItem(prefixedKey);
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Clear saved form state
   */
  clearFormState(key: string): void {
    const prefixedKey = this.storagePrefix + key;
    sessionStorage.removeItem(prefixedKey);
  }

  /**
   * Save specific field value
   */
  saveFieldValue(formKey: string, fieldName: string, value: any): void {
    const state = this.loadFormState(formKey) || {};
    state[fieldName] = value;
    this.saveFormState(formKey, state);
  }

  /**
   * Load specific field value
   */
  loadFieldValue(formKey: string, fieldName: string): any {
    const state = this.loadFormState(formKey);
    return state ? state[fieldName] : null;
  }

  /**
   * Prefill form control with saved value or default
   */
  prefillControl(
    formKey: string,
    fieldName: string,
    defaultValue?: any
  ): any {
    const saved = this.loadFieldValue(formKey, fieldName);
    return saved !== null ? saved : defaultValue;
  }

  /**
   * Clear all saved form states
   */
  clearAllFormStates(): void {
    const keys = Object.keys(sessionStorage).filter((k) =>
      k.startsWith(this.storagePrefix)
    );
    keys.forEach((k) => sessionStorage.removeItem(k));
  }
}

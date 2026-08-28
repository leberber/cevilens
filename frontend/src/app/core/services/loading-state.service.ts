import { Injectable } from '@angular/core';
import { signal, computed, Signal } from '@angular/core';

/**
 * LoadingStateService - Manages loading states with Angular signals
 *
 * Provides consistent, reactive loading state management across components.
 * Uses Angular's signal primitive for fine-grained reactivity and efficient change detection.
 * Each component can create its own isolated loading state instances.
 *
 * Benefits over traditional properties:
 * - Automatic memoization and caching with computed()
 * - Fine-grained reactivity (only triggers when signal changes)
 * - No manual change detection required
 * - Composable with computed() for derived states
 *
 * @example
 * ```typescript
 * export class MyComponent {
 *   loadingService = inject(LoadingStateService);
 *   loading = this.loadingService.create();
 *
 *   async onSubmit() {
 *     this.loading.set(true);
 *     try {
 *       await this.api.save();
 *     } finally {
 *       this.loading.set(false);
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Multiple loading states for different operations
 * export class ComplexComponent {
 *   loadingService = inject(LoadingStateService);
 *   { mainLoad, fieldValidate } = this.loadingService.createMultiple('mainLoad', 'fieldValidate');
 *   anyLoading = this.loadingService.combine(this.mainLoad, this.fieldValidate);
 *
 *   // Template: <div *ngIf="anyLoading()">Loading...</div>
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class LoadingStateService {
  /**
   * Create a new loading state signal initialized to false
   *
   * Creates an isolated, writable signal that can be toggled on/off independently.
   * Each call creates a fresh signal instance with no shared state.
   *
   * @returns A writable signal<boolean> initialized to false
   *
   * @example
   * ```typescript
   * loading = this.loadingService.create();
   * loading.set(true);  // Set to true
   * loading.update(v => !v);  // Toggle
   * if (loading()) { } // Read current value in templates or computed
   * ```
   */
  create() {
    return signal(false);
  }

  /**
   * Create multiple independent loading state signals
   *
   * Useful for components that need separate loading states for different operations.
   * Returns an object with signals keyed by the provided names.
   *
   * @param keys Variable number of string keys for loading states
   * @returns Object with signal<boolean> for each key, all initialized to false
   *
   * @example
   * ```typescript
   * const { submit, validate, delete: del } =
   *   this.loadingService.createMultiple('submit', 'validate', 'delete');
   * submit.set(true);  // Submitting
   * validate.set(true);  // Validating
   * ```
   */
  createMultiple(...keys: string[]): Record<string, ReturnType<typeof signal>> {
    const result: Record<string, ReturnType<typeof signal>> = {};
    keys.forEach(key => {
      result[key] = signal(false);
    });
    return result;
  }

  /**
   * Create a loading state signal with custom initial value
   *
   * Allows initialization to true (useful for initial loading states)
   * or false (typical case for load-on-demand).
   *
   * @param initialValue Initial value for the signal
   * @returns A writable signal<boolean> with the specified initial value
   *
   * @example
   * ```typescript
   * // Initialize with true (page starts loading)
   * loading = this.loadingService.createWithValue(true);
   *
   * // Initialize with false (optional load)
   * optional = this.loadingService.createWithValue(false);
   * ```
   */
  createWithValue(initialValue: boolean) {
    return signal(initialValue);
  }

  /**
   * Combine multiple loading states into single computed signal
   *
   * Creates a derived computed signal that returns true if ANY of the source
   * signals are true. Useful for showing a single loading indicator when any
   * operation is in progress.
   *
   * @param states Variable number of signals to combine
   * @returns A readonly computed signal that is true if any input is true
   *
   * @example
   * ```typescript
   * const { load, save, delete: del } =
   *   this.loadingService.createMultiple('load', 'save', 'delete');
   * const anyLoading = this.loadingService.combine(load, save, del);
   *
   * // Template: <app-spinner *ngIf="anyLoading()">
   * // Shows spinner when ANY operation is in progress
   * ```
   */
  combine(...states: ReturnType<typeof signal>[]) {
    return computed(() => states.some(s => s()));
  }
}

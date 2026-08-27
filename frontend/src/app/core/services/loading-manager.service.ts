import { Injectable, signal, WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

/**
 * Generic loading state manager for Observable-based operations
 * Eliminates repetitive subscribe patterns with loading flag management
 *
 * Usage:
 * ```typescript
 * this.loadingManager.load(
 *   this.loading,
 *   this.service.fetch(),
 *   (data) => { this.data = data; }
 * );
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class LoadingManager {
  /**
   * Execute observable with automatic loading state management
   * @param loadingSignal - WritableSignal to manage loading state
   * @param observable$ - Observable to subscribe to
   * @param callback - Success callback with data
   * @param errorCallback - Optional error callback
   */
  load<T>(
    loadingSignal: WritableSignal<boolean>,
    observable$: Observable<T>,
    callback: (data: T) => void,
    errorCallback?: () => void
  ): void {
    loadingSignal.set(true);
    observable$
      .pipe(finalize(() => loadingSignal.set(false)))
      .subscribe({
        next: (data) => callback(data),
        error: () => errorCallback?.(),
      });
  }

  /**
   * Execute multiple observables with shared loading state
   * @param loadingSignal - WritableSignal to manage loading state
   * @param observables - Array of observables to execute
   * @param callbacks - Array of callbacks corresponding to each observable
   */
  loadMultiple<T extends any[]>(
    loadingSignal: WritableSignal<boolean>,
    observables: { [K in keyof T]: Observable<T[K]> },
    callbacks: { [K in keyof T]: (data: T[K]) => void }
  ): void {
    loadingSignal.set(true);
    let completed = 0;
    const total = observables.length;

    observables.forEach((obs$, index) => {
      obs$.subscribe({
        next: (data) => {
          callbacks[index](data);
          completed++;
          if (completed === total) {
            loadingSignal.set(false);
          }
        },
        error: () => {
          completed++;
          if (completed === total) {
            loadingSignal.set(false);
          }
        },
      });
    });
  }
}

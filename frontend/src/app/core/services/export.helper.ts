import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Helper service for file export and download operations
 * Centralizes blob download logic and export state management
 */
@Injectable({
  providedIn: 'root',
})
export class ExportHelper {
  /**
   * Download blob with filename
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Handle export with loading state management
   * Manages exporting flag while observable is pending
   */
  handleExport(
    exporting$: BehaviorSubject<boolean>,
    observable: Observable<Blob>,
    filename: string,
    onError?: () => void
  ): void {
    exporting$.next(true);
    observable.subscribe({
      next: (blob) => {
        this.downloadBlob(blob, filename);
        exporting$.next(false);
      },
      error: () => {
        exporting$.next(false);
        onError?.();
      },
    });
  }

  /**
   * Create filename with timestamp
   */
  createTimestampedFilename(baseFilename: string, extension: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${baseFilename}_${timestamp}.${extension}`;
  }
}

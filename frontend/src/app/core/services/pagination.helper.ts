import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface PagedResponse<T> {
  items: T[];
  total: number;
}

/**
 * Helper for managing pagination and batch loading with scroll detection
 */
@Injectable({ providedIn: 'root' })
export class PaginationHelper {
  private searchTimeout: any;
  private debounceMs = 400;

  /**
   * Handle batch loading with append/replace logic
   */
  handleBatchLoad<T>(
    res: PagedResponse<T>,
    currentItems: T[],
    append: boolean,
    onSuccess?: (items: T[], total: number) => void
  ): { items: T[]; total: number } {
    const items = append ? [...currentItems, ...res.items] : res.items;
    const total = res.total;

    onSuccess?.(items, total);
    return { items, total };
  }

  /**
   * Check if more items should be loaded based on scroll position
   */
  shouldLoadMore(
    element: HTMLElement,
    hasMore: boolean,
    isLoading: boolean,
    isLoadingMore: boolean,
    threshold = 300
  ): boolean {
    if (!hasMore || isLoading || isLoadingMore) return false;

    const { scrollHeight, scrollTop, clientHeight } = element;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }

  /**
   * Debounced search handler
   */
  debounceSearch(callback: () => void, delayMs?: number): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(callback, delayMs ?? this.debounceMs);
  }

  /**
   * Clear debounce timeout
   */
  clearDebounce(): void {
    clearTimeout(this.searchTimeout);
  }
}

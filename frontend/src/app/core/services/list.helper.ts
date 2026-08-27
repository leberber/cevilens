import { Injectable } from '@angular/core';

/**
 * Helper service for list processing operations
 * Consolidates common filter, sort, and paginate patterns
 */
@Injectable({
  providedIn: 'root',
})
export class ListHelper {
  /**
   * Process list with optional filter and sort
   */
  processList<T>(
    items: T[],
    filter?: (item: T) => boolean,
    sort?: (a: T, b: T) => number
  ): T[] {
    let result = items;
    if (filter) {
      result = result.filter(filter);
    }
    if (sort) {
      result = result.sort(sort);
    }
    return result;
  }

  /**
   * Paginate list items
   */
  paginate<T>(items: T[], page: number, pageSize: number): T[] {
    const startIndex = (page - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }

  /**
   * Paginate with filter and sort
   */
  processAndPaginate<T>(
    items: T[],
    page: number,
    pageSize: number,
    filter?: (item: T) => boolean,
    sort?: (a: T, b: T) => number
  ): T[] {
    const processed = this.processList(items, filter, sort);
    return this.paginate(processed, page, pageSize);
  }

  /**
   * Get total pages for items
   */
  getTotalPages(itemCount: number, pageSize: number): number {
    return Math.ceil(itemCount / pageSize);
  }

  /**
   * Check if page is valid
   */
  isValidPage(page: number, totalPages: number): boolean {
    return page > 0 && page <= totalPages;
  }
}

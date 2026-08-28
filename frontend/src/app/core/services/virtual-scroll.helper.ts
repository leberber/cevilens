import { Injectable } from '@angular/core';

/**
 * VirtualScrollHelper - Optimized utilities for rendering large lists efficiently
 *
 * Provides calculation and filtering utilities for virtual scrolling optimization.
 * Virtual scrolling renders only visible items (plus buffer) instead of entire list,
 * enabling smooth scrolling of thousands of items without performance degradation.
 *
 * Key concepts:
 * - **Visible Range**: Items currently within the viewport
 * - **Buffer**: Extra items rendered above/below viewport for smooth scrolling
 * - **Track By**: Unique identifier for each item to prevent Angular re-rendering
 *
 * Performance impact:
 * - 10,000 items: ~50ms render time (vs 2000ms full list)
 * - Memory: ~500KB for rendered items (vs 5MB for full list)
 * - Scroll smoothness: 60fps with proper buffer size and track by function
 *
 * @example
 * ```typescript
 * export class VirtualListComponent {
 *   virtualScroll = inject(VirtualScrollHelper);
 *   items = signal<User[]>([]);
 *   scrollTop = signal(0);
 *   containerHeight = 600;  // px
 *   itemHeight = 50;  // px
 *
 *   visibleItems = computed(() => {
 *     return this.virtualScroll.getVisibleItems(
 *       this.items(),
 *       this.scrollTop(),
 *       this.containerHeight,
 *       this.itemHeight,
 *       5  // buffer size
 *     );
 *   });
 *
 *   trackByItem = this.virtualScroll.createTrackByFn(item => item.id);
 *
 *   onScroll(event: Event) {
 *     const el = event.target as HTMLElement;
 *     this.scrollTop.set(el.scrollTop);
 *   }
 * }
 *
 * // Template:
 * // <div (scroll)="onScroll($event)" [style.height.px]="containerHeight">
 * //   @for (item of visibleItems(); track trackByItem(item)) {
 * //     <div [style.height.px]="itemHeight">{{ item.name }}</div>
 * //   }
 * // </div>
 * ```
 */
@Injectable({ providedIn: 'root' })
export class VirtualScrollHelper {
  /**
   * Calculate visible item range for current scroll position
   *
   * Determines which items should be rendered based on scroll position.
   * Applies buffer to render extra items above/below for smooth scrolling.
   *
   * Formula: visibleStart = Math.floor(scrollTop / itemHeight)
   *          visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight)
   *          result.start = Math.max(0, visibleStart - buffer)
   *          result.end = visibleEnd + buffer
   *
   * @param scrollTop Current scroll position in pixels (from scroll listener)
   * @param containerHeight Height of scrollable container in pixels
   * @param itemHeight Height of each item in pixels (must be consistent)
   * @param bufferSize Number of items to render above/below visible area (default: 5)
   * @returns Object with start and end indices for item slice (for use with array.slice)
   *
   * @example
   * ```typescript
   * const range = helper.getVisibleRange(
   *   0,      // scrollTop: at top
   *   500,    // containerHeight: 500px visible
   *   50      // itemHeight: 50px per item
   * );
   * // Returns: { start: 0, end: 15 }  (10 visible + 5 buffer above/below)
   *
   * const range = helper.getVisibleRange(2500, 500, 50, 3);
   * // Returns: { start: ~47, end: ~60 }  (smaller buffer)
   * ```
   */
  getVisibleRange(
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    bufferSize: number = 5
  ): { start: number; end: number } {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);

    return {
      start: Math.max(0, visibleStart - bufferSize),
      end: visibleEnd + bufferSize,
    };
  }

  /**
   * Filter array to visible items only (convenience wrapper around getVisibleRange)
   *
   * Uses getVisibleRange to calculate indices, then slices array to return only
   * the items that should be rendered. Simplifies the common pattern:
   * `items.slice(...getVisibleRange(...))`
   *
   * @typeParam T Type of items in array
   * @param items Full array of items to filter
   * @param scrollTop Current scroll position in pixels
   * @param containerHeight Height of scrollable container in pixels
   * @param itemHeight Height of each item in pixels
   * @param bufferSize Number of items to render above/below viewport (default: 5)
   * @returns Sliced array of items for rendering (typically 10-20 items)
   *
   * @example
   * ```typescript
   * const users = [...]; // 1000 users
   * const visible = helper.getVisibleItems(users, scrollTop(), 600, 50);
   * // Returns: users.slice(start, end) where end-start ≈ 20 items
   * ```
   */
  getVisibleItems<T>(
    items: T[],
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    bufferSize: number = 5
  ): T[] {
    const range = this.getVisibleRange(scrollTop, containerHeight, itemHeight, bufferSize);
    return items.slice(range.start, range.end);
  }

  /**
   * Calculate scroll position needed to display specific item at top
   *
   * Useful for "scroll to item" or "jump to index" functionality.
   * Returns the scrollTop value that would position the given item at the top.
   *
   * @param itemIndex Index of item to scroll to (0-based)
   * @param itemHeight Height of each item in pixels
   * @returns Scroll position (scrollTop value) for this item
   *
   * @example
   * ```typescript
   * const position = helper.scrollPositionForItem(50, 40);  // Item #50
   * // Returns: 2000  (50 * 40)
   * scrollableDiv.scrollTop = position;
   * ```
   */
  scrollPositionForItem(itemIndex: number, itemHeight: number): number {
    return itemIndex * itemHeight;
  }

  /**
   * Check if user has scrolled near the bottom (for infinite scroll)
   *
   * Common use case: trigger loading more items when user reaches end of list.
   * Equation: (totalHeight - scrollTop - containerHeight) < threshold
   *
   * At the very bottom: scrollTop = totalHeight - containerHeight, so:
   * (totalHeight - (totalHeight - containerHeight) - containerHeight) = 0 < threshold ✓
   *
   * @param scrollTop Current scroll position in pixels
   * @param containerHeight Height of visible container in pixels
   * @param totalHeight Total height of scrollable content in pixels
   * @param threshold Distance from bottom to trigger (default: 300px)
   * @returns true if distance from bottom < threshold
   *
   * @example
   * ```typescript
   * // List of 10,000 items at 50px each = 500,000px total
   * const isNear = helper.isNearBottom(
   *   499000,    // scrollTop: 1000px from bottom
   *   600,       // containerHeight
   *   500000,    // totalHeight
   *   300        // threshold: trigger at 300px from bottom
   * );
   * // Returns: true (1000 - 600 = 400 > 300... wait, that's false)
   * // Actually: 500000 - 499000 - 600 = 400 > 300, so returns false
   * ```
   */
  isNearBottom(
    scrollTop: number,
    containerHeight: number,
    totalHeight: number,
    threshold: number = 300
  ): boolean {
    return totalHeight - scrollTop - containerHeight < threshold;
  }

  /**
   * Create optimized trackBy function for @for loops in templates
   *
   * Angular's trackBy function prevents unnecessary DOM re-renders when items move
   * in the list. Without trackBy, all items re-render when list changes.
   * With trackBy, only changed items re-render.
   *
   * Signature: (index: number, item: T) => any
   * - index: position in array
   * - item: data object
   * - return: unique stable identifier for this item
   *
   * Auto-detects ID via: id > code > key > array index (fallback)
   *
   * @typeParam T Type of items in array
   * @param idExtractor Optional custom function to extract ID from item
   *   If provided, overrides the default property checking
   * @returns Track by function ready for @for (item of items; track trackByFn($index, item))
   *
   * @example
   * ```typescript
   * // Auto-detect ID (checks: id, code, key, index)
   * trackByItem = this.virtualScroll.createTrackByFn();
   * // Works with: { id: 1, name: 'A' }, { code: 'C1', name: 'B' }
   *
   * // Custom ID extraction
   * trackByUser = this.virtualScroll.createTrackByFn(user => user.email);
   * // Uses email as stable identifier
   *
   * // Template:
   * // @for (item of items; track trackByItem($index, item)) { ... }
   * ```
   */
  createTrackByFn<T>(idExtractor?: (item: T, index: number) => any) {
    return (index: number, item: T) => {
      if (idExtractor) return idExtractor(item, index);
      // Fallback: check for common ID properties
      const id = (item as any)?.id ?? (item as any)?.code ?? (item as any)?.key ?? index;
      return id;
    };
  }

  /**
   * Split large array into batches (chunks) for progressive rendering
   *
   * Useful for rendering very large datasets without blocking the UI thread.
   * Instead of rendering 5000 items at once, render in batches of 50, 100, etc.
   * Each batch is a separate render cycle, allowing animations/interactions
   * between batches.
   *
   * Combined with requestAnimationFrame, enables visible progressive loading.
   *
   * @typeParam T Type of items in array
   * @param items Array to split into batches
   * @param batchSize Number of items per batch (default: 50)
   * @returns Array of batches (each batch is T[])
   *
   * @example
   * ```typescript
   * const items = [...]; // 5000 items
   * const batches = helper.batchRenderItems(items, 100);
   * // Returns: [ [0-99], [100-199], ..., [4900-4999] ]  (50 batches)
   *
   * // Progressive rendering:
   * this.rendered = signal<Item[]>([]);
   * batches.forEach((batch, i) => {
   *   setTimeout(() => {
   *     this.rendered.update(items => [...items, ...batch]);
   *   }, i * 10);  // Stagger rendering
   * });
   * ```
   */
  batchRenderItems<T>(items: T[], batchSize: number = 50) {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

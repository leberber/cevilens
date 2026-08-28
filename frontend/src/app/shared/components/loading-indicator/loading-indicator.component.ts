import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * LoadingIndicatorComponent - Multi-mode loading indicator with 4 display types
 *
 * @description
 * A versatile loading indicator component that supports 4 different visual modes:
 * - overlay: Full container overlay with semi-transparent white background
 * - inline: Small indicator within content flow
 * - progress: Fixed top progress bar (useful for page-level loading)
 * - skeleton: Placeholder lines for content structure preview
 *
 * Each mode is optimized for different use cases and layouts. Choose the type based
 * on where and how the loading state is displayed.
 *
 * @example
 * // Overlay loading (modal-like appearance)
 * <app-loading-indicator
 *   [loading]="isLoading"
 *   type="overlay"
 *   message="Mise à jour en cours..." />
 *
 * @example
 * // Inline loading (within table or list)
 * <app-loading-indicator
 *   [loading]="isLoadingRows"
 *   type="inline"
 *   message="Chargement des lignes..." />
 *
 * @example
 * // Progress bar (page-level loading)
 * <app-loading-indicator [loading]="isPageLoading" type="progress" />
 *
 * @example
 * // Skeleton loading (content placeholder)
 * <app-loading-indicator [loading]="isLoadingContent" type="skeleton" />
 *
 * @example
 * // In component with dynamic type switching
 * export class DataTableComponent {
 *   loadingType: 'overlay' | 'inline' | 'progress' | 'skeleton' = 'inline';
 *   isLoading = false;
 *
 *   loadData() {
 *     this.isLoading = true;
 *     this.dataService.fetch().subscribe({
 *       next: (data) => { this.data = data; this.isLoading = false; },
 *       error: () => { this.isLoading = false; }
 *     });
 *   }
 * }
 *
 * @styling
 * CSS Classes by Type:
 *
 * OVERLAY mode:
 * - `.loading-overlay`: Absolute positioned container (inset: 0, z-index: 50)
 * - `.loading-overlay__content`: Centered spinner + message
 * - Uses: position absolute, semi-transparent background, blur effect
 *
 * INLINE mode:
 * - `.loading-inline`: Flex row with padding (gap: 0.75rem)
 * - Small spinner icon + message in flow
 * - Does not disrupt document layout
 *
 * PROGRESS mode:
 * - `.loading-progress`: Fixed top bar (height: 3px, z-index: 100)
 * - `.loading-progress__bar`: Animated gradient bar
 * - Subtly indicates page-level loading without modal interrupt
 *
 * SKELETON mode:
 * - `.loading-skeleton`: Flex column container
 * - `.skeleton-line`: Individual placeholder lines (3 lines shown)
 * - Gives preview of content structure
 *
 * CSS Variables Used:
 * - `--primary-color`: Spinner icon color
 * - `--primary-color-light`: Progress bar light shade (default: #60a5fa)
 * - `--text-color-secondary`: Message text color
 * - `--surface-200`, `--surface-100`: Skeleton background gradients
 *
 * Animations:
 * - `progress`: Gradient shift for progress bar (1.5s)
 * - `sk-shimmer`: Shimmer effect for skeleton (1.5s)
 *
 * When to Use Each Type:
 * - **overlay**: Full-page data refresh, critical operations, modal confirmations
 * - **inline**: Table pagination, list pagination, small content loading
 * - **progress**: Initial page load, navigation transitions, app-level operations
 * - **skeleton**: Content preview, reducing perceived wait time, known content structure
 */
@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @switch (type) {
      @case ('overlay') {
        @if (loading) {
          <div class="loading-overlay">
            <div class="loading-overlay__content">
              <i class="pi pi-spin pi-spinner"></i>
              @if (message) { <p>{{ message }}</p> }
            </div>
          </div>
        }
      }
      @case ('inline') {
        @if (loading) {
          <div class="loading-inline">
            <i class="pi pi-spin pi-spinner"></i>
            @if (message) { <span>{{ message }}</span> }
          </div>
        }
      }
      @case ('progress') {
        @if (loading) {
          <div class="loading-progress">
            <div class="loading-progress__bar"></div>
          </div>
        }
      }
      @case ('skeleton') {
        @if (loading) {
          <div class="loading-skeleton">
            @for (i of [1,2,3]; track i) {
              <div class="skeleton-line"></div>
            }
          </div>
        }
      }
    }
  `,
  styles: [`
    // Overlay loading (full screen/container)
    .loading-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(2px);
      z-index: 50;

      &__content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;

        i {
          font-size: 2rem;
          color: var(--primary-color);
        }

        p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-color-secondary);
        }
      }
    }

    // Inline loading (within content flow)
    .loading-inline {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      color: var(--text-color-secondary);

      i {
        font-size: 1.125rem;
        color: var(--primary-color);
      }

      span {
        font-size: 0.875rem;
      }
    }

    // Progress bar loading (top of page)
    .loading-progress {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--surface-200);
      z-index: 100;
      overflow: hidden;

      &__bar {
        height: 100%;
        background: linear-gradient(
          90deg,
          var(--primary-color),
          var(--primary-color-light, #60a5fa),
          var(--primary-color)
        );
        background-size: 200% 100%;
        animation: progress 1.5s ease-in-out infinite;
      }
    }

    // Skeleton loading (placeholder lines)
    .loading-skeleton {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
    }

    .skeleton-line {
      height: 1rem;
      background: linear-gradient(
        90deg,
        var(--surface-200),
        var(--surface-100),
        var(--surface-200)
      );
      background-size: 200% 100%;
      border-radius: 4px;
      animation: sk-shimmer 1.5s ease-in-out infinite;
    }

    @keyframes progress {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @keyframes sk-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `]
})
export class LoadingIndicatorComponent {
  /**
   * Controls visibility of the loading indicator
   * @type {boolean}
   * @default false
   *
   * When true, displays the indicator in the selected mode.
   * When false, nothing is rendered.
   */
  @Input() loading: boolean = false;

  /**
   * Display mode for the loading indicator
   * @type {'overlay' | 'inline' | 'progress' | 'skeleton'}
   * @default 'inline'
   *
   * Determines how the loading state is visually presented:
   *
   * - **overlay**: Absolute positioned overlay covering entire container.
   *   Best for: Full-page loading, critical operations, modal updates.
   *   Position: absolute, covers with semi-transparent background.
   *   Z-index: 50
   *
   * - **inline**: Small indicator within normal content flow.
   *   Best for: Table pagination, list loading, non-blocking operations.
   *   Position: static, does not interrupt layout.
   *   Compact size suitable for tight spaces.
   *
   * - **progress**: Fixed progress bar at top of viewport.
   *   Best for: Page-level operations, navigation, app initialization.
   *   Position: fixed, height: 3px, spans full width.
   *   Z-index: 100 (above most elements)
   *
   * - **skeleton**: Placeholder lines with shimmer animation.
   *   Best for: Content preview, reducing perceived wait time.
   *   Shows 3 placeholder lines that users can recognize as loading content.
   */
  @Input() type: 'overlay' | 'inline' | 'progress' | 'skeleton' = 'inline';

  /**
   * Optional message to display with the indicator
   * @type {string}
   * @default ''
   *
   * Message displayed alongside the loading indicator. Behavior depends on type:
   * - **overlay/inline**: Shown as text next to spinner
   * - **progress**: Not displayed (too small for text)
   * - **skeleton**: Not displayed (skeleton is self-explanatory)
   *
   * Examples: 'Chargement...', 'Mise à jour en cours...', 'Connexion...'
   */
  @Input() message: string = '';
}

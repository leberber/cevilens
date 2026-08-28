import { Directive, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';

/**
 * VirtualScrollContainerDirective - Efficient scroll handling for large lists
 * Detects scroll position and triggers load-more events for infinite scroll
 *
 * Usage:
 * <div appVirtualScrollContainer
 *      [threshold]="300"
 *      (nearBottom)="loadMore()"
 *      (scroll)="onScroll($event)">
 *   <table>...</table>
 * </div>
 */
@Directive({
  selector: '[appVirtualScrollContainer]',
  standalone: true,
})
export class VirtualScrollContainerDirective {
  /**
   * Distance from bottom to trigger nearBottom event (default: 300px)
   */
  @Input() threshold: number = 300;

  /**
   * Emitted when user scrolls near bottom of container
   */
  @Output() nearBottom = new EventEmitter<void>();

  /**
   * Emitted on every scroll event with scroll data
   */
  @Output() scrollEvent = new EventEmitter<{ scrollTop: number; scrollHeight: number; clientHeight: number }>();

  private lastEmitTime = 0;
  private readonly throttleMs = 200; // Throttle scroll events

  constructor(private el: ElementRef<HTMLElement>) {}

  @HostListener('scroll', ['$event'])
  onScroll(event: Event): void {
    const element = this.el.nativeElement;
    const { scrollTop, scrollHeight, clientHeight } = element;

    // Throttle scroll events to improve performance
    const now = Date.now();
    if (now - this.lastEmitTime > this.throttleMs) {
      this.scrollEvent.emit({ scrollTop, scrollHeight, clientHeight });
      this.lastEmitTime = now;
    }

    // Check if near bottom
    if (scrollHeight - scrollTop - clientHeight < this.threshold) {
      this.nearBottom.emit();
    }
  }

  /**
   * Programmatically scroll to top
   */
  scrollToTop(): void {
    this.el.nativeElement.scrollTop = 0;
  }

  /**
   * Programmatically scroll to bottom
   */
  scrollToBottom(): void {
    const element = this.el.nativeElement;
    element.scrollTop = element.scrollHeight;
  }

  /**
   * Get current scroll position
   */
  getScrollPosition(): { top: number; height: number; visible: number } {
    const el = this.el.nativeElement;
    return {
      top: el.scrollTop,
      height: el.scrollHeight,
      visible: el.clientHeight,
    };
  }
}

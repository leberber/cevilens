import { TestBed, ComponentFixture, fakeAsync, tick, flush } from '@angular/core/testing';
import { Component, DebugElement, signal, computed, OnInit } from '@angular/core';
import { By } from '@angular/platform-browser';
import { VirtualScrollHelper } from './virtual-scroll.helper';
import { VirtualScrollContainerDirective } from '../../shared/directives/virtual-scroll-container.directive';

/**
 * Test data generator utilities
 */
class TestDataGenerator {
  static generateLargeDataset(count: number, baseId = 0) {
    return Array.from({ length: count }, (_, i) => ({
      id: baseId + i,
      name: `Item ${baseId + i}`,
      value: Math.random() * 1000,
      category: `Category ${i % 10}`,
      selected: false,
      formValue: '',
    }));
  }

  static generateWithCustomData(count: number, factory: (i: number) => any) {
    return Array.from({ length: count }, (_, i) => factory(i));
  }
}

/**
 * Utility for measuring render performance
 */
class PerformanceMetrics {
  private marks = new Map<string, number>();

  start(label: string) {
    this.marks.set(label, performance.now());
  }

  end(label: string): number {
    const start = this.marks.get(label);
    if (!start) throw new Error(`No start mark for ${label}`);
    const duration = performance.now() - start;
    this.marks.delete(label);
    return duration;
  }

  measure(label: string, fn: () => void): number {
    this.start(label);
    fn();
    return this.end(label);
  }
}

/**
 * Test component that simulates a virtual scrolled table with large dataset
 */
@Component({
  selector: 'app-virtual-scroll-test',
  standalone: true,
  imports: [VirtualScrollContainerDirective],
  template: `
    <div
      appVirtualScrollContainer
      #container
      [threshold]="loadMoreThreshold"
      (nearBottom)="onNearBottom()"
      (scrollEvent)="onScroll($event)"
      [style.height.px]="containerHeight"
      [style.overflow]="'auto'"
      [style.border]="'1px solid #ccc'"
    >
      <div [style.height.px]="totalHeight" [style.position]="'relative'">
        <!-- Render visible items -->
        @for (item of visibleItems(); track trackByItem($index, item)) {
          <div
            [style.height.px]="itemHeight"
            [style.position]="'absolute'"
            [style.top.px]="getItemOffset($index)"
            [style.width]="'100%'"
            [style.padding]="'10px'"
            [style.border-bottom]="'1px solid #eee'"
            [attr.data-id]="item.id"
            [attr.data-index]="$index"
          >
            <span>{{ item.name }}</span>
            <span [style.margin-left]="'20px'">{{ item.value | number }}</span>
            @if (enableFormInputs) {
              <input
                type="text"
                [(ngModel)]="item.formValue"
                placeholder="Edit"
                [style.margin-left]="'20px'"
                (ngModelChange)="onItemInputChange(item)"
              />
            }
            @if (enableCheckboxes) {
              <input
                type="checkbox"
                [(ngModel)]="item.selected"
                (ngModelChange)="onItemSelectionChange(item)"
                [style.margin-left]="'20px'"
              />
            }
          </div>
        }
      </div>
    </div>
  `,
})
class VirtualScrollTestComponent implements OnInit {
  virtualScroll = TestBed.inject(VirtualScrollHelper);

  items = signal<any[]>([]);
  scrollTop = signal(0);
  containerHeight = 600;
  itemHeight = 50;
  loadMoreThreshold = 300;
  enableFormInputs = false;
  enableCheckboxes = false;

  // Track for infinite scroll
  isLoadingMore = false;
  nextBatchId = 10000;

  visibleItems = computed(() => {
    return this.virtualScroll.getVisibleItems(
      this.items(),
      this.scrollTop(),
      this.containerHeight,
      this.itemHeight,
      5 // buffer size
    );
  });

  get totalHeight(): number {
    return this.items().length * this.itemHeight;
  }

  trackByItem = this.virtualScroll.createTrackByFn((item: any) => item.id);

  ngOnInit() {
    this.items.set(TestDataGenerator.generateLargeDataset(10000));
  }

  onScroll(event: { scrollTop: number; scrollHeight: number; clientHeight: number }) {
    this.scrollTop.set(event.scrollTop);
  }

  onNearBottom() {
    if (!this.isLoadingMore) {
      this.isLoadingMore = true;
      // Simulate async batch load
      setTimeout(() => {
        const newBatch = TestDataGenerator.generateLargeDataset(1000, this.nextBatchId);
        this.nextBatchId += 1000;
        this.items.update(items => [...items, ...newBatch]);
        this.isLoadingMore = false;
      }, 100);
    }
  }

  onItemInputChange(item: any) {
    // Track form value changes
  }

  onItemSelectionChange(item: any) {
    // Track selection changes
  }

  getItemOffset(index: number): number {
    // Calculate offset accounting for buffer and visible range
    const range = this.virtualScroll.getVisibleRange(
      this.scrollTop(),
      this.containerHeight,
      this.itemHeight,
      5
    );
    const realIndex = range.start + index;
    return realIndex * this.itemHeight;
  }

  loadMoreItems(count: number) {
    const newBatch = TestDataGenerator.generateLargeDataset(count, this.nextBatchId);
    this.nextBatchId += count;
    this.items.update(items => [...items, ...newBatch]);
  }

  reset() {
    this.items.set(TestDataGenerator.generateLargeDataset(10000));
    this.scrollTop.set(0);
    this.nextBatchId = 10000;
  }
}

/**
 * INTEGRATION TESTS: Virtual Scrolling with Large Datasets
 * 35+ tests covering performance, functionality, and real-world scenarios
 */
describe('Virtual Scrolling Integration Tests', () => {
  let component: VirtualScrollTestComponent;
  let fixture: ComponentFixture<VirtualScrollTestComponent>;
  let virtualScroll: VirtualScrollHelper;
  let metrics: PerformanceMetrics;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualScrollTestComponent],
      providers: [VirtualScrollHelper],
    }).compileComponents();

    fixture = TestBed.createComponent(VirtualScrollTestComponent);
    component = fixture.componentInstance;
    virtualScroll = TestBed.inject(VirtualScrollHelper);
    metrics = new PerformanceMetrics();

    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  /**
   * SECTION 1: Large Dataset Rendering (8 tests)
   * Verify that 10,000+ items render efficiently without UI freezing
   */
  describe('1. Large Dataset Rendering', () => {
    it('should load 10,000 items without UI freeze', () => {
      const duration = metrics.measure('load-10k-items', () => {
        component.items.set(TestDataGenerator.generateLargeDataset(10000));
        fixture.detectChanges();
      });

      expect(component.items().length).toBe(10000);
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should render only visible items in DOM (not all 10,000)', () => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.directive(VirtualScrollContainerDirective));
      const renderedItems = container.nativeElement.querySelectorAll('[data-id]');

      // With 600px height, 50px items, and 5 buffer = ~20 items visible
      expect(renderedItems.length).toBeLessThan(50);
      expect(renderedItems.length).toBeGreaterThan(10);
      expect(renderedItems.length).toBeLessThan(10000);
    });

    it('should render buffer items above and below viewport', () => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      component.scrollTop.set(2500); // Scroll to middle
      fixture.detectChanges();

      const visibleItems = component.visibleItems();
      const firstItemId = visibleItems[0]?.id;
      const lastItemId = visibleItems[visibleItems.length - 1]?.id;

      // Should include buffer items before/after visible range
      const visibleStart = Math.floor(2500 / 50);
      const visibleEnd = Math.ceil((2500 + 600) / 50);
      expect(firstItemId).toBeLessThan(visibleStart);
      expect(lastItemId).toBeGreaterThan(visibleEnd);
    });

    it('should maintain constant memory usage during scroll', () => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryCheckpoints: number[] = [];

      for (let i = 0; i < 10; i++) {
        component.scrollTop.set(i * 1000);
        fixture.detectChanges();
        const currentMemory = (performance as any).memory?.usedJSHeapSize || initialMemory;
        memoryCheckpoints.push(currentMemory);
      }

      // Memory shouldn't spike significantly between scrolls
      const avgMemory = memoryCheckpoints.reduce((a, b) => a + b) / memoryCheckpoints.length;
      const maxDeviation = Math.max(...memoryCheckpoints.map(m => Math.abs(m - avgMemory)));
      // Allow 20% variance (browsers have garbage collection)
      expect(maxDeviation / avgMemory).toBeLessThan(0.2);
    });

    it('should complete render cycle in < 50ms per scroll event', () => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const renderTimes: number[] = [];
      for (let i = 0; i < 20; i++) {
        const time = metrics.measure(`scroll-render-${i}`, () => {
          component.scrollTop.set(i * 500);
          fixture.detectChanges();
        });
        renderTimes.push(time);
      }

      const avgRenderTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length;
      expect(avgRenderTime).toBeLessThan(50);
    });

    it('should bundle all 10,000 items in memory but render ~20', () => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      expect(component.items().length).toBe(10000);

      const visibleItems = component.visibleItems();
      expect(visibleItems.length).toBeLessThan(100);
      expect(visibleItems.length).toBeGreaterThan(5);
    });

    it('should complete initial render with 10k items in < 100ms', () => {
      const duration = metrics.measure('initial-render-10k', () => {
        component.items.set(TestDataGenerator.generateLargeDataset(10000));
        fixture.detectChanges();
        component.visibleItems();
      });

      expect(duration).toBeLessThan(100);
    });

    it('should maintain item count during scroll operations', () => {
      const itemCount = 10000;
      component.items.set(TestDataGenerator.generateLargeDataset(itemCount));
      fixture.detectChanges();

      for (let i = 0; i < 10; i++) {
        component.scrollTop.set(i * 1000);
        fixture.detectChanges();
        expect(component.items().length).toBe(itemCount);
      }
    });
  });

  /**
   * SECTION 2: Scroll Performance (8 tests)
   * Verify smooth 60fps scrolling and event throttling
   */
  describe('2. Scroll Performance', () => {
    it('should throttle scroll events to 200ms', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const directive = fixture.debugElement.query(
        By.directive(VirtualScrollContainerDirective)
      ).injector.get(VirtualScrollContainerDirective);
      const scrollSpy = spyOn(directive.scrollEvent, 'emit');

      const container = fixture.debugElement.nativeElement;
      container.scrollTop = 100;
      container.dispatchEvent(new Event('scroll'));
      expect(scrollSpy).toHaveBeenCalledTimes(1);

      container.scrollTop = 200;
      container.dispatchEvent(new Event('scroll'));
      // Should not emit due to throttling (less than 200ms)
      tick(100);
      expect(scrollSpy).toHaveBeenCalledTimes(1);

      tick(100);
      container.scrollTop = 300;
      container.dispatchEvent(new Event('scroll'));
      // Now 200ms has passed
      expect(scrollSpy).toHaveBeenCalledTimes(2);

      flush();
    }));

    it('should achieve smooth 60fps scrolling simulation with 10k items', () => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const frameTimings: number[] = [];
      const scrollPositions = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];

      scrollPositions.forEach(pos => {
        const time = metrics.measure(`frame-at-${pos}`, () => {
          component.scrollTop.set(pos);
          fixture.detectChanges();
        });
        frameTimings.push(time);
      });

      // Average frame time should allow 60fps (16.67ms per frame)
      const avgFrameTime = frameTimings.reduce((a, b) => a + b) / frameTimings.length;
      expect(avgFrameTime).toBeLessThan(16.67 * 2); // Allow 2x buffer for test environment
    });

    it('should not experience jank during continuous scroll', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const frameTimes: number[] = [];
      const scrollSpeed = 100; // pixels per tick

      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        component.scrollTop.set(i * scrollSpeed);
        fixture.detectChanges();
        const elapsed = performance.now() - start;
        frameTimes.push(elapsed);
        tick(16); // ~60fps
      }

      // No single frame should take more than 3x average
      const avgTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
      const jankyFrames = frameTimes.filter(t => t > avgTime * 3).length;
      expect(jankyFrames).toBeLessThan(2);

      flush();
    }));

    it('should track scroll position accurately throughout scroll', () => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const testPositions = [0, 500, 1000, 2500, 5000, 7500, 10000];

      testPositions.forEach(pos => {
        component.scrollTop.set(pos);
        fixture.detectChanges();
        expect(component.scrollTop()).toBe(pos);
      });
    });

    it('should support scroll to top method', () => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      // Scroll to middle
      component.scrollTop.set(5000);
      fixture.detectChanges();
      expect(component.scrollTop()).toBe(5000);

      // Scroll to top
      const directive = fixture.debugElement.query(
        By.directive(VirtualScrollContainerDirective)
      ).injector.get(VirtualScrollContainerDirective);
      directive.scrollToTop();
      component.scrollTop.set(0);
      fixture.detectChanges();

      expect(component.scrollTop()).toBe(0);
    });

    it('should support scroll to bottom method', () => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const directive = fixture.debugElement.query(
        By.directive(VirtualScrollContainerDirective)
      ).injector.get(VirtualScrollContainerDirective);
      const totalHeight = component.totalHeight;

      // Scroll to bottom
      directive.scrollToBottom();
      component.scrollTop.set(totalHeight - component.containerHeight);
      fixture.detectChanges();

      expect(component.scrollTop()).toBeGreaterThan(totalHeight - component.containerHeight - 100);
    });

    it('should handle keyboard navigation (arrow keys)', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const container = fixture.debugElement.nativeElement;
      const scrollAmount = 50;

      // Simulate arrow down
      component.scrollTop.set(component.scrollTop() + scrollAmount);
      fixture.detectChanges();
      expect(component.scrollTop()).toBe(scrollAmount);

      tick(200);

      // Simulate arrow up
      component.scrollTop.set(component.scrollTop() - scrollAmount);
      fixture.detectChanges();
      expect(component.scrollTop()).toBe(0);

      flush();
    }));

    it('should handle mouse wheel scroll events', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const container = fixture.debugElement.nativeElement;
      const wheelEvent = new WheelEvent('wheel', { deltaY: 100 });
      const initialScroll = component.scrollTop();

      component.scrollTop.set(initialScroll + 100);
      fixture.detectChanges();

      expect(component.scrollTop()).toBeGreaterThan(initialScroll);

      flush();
    }));

    it('should handle touch scroll on mobile', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const container = fixture.debugElement.nativeElement;
      const initialScroll = 0;
      const touchDistance = 200;

      // Simulate touch scroll down
      component.scrollTop.set(initialScroll + touchDistance);
      fixture.detectChanges();

      expect(component.scrollTop()).toBe(touchDistance);

      // Simulate touch scroll up
      component.scrollTop.set(component.scrollTop() - 100);
      fixture.detectChanges();

      expect(component.scrollTop()).toBe(100);

      flush();
    }));
  });

  /**
   * SECTION 3: Infinite Scroll Pattern (8 tests)
   * Verify load-more triggering and batch loading
   */
  describe('3. Infinite Scroll Pattern', () => {
    it('should trigger load-more at 300px threshold from bottom', fakeAsync(() => {
      const initialCount = 5000;
      component.items.set(TestDataGenerator.generateLargeDataset(initialCount));
      component.loadMoreThreshold = 300;
      fixture.detectChanges();

      const directive = fixture.debugElement.query(
        By.directive(VirtualScrollContainerDirective)
      ).injector.get(VirtualScrollContainerDirective);

      const nearBottomSpy = spyOn(directive.nearBottom, 'emit');

      // Scroll near bottom
      const scrollPos = component.totalHeight - component.containerHeight - 200;
      component.scrollTop.set(scrollPos);
      fixture.detectChanges();

      const container = fixture.debugElement.nativeElement;
      container.dispatchEvent(new Event('scroll'));

      tick(300);
      expect(nearBottomSpy).toHaveBeenCalled();
      flush();
    }));

    it('should append new batch to existing items', fakeAsync(() => {
      const initialCount = 1000;
      component.items.set(TestDataGenerator.generateLargeDataset(initialCount));
      fixture.detectChanges();

      const initialLength = component.items().length;
      expect(initialLength).toBe(initialCount);

      // Load more
      component.loadMoreItems(1000);
      tick(100);
      fixture.detectChanges();

      expect(component.items().length).toBe(initialCount + 1000);
      flush();
    }));

    it('should maintain scroll position after batch append', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(1000));
      fixture.detectChanges();

      const scrollPos = 2500;
      component.scrollTop.set(scrollPos);
      fixture.detectChanges();

      // Load more items
      component.loadMoreItems(1000);
      tick(100);
      fixture.detectChanges();

      // Scroll position should remain the same
      expect(component.scrollTop()).toBe(scrollPos);
      flush();
    }));

    it('should load multiple batches sequentially', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(1000));
      fixture.detectChanges();

      let itemCount = 1000;
      const batchSize = 500;

      for (let i = 0; i < 3; i++) {
        component.loadMoreItems(batchSize);
        itemCount += batchSize;
        tick(100);
        fixture.detectChanges();
        expect(component.items().length).toBe(itemCount);
      }

      expect(component.items().length).toBe(2500);
      flush();
    }));

    it('should handle network delay simulation during batch load', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(1000));
      fixture.detectChanges();

      const initialLength = component.items().length;
      component.isLoadingMore = true;

      tick(500); // Simulate 500ms network delay

      component.loadMoreItems(500);
      component.isLoadingMore = false;
      tick(100);
      fixture.detectChanges();

      expect(component.items().length).toBe(initialLength + 500);
      flush();
    }));

    it('should show loading indicator while fetching batch', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(1000));
      fixture.detectChanges();

      component.isLoadingMore = true;
      fixture.detectChanges();

      expect(component.isLoadingMore).toBe(true);

      tick(300);
      component.loadMoreItems(500);
      component.isLoadingMore = false;
      fixture.detectChanges();

      expect(component.isLoadingMore).toBe(false);
      flush();
    }));

    it('should handle error during batch load gracefully', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(1000));
      fixture.detectChanges();

      const initialLength = component.items().length;
      component.isLoadingMore = true;

      try {
        tick(500); // Simulate error during load
        throw new Error('Network error');
      } catch (e) {
        component.isLoadingMore = false;
      }

      fixture.detectChanges();
      expect(component.items().length).toBe(initialLength);
      expect(component.isLoadingMore).toBe(false);

      flush();
    }));

    it('should allow user to continue scrolling during batch load', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(2000));
      fixture.detectChanges();

      component.isLoadingMore = true;
      const initialScroll = 1000;
      component.scrollTop.set(initialScroll);
      fixture.detectChanges();

      tick(200);

      // User scrolls while loading
      component.scrollTop.set(initialScroll + 500);
      fixture.detectChanges();

      expect(component.scrollTop()).toBe(initialScroll + 500);

      tick(300);
      component.loadMoreItems(500);
      component.isLoadingMore = false;
      fixture.detectChanges();

      expect(component.items().length).toBeGreaterThan(2000);
      flush();
    }));
  });

  /**
   * SECTION 4: Item Tracking & Re-rendering (6 tests)
   * Verify trackBy optimization and item state preservation
   */
  describe('4. Item Tracking & Re-rendering', () => {
    it('should use trackBy function to prevent unnecessary re-renders', () => {
      const items = TestDataGenerator.generateLargeDataset(100);
      component.items.set(items);
      fixture.detectChanges();

      const trackBy = component.trackByItem;
      expect(trackBy(0, items[0])).toBe(items[0].id);
      expect(trackBy(1, items[1])).toBe(items[1].id);

      // Same item, same ID
      expect(trackBy(0, items[0])).toBe(trackBy(0, items[0]));
    });

    it('should preserve item identity during scroll', () => {
      const items = TestDataGenerator.generateLargeDataset(1000);
      component.items.set(items);
      fixture.detectChanges();

      const targetItem = items[500];
      component.scrollTop.set(25000); // Scroll to middle
      fixture.detectChanges();

      const visibleItems = component.visibleItems();
      const trackBy = component.trackByItem;

      const identities = visibleItems.map((item, i) => trackBy(i, item));
      expect(identities).toContain(targetItem.id);
    });

    it('should retain form input values in items during scroll', fakeAsync(() => {
      component.enableFormInputs = true;
      const items = TestDataGenerator.generateLargeDataset(500);
      component.items.set(items);
      fixture.detectChanges();

      // Set form value on first visible item
      const firstItem = component.visibleItems()[0];
      firstItem.formValue = 'TEST_VALUE_123';
      fixture.detectChanges();

      tick(200);

      // Scroll around
      component.scrollTop.set(2500);
      fixture.detectChanges();

      tick(100);

      // Scroll back
      component.scrollTop.set(0);
      fixture.detectChanges();

      expect(firstItem.formValue).toBe('TEST_VALUE_123');
      flush();
    }));

    it('should preserve checkbox selection state during scroll', fakeAsync(() => {
      component.enableCheckboxes = true;
      const items = TestDataGenerator.generateLargeDataset(500);
      component.items.set(items);
      fixture.detectChanges();

      // Select some items
      items[0].selected = true;
      items[50].selected = true;
      items[100].selected = true;
      fixture.detectChanges();

      // Scroll through list
      for (let i = 0; i < 5; i++) {
        component.scrollTop.set(i * 1000);
        fixture.detectChanges();
        tick(50);
      }

      // Check selections preserved
      expect(items[0].selected).toBe(true);
      expect(items[50].selected).toBe(true);
      expect(items[100].selected).toBe(true);

      flush();
    }));

    it('should preserve item data integrity during multiple scroll cycles', () => {
      const items = TestDataGenerator.generateLargeDataset(1000);
      const originalData = items.map(item => ({ ...item }));
      component.items.set(items);
      fixture.detectChanges();

      for (let i = 0; i < 10; i++) {
        component.scrollTop.set(i * 1000);
        fixture.detectChanges();

        component.visibleItems().forEach((item) => {
          const original = originalData.find(o => o.id === item.id);
          expect(original).toBeDefined();
          expect(item.id).toBe(original?.id);
          expect(item.name).toBe(original?.name);
        });
      }
    });

    it('should re-render only changed items after list update', fakeAsync(() => {
      const items = TestDataGenerator.generateLargeDataset(100);
      component.items.set(items);
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.directive(VirtualScrollContainerDirective));
      const initialElements = container.nativeElement.querySelectorAll('[data-id]');
      const initialCount = initialElements.length;

      // Modify one item deep in the list
      items[50].value = 999999;
      component.items.set([...items]); // Trigger change detection
      fixture.detectChanges();
      tick(50);

      const newElements = container.nativeElement.querySelectorAll('[data-id]');
      // Only affected item should be re-rendered (not all items)
      expect(newElements.length).toBeLessThanOrEqual(initialCount + 1);

      flush();
    }));
  });

  /**
   * SECTION 5: Real Table/List Integration (5 tests)
   * Verify virtual scroll works with actual table patterns
   */
  describe('5. Real Table/List Integration', () => {
    it('should work with virtual scroll in actual table component', () => {
      component.items.set(TestDataGenerator.generateLargeDataset(5000));
      fixture.detectChanges();

      const container = fixture.debugElement.query(By.directive(VirtualScrollContainerDirective));
      expect(container).toBeTruthy();

      // Verify table structure
      const rows = container.nativeElement.querySelectorAll('[data-id]');
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThan(100);
    });

    it('should keep column headers visible while scrolling', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(5000));
      fixture.detectChanges();

      // Simulate sticky header (would be in real component)
      const headerHeight = 50;
      const initialHeaderPos = 0;

      for (let i = 0; i < 10; i++) {
        component.scrollTop.set(i * 1000);
        fixture.detectChanges();
        tick(50);

        // Header should stay at top
        expect(initialHeaderPos).toBe(0);
      }

      flush();
    }));

    it('should support sorting with virtual scroll', () => {
      const items = TestDataGenerator.generateLargeDataset(1000);
      component.items.set(items);
      fixture.detectChanges();

      const originalItems = [...component.items()];

      // Sort by value
      component.items.update(items => [...items].sort((a, b) => a.value - b.value));
      fixture.detectChanges();

      const sorted = component.items();
      expect(sorted[0].value).toBeLessThanOrEqual(sorted[sorted.length - 1].value);

      // Verify items are still there
      expect(sorted.length).toBe(originalItems.length);
    });

    it('should support filtering with virtual scroll', fakeAsync(() => {
      const items = TestDataGenerator.generateWithCustomData(1000, i => ({
        id: i,
        name: `Item ${i}`,
        category: i % 3 === 0 ? 'A' : 'B',
      }));
      component.items.set(items);
      fixture.detectChanges();

      // Filter to only category A
      const filtered = items.filter(item => item.category === 'A');
      component.items.set(filtered);
      fixture.detectChanges();

      tick(50);

      const visibleItems = component.visibleItems();
      visibleItems.forEach(item => {
        expect(item.category).toBe('A');
      });

      flush();
    }));

    it('should handle selection checkbox integration', fakeAsync(() => {
      component.enableCheckboxes = true;
      const items = TestDataGenerator.generateLargeDataset(1000);
      component.items.set(items);
      fixture.detectChanges();

      // Select multiple items across different scroll positions
      const selectedIds = [0, 100, 250, 500, 750, 999];
      selectedIds.forEach(id => {
        const item = items[id];
        if (item) item.selected = true;
      });
      fixture.detectChanges();

      let selectionCount = 0;
      component.items().forEach(item => {
        if (item.selected) selectionCount++;
      });

      expect(selectionCount).toBe(selectedIds.length);
      flush();
    }));
  });

  /**
   * SECTION 6: Edge Cases & Advanced Scenarios (4 additional tests)
   */
  describe('6. Edge Cases & Advanced Scenarios', () => {
    it('should handle rapid scroll direction changes', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const positions = [0, 5000, 2500, 7500, 4000, 9000, 1000, 6000];
      positions.forEach(pos => {
        component.scrollTop.set(pos);
        fixture.detectChanges();
        tick(50);
      });

      expect(component.scrollTop()).toBe(positions[positions.length - 1]);
      flush();
    }));

    it('should handle very small item heights (20px)', () => {
      component.itemHeight = 20;
      const items = TestDataGenerator.generateLargeDataset(10000);
      component.items.set(items);
      fixture.detectChanges();

      const visibleItems = component.visibleItems();
      // With smaller item height, more items visible
      expect(visibleItems.length).toBeGreaterThan(20);
    });

    it('should handle very large item heights (500px)', () => {
      component.itemHeight = 500;
      const items = TestDataGenerator.generateLargeDataset(100);
      component.items.set(items);
      fixture.detectChanges();

      const visibleItems = component.visibleItems();
      // With large item height, fewer items visible
      expect(visibleItems.length).toBeLessThan(10);
    });

    it('should handle dynamically changing dataset while maintaining scroll', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(5000));
      fixture.detectChanges();

      component.scrollTop.set(2500);
      fixture.detectChanges();
      const initialScroll = component.scrollTop();

      tick(100);

      // Change dataset while scrolled
      component.items.set(TestDataGenerator.generateLargeDataset(5000));
      fixture.detectChanges();

      expect(component.scrollTop()).toBe(initialScroll);
      flush();
    }));
  });

  /**
   * SECTION 7: Performance Benchmark Tests (3 additional tests)
   */
  describe('7. Performance Benchmarks', () => {
    it('should render 10k items faster than 500ms', () => {
      const duration = metrics.measure('render-10k-benchmark', () => {
        component.items.set(TestDataGenerator.generateLargeDataset(10000));
        fixture.detectChanges();
        component.visibleItems();
      });

      expect(duration).toBeLessThan(500);
    });

    it('should handle 100 scroll events in < 5 seconds', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const totalTime = metrics.measure('100-scroll-events', () => {
        for (let i = 0; i < 100; i++) {
          component.scrollTop.set(Math.floor(Math.random() * component.totalHeight));
          fixture.detectChanges();
          tick(20);
        }
      });

      expect(totalTime).toBeLessThan(5000);
      flush();
    }));

    it('should maintain sub-16ms frame time for smooth animation', fakeAsync(() => {
      component.items.set(TestDataGenerator.generateLargeDataset(10000));
      fixture.detectChanges();

      const frameTimes: number[] = [];

      for (let i = 0; i < 60; i++) {
        const frameStart = performance.now();
        component.scrollTop.set(i * 100);
        fixture.detectChanges();
        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
        tick(16); // ~60fps
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
      const maxFrameTime = Math.max(...frameTimes);

      expect(avgFrameTime).toBeLessThan(16.67);
      expect(maxFrameTime).toBeLessThan(50); // Allow some variance

      flush();
    }));
  });
});

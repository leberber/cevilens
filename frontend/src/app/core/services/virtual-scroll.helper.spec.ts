import { TestBed } from '@angular/core/testing';
import { VirtualScrollHelper } from './virtual-scroll.helper';

describe('VirtualScrollHelper', () => {
  let service: VirtualScrollHelper;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VirtualScrollHelper],
    });
    service = TestBed.inject(VirtualScrollHelper);
  });

  describe('getVisibleRange', () => {
    it('should calculate visible range with default buffer', () => {
      const range = service.getVisibleRange(0, 500, 50);
      expect(range.start).toBe(0);
      expect(range.end).toBeGreaterThan(0);
    });

    it('should calculate visible range at top', () => {
      const range = service.getVisibleRange(0, 500, 50);
      expect(range.start).toBe(0);
      expect(range.end).toBe(15); // (500/50) + 5 buffer
    });

    it('should calculate visible range in middle', () => {
      const range = service.getVisibleRange(2500, 500, 50);
      expect(range.start).toBeGreaterThanOrEqual(45);
      expect(range.end).toBeLessThanOrEqual(65);
    });

    it('should not return negative start index', () => {
      const range = service.getVisibleRange(50, 500, 50);
      expect(range.start).toBe(0);
    });

    it('should apply custom buffer size', () => {
      const rangeSmallBuffer = service.getVisibleRange(2500, 500, 50, 2);
      const rangeLargeBuffer = service.getVisibleRange(2500, 500, 50, 10);
      expect(rangeSmallBuffer.start).toBeGreaterThan(rangeLargeBuffer.start);
    });

    it('should handle various scroll positions', () => {
      const positions = [0, 500, 1000, 2000, 5000];
      positions.forEach(scrollTop => {
        const range = service.getVisibleRange(scrollTop, 500, 50);
        expect(range.start).toBeGreaterThanOrEqual(0);
        expect(range.end).toBeGreaterThan(range.start);
      });
    });

    it('should handle different item heights', () => {
      const range30 = service.getVisibleRange(1000, 500, 30);
      const range50 = service.getVisibleRange(1000, 500, 50);
      expect(range30.end - range30.start).toBeGreaterThan(range50.end - range50.start);
    });
  });

  describe('getVisibleItems', () => {
    it('should return visible items from array', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, value: `Item ${i}` }));
      const visible = service.getVisibleItems(items, 0, 500, 50);
      expect(visible.length).toBeGreaterThan(0);
      expect(visible[0].id).toBe(0);
    });

    it('should filter items based on scroll position', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const visibleTop = service.getVisibleItems(items, 0, 500, 50);
      const visibleMiddle = service.getVisibleItems(items, 2500, 500, 50);
      expect(visibleTop[0]).toBeLessThan(visibleMiddle[0]);
    });

    it('should include buffer items', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const visible = service.getVisibleItems(items, 2500, 500, 50, 10);
      const range = service.getVisibleRange(2500, 500, 50, 10);
      expect(visible.length).toBe(range.end - range.start);
    });

    it('should handle empty array', () => {
      const visible = service.getVisibleItems([], 0, 500, 50);
      expect(visible.length).toBe(0);
    });

    it('should not exceed array bounds', () => {
      const items = Array.from({ length: 10 }, (_, i) => i);
      const visible = service.getVisibleItems(items, 5000, 500, 50);
      expect(visible.every(item => items.includes(item))).toBe(true);
    });

    it('should work with custom objects', () => {
      const items = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
      }));
      const visible = service.getVisibleItems(items, 1000, 400, 40);
      expect(visible.every(item => item.id !== undefined)).toBe(true);
    });
  });

  describe('scrollPositionForItem', () => {
    it('should calculate scroll position for first item', () => {
      const position = service.scrollPositionForItem(0, 50);
      expect(position).toBe(0);
    });

    it('should calculate scroll position for middle item', () => {
      const position = service.scrollPositionForItem(10, 50);
      expect(position).toBe(500);
    });

    it('should calculate scroll position for last item', () => {
      const position = service.scrollPositionForItem(100, 50);
      expect(position).toBe(5000);
    });

    it('should handle different item heights', () => {
      const pos50 = service.scrollPositionForItem(10, 50);
      const pos100 = service.scrollPositionForItem(10, 100);
      expect(pos100).toBe(pos50 * 2);
    });

    it('should handle large indices', () => {
      const position = service.scrollPositionForItem(10000, 50);
      expect(position).toBe(500000);
    });
  });

  describe('isNearBottom', () => {
    it('should return true when near bottom with default threshold', () => {
      const totalHeight = 10000;
      const containerHeight = 500;
      const scrollTop = totalHeight - containerHeight - 200; // 200px from bottom
      const result = service.isNearBottom(scrollTop, containerHeight, totalHeight);
      expect(result).toBe(true);
    });

    it('should return false when far from bottom', () => {
      const totalHeight = 10000;
      const containerHeight = 500;
      const scrollTop = 1000;
      const result = service.isNearBottom(scrollTop, containerHeight, totalHeight);
      expect(result).toBe(false);
    });

    it('should return true at exact bottom', () => {
      const totalHeight = 10000;
      const containerHeight = 500;
      const scrollTop = totalHeight - containerHeight;
      const result = service.isNearBottom(scrollTop, containerHeight, totalHeight);
      expect(result).toBe(true);
    });

    it('should respect custom threshold', () => {
      const totalHeight = 10000;
      const containerHeight = 500;
      const scrollTop = totalHeight - containerHeight - 150;
      const smallThreshold = service.isNearBottom(scrollTop, containerHeight, totalHeight, 100);
      const largeThreshold = service.isNearBottom(scrollTop, containerHeight, totalHeight, 200);
      expect(smallThreshold).toBe(false);
      expect(largeThreshold).toBe(true);
    });

    it('should handle different container heights', () => {
      const totalHeight = 5000;
      const scrollTop = 4000;
      const small = service.isNearBottom(scrollTop, 100, totalHeight);
      const large = service.isNearBottom(scrollTop, 1000, totalHeight);
      expect(small).toBe(false);  // distance = 5000 - 4000 - 100 = 900 > 300
      expect(large).toBe(true);   // distance = 5000 - 4000 - 1000 = 0 < 300
    });
  });

  describe('createTrackByFn', () => {
    it('should use id extractor when provided', () => {
      const items = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
      const trackBy = service.createTrackByFn((item: any) => item.id);
      expect(trackBy(0, items[0])).toBe(1);
      expect(trackBy(1, items[1])).toBe(2);
    });

    it('should extract id property by default', () => {
      const items = [{ id: 'a1', value: 'A' }, { id: 'a2', value: 'B' }];
      const trackBy = service.createTrackByFn();
      expect(trackBy(0, items[0])).toBe('a1');
      expect(trackBy(1, items[1])).toBe('a2');
    });

    it('should fallback to code property', () => {
      const items = [{ code: 'C001', value: 'A' }, { code: 'C002', value: 'B' }];
      const trackBy = service.createTrackByFn();
      expect(trackBy(0, items[0])).toBe('C001');
      expect(trackBy(1, items[1])).toBe('C002');
    });

    it('should fallback to key property', () => {
      const items = [{ key: 'K1', value: 'A' }, { key: 'K2', value: 'B' }];
      const trackBy = service.createTrackByFn();
      expect(trackBy(0, items[0])).toBe('K1');
      expect(trackBy(1, items[1])).toBe('K2');
    });

    it('should fallback to index', () => {
      const items = [{ value: 'A' }, { value: 'B' }];
      const trackBy = service.createTrackByFn();
      expect(trackBy(0, items[0])).toBe(0);
      expect(trackBy(1, items[1])).toBe(1);
    });

    it('should prefer id over other properties', () => {
      const item = { id: 'id1', code: 'code1', key: 'key1' };
      const trackBy = service.createTrackByFn();
      expect(trackBy(0, item)).toBe('id1');
    });

    it('should prefer code over key', () => {
      const item = { code: 'code1', key: 'key1' };
      const trackBy = service.createTrackByFn();
      expect(trackBy(0, item as any)).toBe('code1');
    });

    it('should pass item and index to custom extractor', () => {
      const extractor = jasmine.createSpy('extractor').and.returnValue('result');
      const item = { id: 1 };
      const trackBy = service.createTrackByFn((i: any) => extractor(i));
      trackBy(5, item as any);
      expect(extractor).toHaveBeenCalledWith(item);
    });
  });

  describe('batchRenderItems', () => {
    it('should split items into batches', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const batches = service.batchRenderItems(items, 30);
      expect(batches.length).toBe(4); // 30 + 30 + 30 + 10
    });

    it('should use default batch size of 50', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const batches = service.batchRenderItems(items);
      expect(batches.length).toBe(2);
    });

    it('should preserve item order within batches', () => {
      const items = Array.from({ length: 10 }, (_, i) => i);
      const batches = service.batchRenderItems(items, 3);
      expect(batches[0]).toEqual([0, 1, 2]);
      expect(batches[1]).toEqual([3, 4, 5]);
      expect(batches[2]).toEqual([6, 7, 8]);
      expect(batches[3]).toEqual([9]);
    });

    it('should handle empty array', () => {
      const batches = service.batchRenderItems([], 50);
      expect(batches.length).toBe(0);
    });

    it('should handle single item', () => {
      const batches = service.batchRenderItems([1], 50);
      expect(batches.length).toBe(1);
      expect(batches[0]).toEqual([1]);
    });

    it('should handle exact batch size', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const batches = service.batchRenderItems(items, 50);
      expect(batches.length).toBe(2);
      expect(batches[0].length).toBe(50);
      expect(batches[1].length).toBe(50);
    });

    it('should handle batch size of 1', () => {
      const items = [1, 2, 3];
      const batches = service.batchRenderItems(items, 1);
      expect(batches.length).toBe(3);
      expect(batches[0]).toEqual([1]);
      expect(batches[1]).toEqual([2]);
      expect(batches[2]).toEqual([3]);
    });

    it('should work with object items', () => {
      const items = [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' },
      ];
      const batches = service.batchRenderItems(items, 2);
      expect(batches.length).toBe(2);
      expect(batches[0][0].id).toBe(1);
      expect(batches[1][0].id).toBe(3);
    });
  });

  describe('integration scenarios', () => {
    it('should handle typical infinite scroll scenario', () => {
      const totalItems = 1000;
      const itemHeight = 50;
      const containerHeight = 500;
      const items = Array.from({ length: totalItems }, (_, i) => i);

      // Initial load
      let visible = service.getVisibleItems(items, 0, containerHeight, itemHeight);
      expect(visible.length).toBeGreaterThan(0);

      // Scroll to middle
      const middleScroll = (totalItems * itemHeight) / 2;
      visible = service.getVisibleItems(items, middleScroll, containerHeight, itemHeight);
      expect(visible.length).toBeGreaterThan(0);

      // Check if near bottom
      const nearBottom = service.isNearBottom(
        (totalItems * itemHeight) - containerHeight - 100,
        containerHeight,
        totalItems * itemHeight
      );
      expect(nearBottom).toBe(true);
    });

    it('should calculate position for scroll-to-item', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const targetIndex = 50;
      const itemHeight = 40;
      const position = service.scrollPositionForItem(targetIndex, itemHeight);
      const range = service.getVisibleRange(position, 500, itemHeight);
      expect(range.start).toBeLessThanOrEqual(targetIndex);
      expect(range.end).toBeGreaterThan(targetIndex);
    });

    it('should batch render large dataset', () => {
      const items = Array.from({ length: 5000 }, (_, i) => ({ id: i, value: `Item ${i}` }));
      const batches = service.batchRenderItems(items, 100);
      expect(batches.length).toBe(50);
      const totalItems = batches.reduce((sum, batch) => sum + batch.length, 0);
      expect(totalItems).toBe(5000);
    });
  });
});

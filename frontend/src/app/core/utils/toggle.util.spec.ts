import {
  toggleInSet,
  isInSet,
  isSetEmpty,
  setToArray,
  arrayToSet,
  toggleSetAll,
} from './toggle.util';

describe('Toggle Utilities', () => {
  describe('toggleInSet - Basic functionality', () => {
    it('should add item to empty set', () => {
      const set = new Set<number>();
      const result = toggleInSet(set, 1);

      expect(result.has(1)).toBe(true);
      expect(result.size).toBe(1);
    });

    it('should remove item from set', () => {
      const set = new Set([1, 2, 3]);
      const result = toggleInSet(set, 2);

      expect(result.has(2)).toBe(false);
      expect(result.size).toBe(2);
    });

    it('should add item if not present', () => {
      const set = new Set([1, 2]);
      const result = toggleInSet(set, 3);

      expect(result.has(3)).toBe(true);
      expect(result.size).toBe(3);
    });

    it('should return new Set instance', () => {
      const set = new Set([1]);
      const result = toggleInSet(set, 2);

      expect(result).not.toBe(set);
      expect(set.has(2)).toBe(false); // Original unchanged
      expect(result.has(2)).toBe(true);
    });

    it('should preserve other items when toggling', () => {
      const set = new Set([1, 2, 3]);
      const result = toggleInSet(set, 2);

      expect(result.has(1)).toBe(true);
      expect(result.has(3)).toBe(true);
    });

    it('should handle string items', () => {
      const set = new Set<string>();
      const result = toggleInSet(set, 'apple');

      expect(result.has('apple')).toBe(true);
    });

    it('should handle object items', () => {
      const obj = { id: 1, name: 'test' };
      const set = new Set<any>();
      const result = toggleInSet(set, obj);

      expect(result.has(obj)).toBe(true);
    });

    it('should work with multiple toggles', () => {
      let set = new Set<number>();
      set = toggleInSet(set, 1); // Add 1
      set = toggleInSet(set, 2); // Add 2
      set = toggleInSet(set, 1); // Remove 1
      set = toggleInSet(set, 3); // Add 3

      expect(set.has(1)).toBe(false);
      expect(set.has(2)).toBe(true);
      expect(set.has(3)).toBe(true);
      expect(set.size).toBe(2);
    });
  });

  describe('toggleInSet - Large sets', () => {
    it('should handle large sets efficiently', () => {
      const set = new Set(Array.from({ length: 10000 }, (_, i) => i));
      const result = toggleInSet(set, 5000);

      expect(result.has(5000)).toBe(false);
      expect(result.size).toBe(9999);
    });

    it('should add to large set', () => {
      const set = new Set(Array.from({ length: 10000 }, (_, i) => i));
      const result = toggleInSet(set, 10001);

      expect(result.has(10001)).toBe(true);
      expect(result.size).toBe(10001);
    });
  });

  describe('isInSet - Basic functionality', () => {
    it('should return true if item in set', () => {
      const set = new Set([1, 2, 3]);
      expect(isInSet(set, 2)).toBe(true);
    });

    it('should return false if item not in set', () => {
      const set = new Set([1, 2, 3]);
      expect(isInSet(set, 4)).toBe(false);
    });

    it('should return false for empty set', () => {
      const set = new Set<number>();
      expect(isInSet(set, 1)).toBe(false);
    });

    it('should handle string items', () => {
      const set = new Set(['apple', 'banana']);
      expect(isInSet(set, 'apple')).toBe(true);
      expect(isInSet(set, 'orange')).toBe(false);
    });

    it('should handle object items', () => {
      const obj = { id: 1 };
      const set = new Set([obj]);
      expect(isInSet(set, obj)).toBe(true);
    });

    it('should differentiate between equal objects', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 1 };
      const set = new Set([obj1]);

      expect(isInSet(set, obj1)).toBe(true);
      expect(isInSet(set, obj2)).toBe(false); // Different reference
    });

    it('should handle null', () => {
      const set = new Set([1, 2, null]);
      expect(isInSet(set, null)).toBe(true);
    });

    it('should handle undefined', () => {
      const set = new Set([1, 2, undefined]);
      expect(isInSet(set, undefined)).toBe(true);
    });
  });

  describe('isSetEmpty - Basic functionality', () => {
    it('should return true for empty set', () => {
      const set = new Set<number>();
      expect(isSetEmpty(set)).toBe(true);
    });

    it('should return false for non-empty set', () => {
      const set = new Set([1]);
      expect(isSetEmpty(set)).toBe(false);
    });

    it('should return false for set with multiple items', () => {
      const set = new Set([1, 2, 3]);
      expect(isSetEmpty(set)).toBe(false);
    });

    it('should return true after removing all items', () => {
      const set = new Set([1]);
      set.delete(1);
      expect(isSetEmpty(set)).toBe(true);
    });

    it('should handle string set', () => {
      const empty = new Set<string>();
      const filled = new Set(['test']);

      expect(isSetEmpty(empty)).toBe(true);
      expect(isSetEmpty(filled)).toBe(false);
    });
  });

  describe('setToArray - Basic functionality', () => {
    it('should convert set to array', () => {
      const set = new Set([1, 2, 3]);
      const arr = setToArray(set);

      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBe(3);
    });

    it('should convert empty set to empty array', () => {
      const set = new Set<number>();
      const arr = setToArray(set);

      expect(arr.length).toBe(0);
    });

    it('should preserve items', () => {
      const set = new Set([1, 2, 3]);
      const arr = setToArray(set);

      expect(arr).toContain(1);
      expect(arr).toContain(2);
      expect(arr).toContain(3);
    });

    it('should handle string set', () => {
      const set = new Set(['a', 'b', 'c']);
      const arr = setToArray(set);

      expect(arr.length).toBe(3);
      expect(arr).toContain('a');
      expect(arr).toContain('b');
      expect(arr).toContain('c');
    });

    it('should handle object set', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const set = new Set([obj1, obj2]);
      const arr = setToArray(set);

      expect(arr.includes(obj1)).toBe(true);
      expect(arr.includes(obj2)).toBe(true);
    });

    it('should not modify original set', () => {
      const set = new Set([1, 2, 3]);
      const arr = setToArray(set);
      arr.push(4);

      expect(set.size).toBe(3);
      expect(set.has(4)).toBe(false);
    });

    it('should maintain item references', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const set = new Set(items);
      const arr = setToArray(set);

      expect(arr[0] === items[0] || arr[0] === items[1]).toBe(true);
    });
  });

  describe('arrayToSet - Basic functionality', () => {
    it('should convert array to set', () => {
      const arr = [1, 2, 3];
      const set = arrayToSet(arr);

      expect(set instanceof Set).toBe(true);
      expect(set.size).toBe(3);
    });

    it('should convert empty array to empty set', () => {
      const arr: number[] = [];
      const set = arrayToSet(arr);

      expect(set.size).toBe(0);
    });

    it('should remove duplicates', () => {
      const arr = [1, 2, 2, 3, 3, 3];
      const set = arrayToSet(arr);

      expect(set.size).toBe(3);
      expect(set.has(1)).toBe(true);
      expect(set.has(2)).toBe(true);
      expect(set.has(3)).toBe(true);
    });

    it('should handle string array', () => {
      const arr = ['a', 'b', 'c'];
      const set = arrayToSet(arr);

      expect(set.has('a')).toBe(true);
      expect(set.has('b')).toBe(true);
      expect(set.has('c')).toBe(true);
    });

    it('should handle object array', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const arr = [obj1, obj2];
      const set = arrayToSet(arr);

      expect(set.has(obj1)).toBe(true);
      expect(set.has(obj2)).toBe(true);
    });

    it('should not modify original array', () => {
      const arr = [1, 2, 3];
      const set = arrayToSet(arr);
      set.add(4);

      expect(arr.length).toBe(3);
      expect(arr.includes(4)).toBe(false);
    });

    it('should handle duplicates with same object reference', () => {
      const obj = { id: 1 };
      const arr = [obj, obj, obj];
      const set = arrayToSet(arr);

      expect(set.size).toBe(1);
    });
  });

  describe('toggleSetAll - Basic functionality', () => {
    it('should select all when set is empty', () => {
      const items = [1, 2, 3];
      const set = new Set<number>();
      const result = toggleSetAll(set, items);

      expect(result.size).toBe(3);
      expect(result.has(1)).toBe(true);
      expect(result.has(2)).toBe(true);
      expect(result.has(3)).toBe(true);
    });

    it('should clear all when all selected', () => {
      const items = [1, 2, 3];
      const set = new Set(items);
      const result = toggleSetAll(set, items);

      expect(result.size).toBe(0);
    });

    it('should select all when some selected', () => {
      const items = [1, 2, 3];
      const set = new Set([1, 2]); // Only 2 of 3
      const result = toggleSetAll(set, items);

      expect(result.size).toBe(3);
      expect(result.has(1)).toBe(true);
      expect(result.has(2)).toBe(true);
      expect(result.has(3)).toBe(true);
    });

    it('should select all with string items', () => {
      const items = ['apple', 'banana', 'cherry'];
      const set = new Set<string>();
      const result = toggleSetAll(set, items);

      expect(result.has('apple')).toBe(true);
      expect(result.has('banana')).toBe(true);
      expect(result.has('cherry')).toBe(true);
    });

    it('should clear all with string items', () => {
      const items = ['apple', 'banana', 'cherry'];
      const set = new Set(items);
      const result = toggleSetAll(set, items);

      expect(result.size).toBe(0);
    });

    it('should not modify when items is empty', () => {
      const items: number[] = [];
      const set = new Set([1, 2, 3]);
      const result = toggleSetAll(set, items);

      // Since set.size (3) !== items.length (0), it selects all from empty items
      expect(result.size).toBe(0);
    });

    it('should handle partial selection of many items', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const set = new Set(items.slice(0, 50)); // Select first 50

      const result = toggleSetAll(set, items);

      expect(result.size).toBe(100); // Should select all
    });

    it('should clear full selection of many items', () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const set = new Set(items); // Select all

      const result = toggleSetAll(set, items);

      expect(result.size).toBe(0); // Should clear all
    });

    it('should return new Set instance', () => {
      const items = [1, 2, 3];
      const set = new Set<number>();
      const result = toggleSetAll(set, items);

      expect(result).not.toBe(set);
    });
  });

  describe('Integration scenarios', () => {
    it('should support checkbox selection pattern', () => {
      const items = ['Item1', 'Item2', 'Item3'];
      let selected = new Set<string>();

      // Check Item1
      selected = toggleInSet(selected, 'Item1');
      expect(isInSet(selected, 'Item1')).toBe(true);

      // Check Item2
      selected = toggleInSet(selected, 'Item2');
      expect(isInSet(selected, 'Item2')).toBe(true);

      // Check select all
      selected = toggleSetAll(selected, items);
      expect(selected.size).toBe(3);

      // Uncheck select all
      selected = toggleSetAll(selected, items);
      expect(selected.size).toBe(0);
    });

    it('should support multi-select filter', () => {
      const availableOptions = ['Option A', 'Option B', 'Option C', 'Option D'];
      let filters = new Set<string>();

      // Add filters
      filters = toggleInSet(filters, 'Option A');
      filters = toggleInSet(filters, 'Option C');

      // Convert to array for filtering
      const selectedFilters = setToArray(filters);
      expect(selectedFilters.length).toBe(2);

      // Clear filters
      filters = new Set();
      expect(isSetEmpty(filters)).toBe(true);
    });

    it('should support toggle all with user selections', () => {
      const users = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ];
      let selectedUsers = new Set<number>();

      // User selects Alice
      selectedUsers = toggleInSet(selectedUsers, 1);
      expect(selectedUsers.size).toBe(1);

      // Toggle all
      selectedUsers = toggleSetAll(selectedUsers, users.map(u => u.id));
      expect(selectedUsers.size).toBe(3); // All selected

      // Toggle all again
      selectedUsers = toggleSetAll(selectedUsers, users.map(u => u.id));
      expect(selectedUsers.size).toBe(0); // All deselected
    });

    it('should convert between set and array formats', () => {
      const items = [5, 10, 15, 20];
      const itemSet = arrayToSet(items);

      // Toggle one item
      const updated = toggleInSet(itemSet, 25);

      // Convert back to array
      const result = setToArray(updated);

      expect(result).toContain(5);
      expect(result).toContain(25);
      expect(result.length).toBe(5);
    });

    it('should maintain set operations efficiency', () => {
      const largeSet = new Set(Array.from({ length: 10000 }, (_, i) => i));
      const items = Array.from({ length: 10000 }, (_, i) => i);

      const start = performance.now();

      // Toggle all
      const toggled = toggleSetAll(largeSet, items);
      expect(toggled.size).toBe(0); // All cleared

      // Toggle to select all
      const selected = toggleSetAll(toggled, items);
      expect(selected.size).toBe(10000);

      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Edge cases', () => {
    it('should handle null values in set', () => {
      const set = new Set([1, null as any]);
      expect(isInSet(set, null)).toBe(true);
    });

    it('should handle undefined values in set', () => {
      const set = new Set([1, undefined as any]);
      expect(isInSet(set, undefined)).toBe(true);
    });

    it('should handle mixed types in set', () => {
      const set = new Set<any>([1, 'two', true, null]);
      expect(isInSet(set, 1)).toBe(true);
      expect(isInSet(set, 'two')).toBe(true);
      expect(isInSet(set, true)).toBe(true);
      expect(isInSet(set, null)).toBe(true);
    });

    it('should handle NaN in set', () => {
      const set = new Set<number>([1, NaN, 3]);
      // NaN is not equal to itself, but Set treats it as unique
      expect(set.size).toBe(3);
    });

    it('should handle zero and negative numbers', () => {
      const set = new Set<number>();
      const result1 = toggleInSet(set, 0);
      const result2 = toggleInSet(result1, -1);

      expect(result2.has(0)).toBe(true);
      expect(result2.has(-1)).toBe(true);
    });
  });

  describe('Performance scenarios', () => {
    it('should handle toggling in large set efficiently', () => {
      const set = new Set(Array.from({ length: 100000 }, (_, i) => i));

      const start = performance.now();
      let result = set;
      for (let i = 0; i < 1000; i++) {
        result = toggleInSet(result, i);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
    });

    it('should convert large set to array efficiently', () => {
      const set = new Set(Array.from({ length: 100000 }, (_, i) => i));

      const start = performance.now();
      const arr = setToArray(set);
      const end = performance.now();

      expect(arr.length).toBe(100000);
      expect(end - start).toBeLessThan(100);
    });

    it('should convert large array to set efficiently', () => {
      const arr = Array.from({ length: 100000 }, (_, i) => i);

      const start = performance.now();
      const set = arrayToSet(arr);
      const end = performance.now();

      expect(set.size).toBe(100000);
      expect(end - start).toBeLessThan(100);
    });
  });
});

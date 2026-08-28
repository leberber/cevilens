import { sortItems, toggleSort } from './sort.util';

describe('Sort Utilities', () => {
  describe('sortItems - String sorting', () => {
    it('should sort strings in ascending order', () => {
      const items = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ];
      const result = sortItems(items, 'name', 1);

      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
      expect(result[2].name).toBe('Charlie');
    });

    it('should sort strings in descending order', () => {
      const items = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ];
      const result = sortItems(items, 'name', -1);

      expect(result[0].name).toBe('Charlie');
      expect(result[1].name).toBe('Bob');
      expect(result[2].name).toBe('Alice');
    });

    it('should handle empty strings', () => {
      const items = [
        { value: 'test' },
        { value: '' },
        { value: 'abc' },
      ];
      const result = sortItems(items, 'value', 1);

      expect(result[0].value).toBe('');
      expect(result[1].value).toBe('abc');
      expect(result[2].value).toBe('test');
    });

    it('should be case-sensitive', () => {
      const items = [
        { name: 'alice' },
        { name: 'Bob' },
        { name: 'CHARLIE' },
      ];
      const result = sortItems(items, 'name', 1);

      // Uppercase letters come before lowercase in ASCII
      expect(result[0].name).toBe('Bob');
    });
  });

  describe('sortItems - Number sorting', () => {
    it('should sort numbers in ascending order', () => {
      const items = [
        { value: 30 },
        { value: 10 },
        { value: 20 },
      ];
      const result = sortItems(items, 'value', 1);

      expect(result[0].value).toBe(10);
      expect(result[1].value).toBe(20);
      expect(result[2].value).toBe(30);
    });

    it('should sort numbers in descending order', () => {
      const items = [
        { value: 30 },
        { value: 10 },
        { value: 20 },
      ];
      const result = sortItems(items, 'value', -1);

      expect(result[0].value).toBe(30);
      expect(result[1].value).toBe(20);
      expect(result[2].value).toBe(10);
    });

    it('should handle negative numbers', () => {
      const items = [
        { value: 10 },
        { value: -5 },
        { value: 0 },
      ];
      const result = sortItems(items, 'value', 1);

      expect(result[0].value).toBe(-5);
      expect(result[1].value).toBe(0);
      expect(result[2].value).toBe(10);
    });

    it('should handle decimal numbers', () => {
      const items = [
        { value: 1.5 },
        { value: 1.1 },
        { value: 1.3 },
      ];
      const result = sortItems(items, 'value', 1);

      expect(result[0].value).toBe(1.1);
      expect(result[1].value).toBe(1.3);
      expect(result[2].value).toBe(1.5);
    });

    it('should handle Infinity', () => {
      const items = [
        { value: Infinity },
        { value: 100 },
        { value: -Infinity },
      ];
      const result = sortItems(items, 'value', 1);

      expect(result[0].value).toBe(-Infinity);
      expect(result[2].value).toBe(Infinity);
    });
  });

  describe('sortItems - Null/Undefined handling', () => {
    it('should handle null values', () => {
      const items: any[] = [
        { value: 'test' },
        { value: null },
        { value: 'abc' },
      ];
      const result = sortItems(items, 'value', 1);

      expect(result[0].value).toBe(null);
    });

    it('should handle undefined values', () => {
      const items: any[] = [
        { value: 'test' },
        { value: undefined },
        { value: 'abc' },
      ];
      const result = sortItems(items, 'value', 1);

      expect(result[0].value).toBe(undefined);
    });

    it('should handle missing fields', () => {
      const items: any[] = [
        { value: 'test' },
        { name: 'no value' },
        { value: 'abc' },
      ];
      const result = sortItems(items, 'value', 1);

      expect(result[0].value).toBeUndefined();
    });

    it('should handle mixed null and undefined', () => {
      const items: any[] = [
        { value: 'test' },
        { value: null },
        { value: undefined },
        { value: 'abc' },
      ];
      const result = sortItems(items, 'value', 1);

      expect(result.length).toBe(4);
      expect(result[0].value).toBeUndefined();
    });
  });

  describe('sortItems - Edge cases', () => {
    it('should not modify original array', () => {
      const items = [
        { value: 'c' },
        { value: 'a' },
        { value: 'b' },
      ];
      const originalOrder = [items[0], items[1], items[2]];
      const result = sortItems(items, 'value', 1);

      // Check original is unchanged
      expect(items[0]).toBe(originalOrder[0]);
      expect(items[1]).toBe(originalOrder[1]);
      expect(items[2]).toBe(originalOrder[2]);

      // Check result is sorted
      expect(result[0].value).toBe('a');
    });

    it('should handle single item', () => {
      const items = [{ value: 'test' }];
      const result = sortItems(items, 'value', 1);

      expect(result.length).toBe(1);
      expect(result[0].value).toBe('test');
    });

    it('should handle empty array', () => {
      const items: any[] = [];
      const result = sortItems(items, 'value', 1);

      expect(result).toEqual([]);
    });

    it('should handle identical values', () => {
      const items = [
        { id: 1, value: 'same' },
        { id: 2, value: 'same' },
        { id: 3, value: 'same' },
      ];
      const result = sortItems(items, 'value', 1);

      expect(result.length).toBe(3);
      expect(result.every(r => r.value === 'same')).toBe(true);
    });

    it('should be stable sort (maintains relative order of equal elements)', () => {
      const items = [
        { id: 1, value: 'a' },
        { id: 2, value: 'b' },
        { id: 3, value: 'a' },
      ];
      const result = sortItems(items, 'value', 1);

      const aItems = result.filter(r => r.value === 'a');
      expect(aItems[0].id).toBe(1);
      expect(aItems[1].id).toBe(3);
    });

    it('should handle special characters', () => {
      const items = [
        { value: '@test' },
        { value: '#abc' },
        { value: '!def' },
      ];
      const result = sortItems(items, 'value', 1);

      expect(result.length).toBe(3);
      expect(result[0].value).toBe('!def');
    });

    it('should handle unicode characters', () => {
      const items = [
        { name: 'Zoë' },
        { name: 'Anna' },
        { name: 'Élise' },
      ];
      const result = sortItems(items, 'name', 1);

      expect(result.length).toBe(3);
    });

    it('should handle boolean values', () => {
      const items: any[] = [
        { value: true },
        { value: false },
        { value: true },
      ];
      const result = sortItems(items, 'value', 1);

      expect(result[0].value).toBe(false);
    });
  });

  describe('sortItems - Large datasets', () => {
    it('should handle large arrays efficiently', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        value: Math.random(),
      }));

      const start = performance.now();
      const result = sortItems(items, 'value', 1);
      const end = performance.now();

      expect(result.length).toBe(10000);
      expect(end - start).toBeLessThan(200);
    });

    it('should maintain data integrity in large sort', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item${i}`,
      }));

      const result = sortItems(items, 'name', 1);

      expect(result.length).toBe(1000);
      expect(result.every(r => r.id !== undefined)).toBe(true);
    });
  });

  describe('toggleSort - Basic functionality', () => {
    it('should toggle sort direction when column same', () => {
      const result = toggleSort('name', 1, 'name');

      expect(result.col).toBe('name');
      expect(result.dir).toBe(-1);
    });

    it('should change to ascending when switching columns', () => {
      const result = toggleSort('name', -1, 'age');

      expect(result.col).toBe('age');
      expect(result.dir).toBe(1);
    });

    it('should toggle from ascending to descending', () => {
      const result = toggleSort('name', 1, 'name');

      expect(result.dir).toBe(-1);
    });

    it('should toggle from descending to ascending', () => {
      const result = toggleSort('name', -1, 'name');

      expect(result.dir).toBe(1);
    });

    it('should maintain column name', () => {
      const result = toggleSort('age', 1, 'age');

      expect(result.col).toBe('age');
    });

    it('should change column and reset to ascending', () => {
      const result = toggleSort('name', 1, 'email');

      expect(result.col).toBe('email');
      expect(result.dir).toBe(1);
    });

    it('should change column from descending and reset to ascending', () => {
      const result = toggleSort('name', -1, 'email');

      expect(result.col).toBe('email');
      expect(result.dir).toBe(1);
    });
  });

  describe('toggleSort - Edge cases', () => {
    it('should handle same column string', () => {
      const result = toggleSort('name', 1, 'name');

      expect(result.col).toBe('name');
      expect(result.dir).toBe(-1);
    });

    it('should handle empty column names', () => {
      const result = toggleSort('', 1, 'name');

      expect(result.col).toBe('name');
      expect(result.dir).toBe(1);
    });

    it('should handle column name with special characters', () => {
      const result = toggleSort('user-name', 1, 'user-name');

      expect(result.col).toBe('user-name');
      expect(result.dir).toBe(-1);
    });

    it('should handle numeric column names', () => {
      const result = toggleSort('0', 1, '1');

      expect(result.col).toBe('1');
      expect(result.dir).toBe(1);
    });
  });

  describe('Integration scenarios', () => {
    it('should support column header click pattern', () => {
      const items = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 35 },
      ];

      // Initial sort by name ascending
      let sortCol = 'name';
      let sortDir: 1 | -1 = 1;
      let sorted = sortItems(items, sortCol as any, sortDir);

      expect(sorted[0].name).toBe('Alice');

      // Click same column - toggle descending
      const toggle1 = toggleSort(sortCol, sortDir, 'name');
      sortCol = toggle1.col;
      sortDir = toggle1.dir;
      sorted = sortItems(items, sortCol as any, sortDir);

      expect(sorted[0].name).toBe('Charlie');

      // Click different column - sort by age ascending
      const toggle2 = toggleSort(sortCol, sortDir, 'age');
      sortCol = toggle2.col;
      sortDir = toggle2.dir;
      sorted = sortItems(items, sortCol as any, sortDir);

      expect(sorted[0].age).toBe(25);
    });

    it('should handle multi-column sorting chain', () => {
      const items = [
        { type: 'B', name: 'Charlie' },
        { type: 'A', name: 'Zoe' },
        { type: 'A', name: 'Alice' },
      ];

      // First sort by type
      let sorted = sortItems(items, 'type', 1);
      expect(sorted[0].type).toBe('A');

      // Then sort by name
      sorted = sortItems(sorted, 'name', 1);
      expect(sorted[0].name).toBe('Alice');
    });

    it('should support table sort state management', () => {
      let state: { col: string; dir: 1 | -1 } = { col: 'name', dir: 1 };
      const items = [
        { name: 'Charlie', age: 30 },
        { name: 'Alice', age: 25 },
      ];

      // Click name header
      let toggle = toggleSort(state.col, state.dir, 'name');
      state = { col: toggle.col, dir: toggle.dir };
      expect(state.dir).toBe(-1);

      // Click age header
      toggle = toggleSort(state.col, state.dir, 'age');
      state = { col: toggle.col, dir: toggle.dir };
      expect(state.col).toBe('age');
      expect(state.dir).toBe(1);

      // Apply sort
      const sorted = sortItems(items, state.col as any, state.dir);
      expect(sorted.length).toBe(2);
    });
  });

  describe('Performance scenarios', () => {
    it('should perform rapid sorts efficiently', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        value: Math.random(),
      }));

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        sortItems(items, 'value', i % 2 === 0 ? 1 : -1);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(500);
    });

    it('should handle rapid toggleSort calls', () => {
      const start = performance.now();
      let state: { col: string; dir: 1 | -1 } = { col: 'name', dir: 1 };

      for (let i = 0; i < 10000; i++) {
        const columns = ['name', 'age', 'email'];
        const col = columns[i % columns.length];
        const toggle = toggleSort(state.col, state.dir, col);
        state = { col: toggle.col, dir: toggle.dir };
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });
});

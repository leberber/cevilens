import {
  groupBy,
  calculatePercentage,
  sumNumbers,
  formatNumberLocale,
  safeGet,
} from './data-transform.util';

describe('Data Transform Utilities', () => {
  describe('groupBy - Basic functionality', () => {
    it('should group items by key function', () => {
      const items = [
        { id: 1, category: 'A' },
        { id: 2, category: 'B' },
        { id: 3, category: 'A' },
      ];
      const grouped = groupBy(items, (item) => item.category);

      expect(grouped.get('A')?.length).toBe(2);
      expect(grouped.get('B')?.length).toBe(1);
    });

    it('should return Map instance', () => {
      const items = [{ id: 1, type: 'X' }];
      const grouped = groupBy(items, (item) => item.type);

      expect(grouped instanceof Map).toBe(true);
    });

    it('should group by string values', () => {
      const items = ['apple', 'avocado', 'banana', 'blueberry'];
      const grouped = groupBy(items, (item) => item[0]); // Group by first letter

      expect(grouped.get('a')).toEqual(['apple', 'avocado']);
      expect(grouped.get('b')).toEqual(['banana', 'blueberry']);
    });

    it('should handle grouping with fallback values', () => {
      const items = [
        { name: 'John', family: 'Smith' },
        { name: 'Jane' }, // Missing family
        { name: 'Bob', family: 'Smith' },
      ];
      const grouped = groupBy(items, (item: any) => item.family || 'other');

      expect(grouped.get('Smith')?.length).toBe(2);
      expect(grouped.get('other')?.length).toBe(1);
    });

    it('should handle numeric grouping keys', () => {
      const items = [
        { value: 100 },
        { value: 105 },
        { value: 200 },
      ];
      const grouped = groupBy(items, (item) => String(Math.floor(item.value / 100)));

      expect(grouped.get('1')?.length).toBe(2);
      expect(grouped.get('2')?.length).toBe(1);
    });

    it('should maintain item order within groups', () => {
      const items = [
        { id: 1, category: 'A' },
        { id: 2, category: 'B' },
        { id: 3, category: 'A' },
      ];
      const grouped = groupBy(items, (item) => item.category);

      expect(grouped.get('A')?.[0].id).toBe(1);
      expect(grouped.get('A')?.[1].id).toBe(3);
    });
  });

  describe('groupBy - Edge cases', () => {
    it('should handle empty array', () => {
      const grouped = groupBy([], (item) => 'key');

      expect(grouped.size).toBe(0);
    });

    it('should handle single item', () => {
      const items = [{ id: 1, type: 'A' }];
      const grouped = groupBy(items, (item) => item.type);

      expect(grouped.size).toBe(1);
      expect(grouped.get('A')?.length).toBe(1);
    });

    it('should handle all items with same key', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const grouped = groupBy(items, () => 'same');

      expect(grouped.size).toBe(1);
      expect(grouped.get('same')?.length).toBe(3);
    });

    it('should handle all items with different keys', () => {
      const items = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
      ];
      const grouped = groupBy(items, (item) => String(item.id));

      expect(grouped.size).toBe(3);
    });

    it('should handle null/undefined in key function', () => {
      const items = [
        { name: 'John', dept: 'Sales' },
        { name: 'Jane', dept: null },
      ];
      const grouped = groupBy(items, (item: any) => item.dept || 'unassigned');

      expect(grouped.get('unassigned')?.length).toBe(1);
    });

    it('should handle special characters in keys', () => {
      const items = [
        { value: 'test@example.com' },
        { value: 'user+tag@example.com' },
      ];
      const grouped = groupBy(items, (item) => item.value.split('@')[1]);

      expect(grouped.get('example.com')?.length).toBe(2);
    });
  });

  describe('calculatePercentage - Basic functionality', () => {
    it('should calculate percentage', () => {
      const result = calculatePercentage(75, 100);
      expect(result).toBe(75);
    });

    it('should handle exact match', () => {
      const result = calculatePercentage(100, 100);
      expect(result).toBe(100);
    });

    it('should exceed 100 without clamping', () => {
      const result = calculatePercentage(150, 100, false);
      expect(result).toBe(150);
    });

    it('should clamp to 100 by default', () => {
      const result = calculatePercentage(150, 100);
      expect(result).toBe(100);
    });

    it('should handle zero value', () => {
      const result = calculatePercentage(0, 100);
      expect(result).toBe(0);
    });

    it('should round to integer', () => {
      const result = calculatePercentage(33.33, 100);
      expect(result).toBe(33);
    });

    it('should round up correctly', () => {
      const result = calculatePercentage(66.66, 100);
      expect(result).toBe(67);
    });
  });

  describe('calculatePercentage - Null/Undefined handling', () => {
    it('should return 0 when target is 0', () => {
      const result = calculatePercentage(50, 0);
      expect(result).toBe(0);
    });

    it('should clamp option respected', () => {
      const clamped = calculatePercentage(200, 100, true);
      const unclamped = calculatePercentage(200, 100, false);

      expect(clamped).toBe(100);
      expect(unclamped).toBe(200);
    });
  });

  describe('sumNumbers - Basic functionality', () => {
    it('should sum array of numbers', () => {
      const result = sumNumbers([10, 20, 30]);
      expect(result).toBe(60);
    });

    it('should return null for empty array', () => {
      const result = sumNumbers([]);
      expect(result).toBeNull();
    });

    it('should sum with null values filtered out', () => {
      const result = sumNumbers([10, null, 20, null, 30]);
      expect(result).toBe(60);
    });

    it('should handle negative numbers', () => {
      const result = sumNumbers([10, -5, 20]);
      expect(result).toBe(25);
    });

    it('should handle zero values', () => {
      const result = sumNumbers([0, 10, 0, 20]);
      expect(result).toBe(30);
    });

    it('should handle decimal numbers', () => {
      const result = sumNumbers([10.5, 20.5, 30.5]);
      expect(result).toBe(61.5);
    });

    it('should handle single number', () => {
      const result = sumNumbers([42]);
      expect(result).toBe(42);
    });
  });

  describe('sumNumbers - Null/Undefined handling', () => {
    it('should return null when all values are null', () => {
      const result = sumNumbers([null, null]);
      expect(result).toBeNull();
    });

    it('should filter out undefined values', () => {
      const result = sumNumbers([10, undefined as any, 20]);
      expect(result).toBe(30);
    });

    it('should handle mixed null and undefined', () => {
      const result = sumNumbers([10, null, undefined as any, 20]);
      expect(result).toBe(30);
    });

    it('should handle array with only nulls', () => {
      const result = sumNumbers([null, null, null]);
      expect(result).toBeNull();
    });
  });

  describe('sumNumbers - Edge cases', () => {
    it('should handle large numbers', () => {
      const result = sumNumbers([1000000, 2000000, 3000000]);
      expect(result).toBe(6000000);
    });

    it('should handle very small decimals', () => {
      const result = sumNumbers([0.1, 0.2, 0.3]);
      const diff = Math.abs((result || 0) - 0.6);
      expect(diff < 0.0001).toBe(true);
    });

    it('should handle infinity', () => {
      const result = sumNumbers([10, Infinity, 20]);
      expect(result).toBe(Infinity);
    });

    it('should handle NaN', () => {
      const result = sumNumbers([10, NaN, 20]);
      // NaN + 10 + 20 = NaN
      expect(Number.isNaN(result)).toBe(true);
    });
  });

  describe('formatNumberLocale - Basic functionality', () => {
    it('should format number with French locale by default', () => {
      const result = formatNumberLocale(1234.56);
      expect(result).toContain('1');
      expect(result).toContain('234');
    });

    it('should format with thousand separators', () => {
      const result = formatNumberLocale(1234567, 0, 'fr-FR');
      expect(result).toContain('1');
    });

    it('should format with decimal places', () => {
      const result = formatNumberLocale(1234.5678, 2, 'fr-FR');
      expect(result).toContain('1234');
    });

    it('should handle zero decimals', () => {
      const result = formatNumberLocale(1234.56, 0, 'fr-FR');
      expect(result).toContain('1234');
    });

    it('should format in US locale', () => {
      const result = formatNumberLocale(1234.56, 2, 'en-US');
      expect(result).toContain('1,234');
    });

    it('should format in German locale', () => {
      const result = formatNumberLocale(1234.56, 2, 'de-DE');
      expect(result).toContain('1.234'); // German uses . for thousands
    });

    it('should handle zero', () => {
      const result = formatNumberLocale(0, 2, 'fr-FR');
      expect(result).toContain('0');
    });

    it('should handle negative numbers', () => {
      const result = formatNumberLocale(-1234.56, 2, 'fr-FR');
      expect(result).toContain('-');
    });
  });

  describe('formatNumberLocale - Edge cases', () => {
    it('should handle very large numbers', () => {
      const result = formatNumberLocale(1000000000.99, 2, 'en-US');
      expect(result.length).toBeGreaterThan(5);
    });

    it('should handle very small decimals', () => {
      const result = formatNumberLocale(0.001, 3, 'en-US');
      expect(result).toContain('0');
    });

    it('should handle infinity', () => {
      const result = formatNumberLocale(Infinity, 0, 'en-US');
      expect(result).toBeTruthy();
    });

    it('should handle negative zero', () => {
      const result = formatNumberLocale(-0, 2, 'en-US');
      expect(result).toContain('0');
    });
  });

  describe('safeGet - Basic functionality', () => {
    it('should get nested property', () => {
      const obj = { user: { address: { city: 'Paris' } } };
      const result = safeGet(obj, 'user.address.city', 'Unknown');

      expect(result).toBe('Paris');
    });

    it('should return default value when path not found', () => {
      const obj = { user: { name: 'John' } };
      const result = safeGet(obj, 'user.address.city', 'Unknown');

      expect(result).toBe('Unknown');
    });

    it('should get first level property', () => {
      const obj = { name: 'John' };
      const result = safeGet(obj, 'name', 'Unknown');

      expect(result).toBe('John');
    });

    it('should handle undefined intermediate value', () => {
      const obj = { user: undefined };
      const result = safeGet(obj, 'user.address', 'N/A');

      expect(result).toBe('N/A');
    });

    it('should handle null intermediate value', () => {
      const obj = { user: null };
      const result = safeGet(obj, 'user.address', 'N/A');

      expect(result).toBe('N/A');
    });

    it('should return default for non-existent property', () => {
      const obj = {};
      const result = safeGet(obj, 'missing', 'default');

      expect(result).toBe('default');
    });
  });

  describe('safeGet - Type handling', () => {
    it('should get numeric values', () => {
      const obj = { user: { age: 30 } };
      const result = safeGet(obj, 'user.age', 0);

      expect(result).toBe(30);
    });

    it('should get boolean values', () => {
      const obj = { user: { active: true } };
      const result = safeGet(obj, 'user.active', false);

      expect(result).toBe(true);
    });

    it('should get array values', () => {
      const obj = { user: { tags: ['admin', 'user'] } };
      const result = safeGet(obj, 'user.tags', []) as any;

      expect(result).toEqual(['admin', 'user']);
    });

    it('should get object values', () => {
      const obj = { user: { profile: { bio: 'Hello' } } };
      const result = safeGet(obj, 'user.profile', {}) as any;

      expect(result.bio).toBe('Hello');
    });

    it('should handle falsy values (0, empty string, false)', () => {
      const obj = { count: 0, name: '', active: false };

      expect(safeGet(obj, 'count', 1)).toBe(0);
      expect(safeGet(obj, 'name', 'Unknown')).toBe('');
      expect(safeGet(obj, 'active', true)).toBe(false);
    });
  });

  describe('safeGet - Edge cases', () => {
    it('should handle deeply nested paths', () => {
      const obj = {
        a: { b: { c: { d: { e: { f: 'value' } } } } },
      };
      const result = safeGet(obj, 'a.b.c.d.e.f', 'default');

      expect(result).toBe('value');
    });

    it('should handle very long paths', () => {
      const obj: any = { level1: {} };
      let current = obj.level1;
      for (let i = 2; i <= 10; i++) {
        current[`level${i}`] = {};
        current = current[`level${i}`];
      }
      current.value = 'found';

      const path = Array.from({ length: 10 }, (_, i) => `level${i + 1}`).join('.');
      const result = safeGet(obj, path, 'default');

      expect(result).toBe('found');
    });

    it('should handle numeric path segments', () => {
      const obj = { items: [{ name: 'first' }] };
      const result = safeGet(obj, 'items.0.name', 'N/A');

      expect(result).toBe('first');
    });

    it('should handle special characters in path', () => {
      const obj: any = { 'user-name': { 'first-name': 'John' } };
      const result = safeGet(obj, 'user-name.first-name', 'N/A');

      expect(result).toBe('John');
    });

    it('should handle null/undefined at any level', () => {
      const obj = { user: null };
      const result = safeGet(obj, 'user.address.city', 'N/A');

      expect(result).toBe('N/A');
    });
  });

  describe('Performance scenarios', () => {
    it('should group large dataset efficiently', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        category: `cat${i % 100}`,
      }));

      const start = performance.now();
      const grouped = groupBy(items, (item) => item.category);
      const end = performance.now();

      expect(grouped.size).toBe(100);
      expect(end - start).toBeLessThan(100);
    });

    it('should sum large number array efficiently', () => {
      const numbers = Array.from({ length: 10000 }, (_, i) => i);

      const start = performance.now();
      const result = sumNumbers(numbers);
      const end = performance.now();

      expect(result).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(50);
    });

    it('should safeGet from deeply nested objects efficiently', () => {
      const obj: any = { level1: {} };
      let current = obj.level1;
      for (let i = 2; i <= 20; i++) {
        current[`level${i}`] = {};
        current = current[`level${i}`];
      }
      current.value = 'found';

      const path = Array.from({ length: 20 }, (_, i) => `level${i + 1}`).join('.');

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        safeGet(obj, path, 'default');
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Integration scenarios', () => {
    it('should group items and calculate statistics', () => {
      const sales = [
        { category: 'Electronics', amount: 1000 },
        { category: 'Clothing', amount: 500 },
        { category: 'Electronics', amount: 800 },
        { category: 'Clothing', amount: 600 },
      ];

      const grouped = groupBy(sales, (item) => item.category);

      // Calculate totals
      const elecTotal = sumNumbers(
        grouped.get('Electronics')?.map((s) => s.amount) || []
      );
      const clothTotal = sumNumbers(
        grouped.get('Clothing')?.map((s) => s.amount) || []
      );

      expect(elecTotal).toBe(1800);
      expect(clothTotal).toBe(1100);
    });

    it('should extract and format nested data', () => {
      const data = {
        company: {
          sales: {
            q1: 100000,
          },
        },
      };

      const value = safeGet(data, 'company.sales.q1', 0);
      const formatted = formatNumberLocale(value, 0, 'en-US');

      expect(formatted).toContain('100,000');
    });

    it('should calculate percentages with safe value access', () => {
      const items = [
        { target: 100, actual: 75 },
        { target: 200, actual: null },
      ];

      const results = items.map((item) => {
        const actual = item.actual ?? 0;
        return calculatePercentage(actual, item.target);
      });

      expect(results[0]).toBe(75);
      expect(results[1]).toBe(0);
    });
  });
});

// Helper for floating point comparison
Object.defineProperty(Number.prototype, 'isCloseTo', {
  value: function (target: number, tolerance: number) {
    return Math.abs((this as number) - target) <= tolerance;
  },
});

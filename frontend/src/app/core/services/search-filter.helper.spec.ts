import { TestBed } from '@angular/core/testing';
import { SearchFilterHelper } from './search-filter.helper';

interface TestItem {
  id: number;
  name: string;
  description: string;
  email?: string;
  status?: string;
}

describe('SearchFilterHelper', () => {
  let service: SearchFilterHelper;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SearchFilterHelper],
    });
    service = TestBed.inject(SearchFilterHelper);
  });

  describe('filterByField - Basic functionality', () => {
    const items: TestItem[] = [
      { id: 1, name: 'John Doe', description: 'Developer' },
      { id: 2, name: 'Jane Smith', description: 'Designer' },
      { id: 3, name: 'Bob Johnson', description: 'Manager' },
    ];

    it('should return all items when search term is empty', () => {
      const result = service.filterByField(items, '', 'name');
      expect(result).toEqual(items);
    });

    it('should filter items by exact match in single field', () => {
      const result = service.filterByField(items, 'John', 'name');
      expect(result.length).toBe(2);
      expect(result[0].name).toContain('John');
    });

    it('should filter items by partial match', () => {
      const result = service.filterByField(items, 'De', 'description');
      expect(result.length).toBe(2);
      expect(result.some(i => i.description === 'Developer')).toBe(true);
      expect(result.some(i => i.description === 'Designer')).toBe(true);
    });

    it('should be case-insensitive by default', () => {
      const result = service.filterByField(items, 'JOHN', 'name');
      expect(result.length).toBe(2);
    });

    it('should return empty array when no matches found', () => {
      const result = service.filterByField(items, 'XYZ', 'name');
      expect(result.length).toBe(0);
    });

    it('should handle case-sensitive search when enabled', () => {
      const result = service.filterByField(items, 'john', 'name', true);
      expect(result.length).toBe(0);
    });

    it('should handle case-sensitive search when enabled (matching case)', () => {
      const result = service.filterByField(items, 'John', 'name', true);
      expect(result.length).toBe(2);
    });

    it('should not modify original array', () => {
      const originalLength = items.length;
      service.filterByField(items, 'NonExistent', 'name');
      expect(items.length).toBe(originalLength);
    });
  });

  describe('filterByField - Edge cases', () => {
    it('should handle empty array', () => {
      const result = service.filterByField([], 'test', 'name');
      expect(result).toEqual([]);
    });

    it('should handle null values in fields', () => {
      const items: TestItem[] = [
        { id: 1, name: 'John', description: 'Dev' },
        { id: 2, name: null as any, description: 'Designer' },
      ];
      const result = service.filterByField(items, 'test', 'name');
      expect(result.length).toBe(0);
    });

    it('should handle undefined values in fields', () => {
      const items: any[] = [
        { id: 1, name: 'John' },
        { id: 2 }, // missing 'name' field
      ];
      const result = service.filterByField(items, 'John', 'name');
      expect(result.length).toBe(1);
    });

    it('should handle number fields', () => {
      const items: any[] = [
        { id: 1, count: 100 },
        { id: 2, count: 200 },
        { id: 3, count: 101 },
      ];
      const result = service.filterByField(items, '10', 'count');
      expect(result.length).toBe(2);
    });

    it('should handle special characters in search term', () => {
      const items: TestItem[] = [
        { id: 1, name: 'John.Doe', description: 'Dev' },
        { id: 2, name: 'Jane-Smith', description: 'Designer' },
      ];
      const result = service.filterByField(items, '.', 'name');
      expect(result.length).toBe(1);
    });

    it('should handle whitespace in search term', () => {
      const items: TestItem[] = [
        { id: 1, name: 'John Doe', description: 'Dev' },
        { id: 2, name: 'Jane Smith', description: 'Designer' },
      ];
      const result = service.filterByField(items, 'John ', 'name');
      expect(result.length).toBe(1);
    });

    it('should handle unicode characters', () => {
      const items: any[] = [
        { id: 1, name: 'José García' },
        { id: 2, name: 'François Dupont' },
        { id: 3, name: 'Müller Hans' },
      ];
      const result = service.filterByField(items, 'é', 'name');
      expect(result.length).toBe(1);
    });
  });

  describe('filterByFields - Basic functionality', () => {
    const items: TestItem[] = [
      { id: 1, name: 'John Doe', description: 'Developer', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', description: 'Designer', email: 'jane@example.com' },
      { id: 3, name: 'Bob Johnson', description: 'Manager', email: 'bob@example.com' },
    ];

    it('should filter across multiple fields', () => {
      const result = service.filterByFields(items, 'example', ['name', 'email']);
      expect(result.length).toBe(0);
    });

    it('should match if search term exists in any field', () => {
      const result = service.filterByFields(items, 'John', ['name', 'description']);
      expect(result.length).toBe(2);
    });

    it('should return all items when search term is empty', () => {
      const result = service.filterByFields(items, '', ['name', 'email']);
      expect(result).toEqual(items);
    });

    it('should search in email field', () => {
      const result = service.filterByFields(items, 'jane', ['name', 'email']);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Jane Smith');
    });

    it('should search in description field', () => {
      const result = service.filterByFields(items, 'Manager', ['name', 'description', 'email']);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Bob Johnson');
    });

    it('should be case-insensitive by default', () => {
      const result = service.filterByFields(items, 'DESIGNER', ['name', 'description']);
      expect(result.length).toBe(1);
    });

    it('should handle case-sensitive search when enabled', () => {
      const result = service.filterByFields(items, 'designer', ['name', 'description'], true);
      expect(result.length).toBe(0);
    });

    it('should handle case-sensitive search matching case', () => {
      const result = service.filterByFields(items, 'Designer', ['name', 'description'], true);
      expect(result.length).toBe(1);
    });
  });

  describe('filterByFields - Edge cases', () => {
    it('should handle empty array', () => {
      const result = service.filterByFields([], 'test', ['name']);
      expect(result).toEqual([]);
    });

    it('should handle empty fields array', () => {
      const items = [{ id: 1, name: 'John' }];
      const result = service.filterByFields(items, 'John', []);
      expect(result.length).toBe(0);
    });

    it('should handle null/undefined fields', () => {
      const items: any[] = [
        { id: 1, name: 'John', email: null },
        { id: 2, name: 'Jane', email: 'jane@test.com' },
      ];
      const result = service.filterByFields(items, 'test', ['name', 'email']);
      expect(result.length).toBe(1);
    });

    it('should search across many fields', () => {
      const items: any[] = [
        { id: 1, field1: 'Alpha', field2: 'Beta', field3: 'Gamma', field4: 'Delta' },
      ];
      const result = service.filterByFields(items, 'Gamma', ['field1', 'field2', 'field3', 'field4']);
      expect(result.length).toBe(1);
    });

    it('should not find match if field not in fields array', () => {
      const items: TestItem[] = [
        { id: 1, name: 'John Doe', description: 'Developer' },
      ];
      const result = service.filterByFields(items, 'john@', ['name', 'description']);
      expect(result.length).toBe(0);
    });
  });

  describe('filterByPredicate - Basic functionality', () => {
    const items: TestItem[] = [
      { id: 1, name: 'John Doe', description: 'Developer' },
      { id: 2, name: 'Jane Smith', description: 'Designer' },
      { id: 3, name: 'Bob Johnson', description: 'Manager' },
    ];

    it('should filter using custom predicate', () => {
      const result = service.filterByPredicate(
        items,
        'Developer',
        (item, term) => item.description.includes(term)
      );
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('should return all items when search term is empty', () => {
      const result = service.filterByPredicate(
        items,
        '',
        (item, term) => item.name.includes(term)
      );
      expect(result).toEqual(items);
    });

    it('should support complex predicate logic', () => {
      const result = service.filterByPredicate(
        items,
        'Smith',
        (item, term) => item.name.includes(term) && item.id === 2
      );
      expect(result.length).toBe(1);
    });

    it('should support case-insensitive predicate', () => {
      const result = service.filterByPredicate(
        items,
        'john',
        (item, term) => item.name.toLowerCase().includes(term.toLowerCase())
      );
      expect(result.length).toBe(2);
    });

    it('should support regex predicate', () => {
      const result = service.filterByPredicate(
        items,
        'J.*',
        (item, term) => new RegExp(term).test(item.name)
      );
      expect(result.length).toBe(2);
    });

    it('should support multi-field predicate', () => {
      const result = service.filterByPredicate(
        items,
        'Developer',
        (item, term) => item.name.includes(term) || item.description.includes(term)
      );
      expect(result.length).toBe(1);
    });
  });

  describe('filterByPredicate - Edge cases', () => {
    it('should handle empty array', () => {
      const result = service.filterByPredicate(
        [],
        'test',
        (item) => true
      );
      expect(result).toEqual([]);
    });

    it('should handle predicate that always returns false', () => {
      const items = [{ id: 1, name: 'John' }];
      const result = service.filterByPredicate(
        items,
        'test',
        () => false
      );
      expect(result.length).toBe(0);
    });

    it('should handle predicate that always returns true', () => {
      const items = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      const result = service.filterByPredicate(
        items,
        'test',
        () => true
      );
      expect(result.length).toBe(2);
    });

    it('should handle predicate with null item values', () => {
      const items: any[] = [
        { id: 1, name: 'John', optional: null },
        { id: 2, name: 'Jane', optional: 'value' },
      ];
      const result = service.filterByPredicate(
        items,
        'test',
        (item) => item.optional != null
      );
      expect(result.length).toBe(1);
    });

    it('should pass correct arguments to predicate', () => {
      const items = [{ id: 1, name: 'John' }];
      let capturedItem: any = null;
      let capturedTerm: any = null;

      service.filterByPredicate(
        items,
        'searchTerm',
        (item, term) => {
          capturedItem = item;
          capturedTerm = term;
          return true;
        }
      );

      expect(capturedItem).toEqual(items[0]);
      expect(capturedTerm).toBe('searchTerm');
    });
  });

  describe('Performance scenarios', () => {
    it('should handle large arrays efficiently', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `User${i}`,
        description: `Description ${i}`,
      }));

      const start = performance.now();
      const result = service.filterByField(items, 'User50', 'name');
      const end = performance.now();

      expect(result.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should handle multiple field searches on large arrays', () => {
      const items = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        name: `User${i}`,
        email: `user${i}@example.com`,
        description: `Description ${i}`,
      }));

      const start = performance.now();
      const result = service.filterByFields(
        items,
        'example',
        ['name', 'email', 'description']
      );
      const end = performance.now();

      expect(result.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100);
    });

    it('should handle predicate searches on large arrays', () => {
      const items = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        name: `User${i}`,
        status: i % 2 === 0 ? 'active' : 'inactive',
      }));

      const start = performance.now();
      const result = service.filterByPredicate(
        items,
        'active',
        (item, term) => item.status === term
      );
      const end = performance.now();

      expect(result.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Integration scenarios', () => {
    it('should combine multiple filters sequentially', () => {
      const items: TestItem[] = [
        { id: 1, name: 'John Doe', description: 'Developer', status: 'active' },
        { id: 2, name: 'Jane Smith', description: 'Designer', status: 'active' },
        { id: 3, name: 'Bob Johnson', description: 'Manager', status: 'inactive' },
      ];

      // First filter by name containing 'John'
      let result = service.filterByField(items, 'John', 'name');
      expect(result.length).toBe(2);

      // Then filter by status in remaining results
      result = service.filterByField(result, 'active', 'status');
      expect(result.length).toBe(1);
    });

    it('should support search across different field types', () => {
      const items: any[] = [
        { id: 1, name: 'John', count: 100, isActive: true },
        { id: 2, name: 'Jane', count: 200, isActive: false },
      ];

      const byName = service.filterByField(items, 'Jane', 'name');
      const byCount = service.filterByField(items, '100', 'count');
      const byBool = service.filterByField(items, 'true', 'isActive');

      expect(byName.length).toBe(1);
      expect(byCount.length).toBe(1);
      expect(byBool.length).toBe(1);
    });

    it('should support advanced search patterns', () => {
      const items: TestItem[] = [
        { id: 1, name: 'john.doe@company.com', description: 'john_admin' },
        { id: 2, name: 'jane.smith@company.com', description: 'jane_user' },
      ];

      // Email domain search
      const domainResult = service.filterByField(items, '@company.com', 'name');
      expect(domainResult.length).toBe(2);

      // Underscore pattern search
      const underscoreResult = service.filterByField(items, '_', 'description');
      expect(underscoreResult.length).toBe(2);
    });
  });
});

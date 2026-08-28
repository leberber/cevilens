import { calculatePercentage, calculatePercentageCapped } from './math.util';

describe('Math Utilities', () => {
  describe('calculatePercentage - Basic functionality', () => {
    it('should calculate percentage correctly', () => {
      const result = calculatePercentage(50, 100);
      expect(result).toBe(50);
    });

    it('should handle 0 value', () => {
      const result = calculatePercentage(0, 100);
      expect(result).toBe(0);
    });

    it('should handle exact objective', () => {
      const result = calculatePercentage(100, 100);
      expect(result).toBe(100);
    });

    it('should handle exceeding objective', () => {
      const result = calculatePercentage(150, 100);
      expect(result).toBe(150);
    });

    it('should round to nearest integer', () => {
      const result = calculatePercentage(33.33, 100);
      expect(result).toBe(33);
    });

    it('should round up correctly', () => {
      const result = calculatePercentage(66.66, 100);
      expect(result).toBe(67);
    });

    it('should handle decimal values', () => {
      const result = calculatePercentage(25.5, 100);
      expect(result).toBe(26); // Rounded
    });

    it('should handle small values', () => {
      const result = calculatePercentage(1, 1000);
      expect(result).toBe(0); // 0.1% rounds to 0
    });

    it('should handle large values', () => {
      const result = calculatePercentage(1000000, 100);
      expect(result).toBe(999); // Capped to default limit of 999
    });

    it('should handle fractional results', () => {
      const result = calculatePercentage(1, 3);
      expect(result).toBe(33); // 33.333...% rounds to 33
    });
  });

  describe('calculatePercentage - Null/Undefined objective', () => {
    it('should return 0 when objective is null', () => {
      const result = calculatePercentage(50, null);
      expect(result).toBe(0);
    });

    it('should return 0 when objective is undefined', () => {
      const result = calculatePercentage(50, undefined);
      expect(result).toBe(0);
    });

    it('should return 0 when objective is 0', () => {
      const result = calculatePercentage(50, 0);
      expect(result).toBe(0);
    });

    it('should handle null with 0 value', () => {
      const result = calculatePercentage(0, null);
      expect(result).toBe(0);
    });
  });

  describe('calculatePercentage - Custom limit', () => {
    it('should cap to custom limit', () => {
      const result = calculatePercentage(150, 100, 100);
      expect(result).toBe(100);
    });

    it('should cap to 999 by default', () => {
      const result = calculatePercentage(10000, 100);
      expect(result).toBe(999);
    });

    it('should allow exceeding default limit with custom limit', () => {
      const result = calculatePercentage(10000, 100, 15000);
      expect(result).toBe(10000);
    });

    it('should respect custom limit of 500', () => {
      const result = calculatePercentage(1000, 100, 500);
      expect(result).toBe(500);
    });

    it('should handle limit of 1', () => {
      const result = calculatePercentage(50, 100, 1);
      expect(result).toBe(1);
    });

    it('should handle limit of 0', () => {
      const result = calculatePercentage(50, 100, 0);
      expect(result).toBe(0);
    });

    it('should handle very large limit', () => {
      const result = calculatePercentage(1000000, 100, 999999);
      expect(result).toBe(999999);
    });
  });

  describe('calculatePercentageCapped - Basic functionality', () => {
    it('should calculate percentage and cap to 100 by default', () => {
      const result = calculatePercentageCapped(50, 100);
      expect(result).toBe(50);
    });

    it('should cap to 100 when exceeding objective', () => {
      const result = calculatePercentageCapped(150, 100);
      expect(result).toBe(100);
    });

    it('should cap exactly at 100 for objective match', () => {
      const result = calculatePercentageCapped(100, 100);
      expect(result).toBe(100);
    });

    it('should return 0 for 0 value', () => {
      const result = calculatePercentageCapped(0, 100);
      expect(result).toBe(0);
    });

    it('should round correctly before capping', () => {
      const result = calculatePercentageCapped(99.66, 100);
      expect(result).toBe(100); // 99.66% rounds to 100
    });

    it('should handle small percentages', () => {
      const result = calculatePercentageCapped(0.5, 100);
      expect(result).toBe(1); // 0.5% rounds to 1
    });

    it('should handle decimal objectives', () => {
      const result = calculatePercentageCapped(0.5, 1.0);
      expect(result).toBe(50);
    });
  });

  describe('calculatePercentageCapped - Null/Undefined handling', () => {
    it('should return 0 when objective is null', () => {
      const result = calculatePercentageCapped(50, null);
      expect(result).toBe(0);
    });

    it('should return 0 when objective is undefined', () => {
      const result = calculatePercentageCapped(50, undefined);
      expect(result).toBe(0);
    });

    it('should return 0 when objective is 0', () => {
      const result = calculatePercentageCapped(50, 0);
      expect(result).toBe(0);
    });
  });

  describe('calculatePercentageCapped - Custom limit', () => {
    it('should cap to custom limit', () => {
      const result = calculatePercentageCapped(150, 100, 80);
      expect(result).toBe(80);
    });

    it('should cap to 100 by default', () => {
      const result = calculatePercentageCapped(200, 100);
      expect(result).toBe(100);
    });

    it('should handle limit of 50', () => {
      const result = calculatePercentageCapped(75, 100, 50);
      expect(result).toBe(50);
    });

    it('should handle limit of 200', () => {
      const result = calculatePercentageCapped(150, 100, 200);
      expect(result).toBe(150);
    });

    it('should handle limit of 1', () => {
      const result = calculatePercentageCapped(50, 100, 1);
      expect(result).toBe(1);
    });

    it('should handle limit of 0', () => {
      const result = calculatePercentageCapped(50, 100, 0);
      expect(result).toBe(0);
    });
  });

  describe('Edge cases and precision', () => {
    it('should handle very small values', () => {
      const result = calculatePercentage(0.001, 1000);
      expect(result).toBe(0);
    });

    it('should handle very large values', () => {
      const result = calculatePercentage(1000000000, 100);
      expect(result).toBe(999); // Capped to default limit
    });

    it('should handle negative values gracefully', () => {
      const result = calculatePercentage(-50, 100);
      expect(result).toBe(-50);
    });

    it('should handle negative objective', () => {
      const result = calculatePercentage(50, -100);
      expect(result).toBe(-50);
    });

    it('should handle both negative', () => {
      const result = calculatePercentage(-50, -100);
      expect(result).toBe(50);
    });

    it('should handle rounding edge cases', () => {
      const result = calculatePercentage(1, 6);
      expect(result).toBe(17); // 16.666...% rounds to 17
    });

    it('should handle exact rounding boundary', () => {
      const result = calculatePercentage(1, 2);
      expect(result).toBe(50);
    });

    it('should handle 0.5 rounding', () => {
      const result = calculatePercentage(50.5, 100);
      expect(result).toBe(51); // Rounds to nearest (banker's rounding in JavaScript)
    });
  });

  describe('Comparison: calculatePercentage vs calculatePercentageCapped', () => {
    it('should differ when value exceeds 100%', () => {
      const unlimited = calculatePercentage(150, 100);
      const capped = calculatePercentageCapped(150, 100);

      expect(unlimited).toBe(150);
      expect(capped).toBe(100);
    });

    it('should be same when under 100%', () => {
      const unlimited = calculatePercentage(50, 100);
      const capped = calculatePercentageCapped(50, 100);

      expect(unlimited).toBe(capped);
    });

    it('should be same when at 100%', () => {
      const unlimited = calculatePercentage(100, 100);
      const capped = calculatePercentageCapped(100, 100);

      expect(unlimited).toBe(capped);
      expect(unlimited).toBe(100);
    });

    it('should both return 0 for null objective', () => {
      const unlimited = calculatePercentage(50, null);
      const capped = calculatePercentageCapped(50, null);

      expect(unlimited).toBe(0);
      expect(capped).toBe(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should calculate sales performance percentage', () => {
      const salesTarget = 100000;
      const actualSales = 75000;
      const performance = calculatePercentageCapped(actualSales, salesTarget, 100);

      expect(performance).toBe(75);
    });

    it('should calculate inventory levels', () => {
      const capacity = 1000;
      const current = 350;
      const level = calculatePercentageCapped(current, capacity);

      expect(level).toBe(35);
    });

    it('should calculate completion progress capped at 100', () => {
      const total = 10;
      const completed = 15; // Over-delivery
      const progress = calculatePercentageCapped(completed, total);

      expect(progress).toBe(100);
    });

    it('should handle progressive goal tracking', () => {
      const annual = 1200000;
      const monthly = annual / 12; // 100,000 per month

      const jan = calculatePercentageCapped(120000, monthly);
      const feb = calculatePercentageCapped(95000, monthly);
      const mar = calculatePercentageCapped(80000, monthly);

      expect(jan).toBe(100); // 120% capped
      expect(feb).toBe(95);  // 95%
      expect(mar).toBe(80);  // 80%
    });

    it('should handle product availability percentage', () => {
      const totalSKUs = 500;
      const availableSKUs = 475;
      const availability = calculatePercentageCapped(availableSKUs, totalSKUs);

      expect(availability).toBe(95);
    });

    it('should handle multiple threshold scenarios', () => {
      const target = 10000;
      const tests = [
        { actual: 0, expected: 0 },
        { actual: 2500, expected: 25 },
        { actual: 5000, expected: 50 },
        { actual: 10000, expected: 100 },
        { actual: 15000, expected: 100 }, // Capped
      ];

      tests.forEach(test => {
        const result = calculatePercentageCapped(test.actual, target);
        expect(result).toBe(test.expected);
      });
    });
  });

  describe('Performance scenarios', () => {
    it('should calculate percentage efficiently in loop', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        calculatePercentage(i, 100 + i);
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(50);
    });

    it('should calculate capped percentage efficiently in loop', () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        calculatePercentageCapped(i * 2, 100 + i);
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(50);
    });

    it('should handle batch calculations efficiently', () => {
      const values = Array.from({ length: 1000 }, (_, i) => ({
        actual: i * 100,
        target: 10000,
      }));

      const start = performance.now();
      values.forEach(v => calculatePercentageCapped(v.actual, v.target));
      const end = performance.now();

      expect(end - start).toBeLessThan(50);
    });
  });
});

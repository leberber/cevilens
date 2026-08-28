import { TestBed } from '@angular/core/testing';
import { DateHelper } from './date.helper';

describe('DateHelper', () => {
  let service: DateHelper;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DateHelper],
    });
    service = TestBed.inject(DateHelper);
  });

  describe('getLastDayOfMonth - Basic functionality', () => {
    it('should get last day of January', () => {
      const result = service.getLastDayOfMonth('2024-01');
      expect(result).toBe('2024-01-31');
    });

    it('should get last day of February in leap year', () => {
      const result = service.getLastDayOfMonth('2024-02');
      expect(result).toBe('2024-02-29');
    });

    it('should get last day of February in non-leap year', () => {
      const result = service.getLastDayOfMonth('2023-02');
      expect(result).toBe('2023-02-28');
    });

    it('should get last day of April (30 days)', () => {
      const result = service.getLastDayOfMonth('2024-04');
      expect(result).toBe('2024-04-30');
    });

    it('should get last day of December', () => {
      const result = service.getLastDayOfMonth('2024-12');
      expect(result).toBe('2024-12-31');
    });

    it('should pad day with leading zero', () => {
      const result = service.getLastDayOfMonth('2024-09');
      expect(result).toBe('2024-09-30');
    });

    it('should handle year 2000 (leap year)', () => {
      const result = service.getLastDayOfMonth('2000-02');
      expect(result).toBe('2000-02-29');
    });

    it('should handle year 2001 (non-leap year)', () => {
      const result = service.getLastDayOfMonth('2001-02');
      expect(result).toBe('2001-02-28');
    });
  });

  describe('getFirstDayOfMonth - Basic functionality', () => {
    it('should return first day of month', () => {
      const result = service.getFirstDayOfMonth('2024-01');
      expect(result).toBe('2024-01-01');
    });

    it('should return first day for any month', () => {
      const result = service.getFirstDayOfMonth('2024-06');
      expect(result).toBe('2024-06-01');
    });

    it('should always return day 01', () => {
      const months = ['2024-01', '2024-02', '2024-06', '2024-12'];
      months.forEach(month => {
        const result = service.getFirstDayOfMonth(month);
        expect(result.endsWith('-01')).toBe(true);
      });
    });
  });

  describe('isDateInPeriod - Basic functionality', () => {
    it('should return true if date is in period', () => {
      const date = new Date(2024, 0, 15); // Jan 15, 2024
      const result = service.isDateInPeriod(date, '2024-01');
      expect(result).toBe(true);
    });

    it('should return true for first day of period', () => {
      const date = new Date(2024, 0, 1);
      const result = service.isDateInPeriod(date, '2024-01');
      expect(result).toBe(true);
    });

    it('should return true for last day of period', () => {
      const date = new Date(2024, 0, 31);
      const result = service.isDateInPeriod(date, '2024-01');
      expect(result).toBe(true);
    });

    it('should return false if date is before period', () => {
      const date = new Date(2023, 11, 31); // Dec 31, 2023
      const result = service.isDateInPeriod(date, '2024-01');
      expect(result).toBe(false);
    });

    it('should return false if date is after period', () => {
      const date = new Date(2024, 1, 1); // Feb 1, 2024
      const result = service.isDateInPeriod(date, '2024-01');
      expect(result).toBe(false);
    });

    it('should handle different months correctly', () => {
      const dateJan = new Date(2024, 0, 15);
      const dateFeb = new Date(2024, 1, 15);

      expect(service.isDateInPeriod(dateJan, '2024-01')).toBe(true);
      expect(service.isDateInPeriod(dateJan, '2024-02')).toBe(false);
      expect(service.isDateInPeriod(dateFeb, '2024-02')).toBe(true);
    });
  });

  describe('getPeriodFromDate - Basic functionality', () => {
    it('should extract period from date (January)', () => {
      const date = new Date(2024, 0, 15);
      const result = service.getPeriodFromDate(date);
      expect(result).toBe('2024-01');
    });

    it('should extract period from date (December)', () => {
      const date = new Date(2024, 11, 25);
      const result = service.getPeriodFromDate(date);
      expect(result).toBe('2024-12');
    });

    it('should pad month with leading zero', () => {
      const date = new Date(2024, 8, 15); // September
      const result = service.getPeriodFromDate(date);
      expect(result).toBe('2024-09');
    });

    it('should work for all months', () => {
      for (let month = 0; month < 12; month++) {
        const date = new Date(2024, month, 15);
        const result = service.getPeriodFromDate(date);
        const expectedMonth = String(month + 1).padStart(2, '0');
        expect(result).toBe(`2024-${expectedMonth}`);
      }
    });

    it('should work for different years', () => {
      const date2023 = new Date(2023, 6, 15);
      const date2024 = new Date(2024, 6, 15);
      const date2025 = new Date(2025, 6, 15);

      expect(service.getPeriodFromDate(date2023)).toBe('2023-07');
      expect(service.getPeriodFromDate(date2024)).toBe('2024-07');
      expect(service.getPeriodFromDate(date2025)).toBe('2025-07');
    });
  });

  describe('parsePeriod - Basic functionality', () => {
    it('should parse period string to Date (first day of month)', () => {
      const result = service.parsePeriod('2024-01');
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(1);
    });

    it('should parse different months', () => {
      const period = service.parsePeriod('2024-06');
      expect(period.getMonth()).toBe(5); // June (0-indexed)
      expect(period.getDate()).toBe(1);
    });

    it('should parse December correctly', () => {
      const period = service.parsePeriod('2024-12');
      expect(period.getMonth()).toBe(11); // December
      expect(period.getDate()).toBe(1);
    });

    it('should parse different years', () => {
      const period2023 = service.parsePeriod('2023-06');
      const period2025 = service.parsePeriod('2025-06');

      expect(period2023.getFullYear()).toBe(2023);
      expect(period2025.getFullYear()).toBe(2025);
    });

    it('should return Date instance', () => {
      const result = service.parsePeriod('2024-01');
      expect(result instanceof Date).toBe(true);
    });
  });

  describe('addMonthsToPeriod - Basic functionality', () => {
    it('should add months to period', () => {
      const result = service.addMonthsToPeriod('2024-01', 1);
      expect(result).toBe('2024-02');
    });

    it('should add multiple months', () => {
      const result = service.addMonthsToPeriod('2024-01', 5);
      expect(result).toBe('2024-06');
    });

    it('should handle year transition', () => {
      const result = service.addMonthsToPeriod('2024-11', 3);
      expect(result).toBe('2025-02');
    });

    it('should subtract months with negative value', () => {
      const result = service.addMonthsToPeriod('2024-06', -3);
      expect(result).toBe('2024-03');
    });

    it('should handle multi-year transitions', () => {
      const result = service.addMonthsToPeriod('2024-06', 12);
      expect(result).toBe('2025-06');
    });

    it('should handle zero months', () => {
      const result = service.addMonthsToPeriod('2024-06', 0);
      expect(result).toBe('2024-06');
    });

    it('should handle large month additions', () => {
      const result = service.addMonthsToPeriod('2024-01', 24);
      expect(result).toBe('2026-01');
    });

    it('should handle large month subtractions', () => {
      const result = service.addMonthsToPeriod('2024-01', -13);
      expect(result).toBe('2022-12');
    });
  });

  describe('formatPeriod - Basic functionality', () => {
    it('should format period in French locale by default', () => {
      const result = service.formatPeriod('2024-01');
      expect(result).toContain('2024');
    });

    it('should format period with month abbreviation', () => {
      const result = service.formatPeriod('2024-01');
      // French: janv.
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format different months', () => {
      const results = [
        service.formatPeriod('2024-01'),
        service.formatPeriod('2024-06'),
        service.formatPeriod('2024-12'),
      ];
      results.forEach(r => {
        expect(r).toContain('2024');
      });
    });

    it('should format in English locale when specified', () => {
      const result = service.formatPeriod('2024-01', 'en-US');
      expect(result).toContain('2024');
    });

    it('should format in German locale when specified', () => {
      const result = service.formatPeriod('2024-01', 'de-DE');
      expect(result).toContain('2024');
    });
  });

  describe('formatPeriodRange - Basic functionality', () => {
    it('should format single period', () => {
      const result = service.formatPeriodRange('2024-01');
      expect(result).toContain('2024');
    });

    it('should format period range', () => {
      const result = service.formatPeriodRange('2024-01', '2024-03');
      expect(result).toContain('→');
      expect(result).toContain('2024');
    });

    it('should format same start and end as single period', () => {
      const result = service.formatPeriodRange('2024-01', '2024-01');
      expect(result).not.toContain('→');
    });

    it('should format range spanning multiple months', () => {
      const result = service.formatPeriodRange('2024-01', '2024-12');
      expect(result).toContain('→');
    });

    it('should format range spanning years', () => {
      const result = service.formatPeriodRange('2023-12', '2024-01');
      expect(result).toContain('→');
    });

    it('should use French locale by default', () => {
      const result = service.formatPeriodRange('2024-01', '2024-02');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format in English locale when specified', () => {
      const result = service.formatPeriodRange('2024-01', '2024-02', 'en-US');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should not show arrow when end equals start', () => {
      const result = service.formatPeriodRange('2024-06', '2024-06');
      expect(result).not.toContain('→');
    });

    it('should not show arrow when end period is not provided', () => {
      const result = service.formatPeriodRange('2024-06');
      expect(result).not.toContain('→');
    });
  });

  describe('Edge cases', () => {
    it('should handle February 29 in leap year', () => {
      const result = service.getLastDayOfMonth('2024-02');
      expect(result).toBe('2024-02-29');
    });

    it('should handle February 28 in non-leap year', () => {
      const result = service.getLastDayOfMonth('2025-02');
      expect(result).toBe('2025-02-28');
    });

    it('should handle year boundary transitions', () => {
      const result = service.addMonthsToPeriod('2024-12', 1);
      expect(result).toBe('2025-01');
    });

    it('should handle very old dates', () => {
      const result = service.getLastDayOfMonth('1900-01');
      expect(result).toBe('1900-01-31');
    });

    it('should handle far future dates', () => {
      const result = service.getLastDayOfMonth('2099-12');
      expect(result).toBe('2099-12-31');
    });

    it('should handle century leap years correctly', () => {
      // 2000 is divisible by 400, so it's a leap year
      const result2000 = service.getLastDayOfMonth('2000-02');
      expect(result2000).toBe('2000-02-29');

      // 1900 is divisible by 100 but not 400, so not a leap year
      const result1900 = service.getLastDayOfMonth('1900-02');
      expect(result1900).toBe('1900-02-28');
    });
  });

  describe('Round-trip conversions', () => {
    it('should convert date to period and back correctly', () => {
      const originalDate = new Date(2024, 5, 15); // June 15, 2024
      const period = service.getPeriodFromDate(originalDate);
      const parsedDate = service.parsePeriod(period);

      expect(parsedDate.getFullYear()).toBe(originalDate.getFullYear());
      expect(parsedDate.getMonth()).toBe(originalDate.getMonth());
    });

    it('should verify date in period after conversion', () => {
      const date = new Date(2024, 3, 20); // April 20
      const period = service.getPeriodFromDate(date);
      const isInPeriod = service.isDateInPeriod(date, period);

      expect(isInPeriod).toBe(true);
    });

    it('should handle month arithmetic round-trip', () => {
      const initial = '2024-06';
      const afterAdd = service.addMonthsToPeriod(initial, 6);
      const afterSubtract = service.addMonthsToPeriod(afterAdd, -6);

      expect(afterSubtract).toBe(initial);
    });
  });

  describe('Performance scenarios', () => {
    it('should handle multiple period additions efficiently', () => {
      let period = '2024-01';

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        period = service.addMonthsToPeriod(period, 1);
      }
      const end = performance.now();

      expect(period).toBe('2107-01');
      expect(end - start).toBeLessThan(100);
    });

    it('should format multiple periods efficiently', () => {
      const start = performance.now();
      for (let month = 1; month <= 12; month++) {
        const period = `2024-${String(month).padStart(2, '0')}`;
        service.formatPeriod(period);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(50);
    });

    it('should check date in period efficiently', () => {
      const date = new Date(2024, 5, 15);
      const start = performance.now();

      for (let month = 1; month <= 12; month++) {
        const period = `2024-${String(month).padStart(2, '0')}`;
        service.isDateInPeriod(date, period);
      }

      const end = performance.now();
      expect(end - start).toBeLessThan(50);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle date range queries', () => {
      const startDate = new Date(2024, 0, 15);
      const endDate = new Date(2024, 2, 20);

      const startPeriod = service.getPeriodFromDate(startDate);
      const endPeriod = service.getPeriodFromDate(endDate);

      expect(service.isDateInPeriod(startDate, startPeriod)).toBe(true);
      expect(service.isDateInPeriod(endDate, endPeriod)).toBe(true);
    });

    it('should handle monthly iteration', () => {
      let currentPeriod = '2024-01';
      const periods: string[] = [currentPeriod];

      for (let i = 0; i < 11; i++) {
        currentPeriod = service.addMonthsToPeriod(currentPeriod, 1);
        periods.push(currentPeriod);
      }

      expect(periods.length).toBe(12);
      expect(periods[0]).toBe('2024-01');
      expect(periods[11]).toBe('2024-12');
    });

    it('should format period ranges for display', () => {
      const formatted = service.formatPeriodRange('2024-01', '2024-06');
      expect(formatted).toBeTruthy();
      expect(formatted.length).toBeGreaterThan(5);
    });
  });
});

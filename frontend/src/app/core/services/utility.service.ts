import { Injectable } from '@angular/core';

/**
 * Common utility and formatting functions used across the application
 */
@Injectable({
  providedIn: 'root',
})
export class UtilityService {
  /**
   * Format phone number from unformatted to Algerian format (e.g., "0123456789" -> "0123 45 67 89")
   */
  formatPhone(phone: string): string {
    const digits = phone.replace(/\s/g, '');
    return digits.length === 10
      ? `${digits.slice(0, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`
      : phone;
  }

  /**
   * Strip whitespace from phone number
   */
  stripPhoneWhitespace(phone: string): string {
    return phone.replace(/\s/g, '');
  }

  /**
   * Check if phone number is valid (10 digits for Algeria)
   */
  isValidPhone(phone: string): boolean {
    const digits = this.stripPhoneWhitespace(phone);
    return digits.length === 10 && /^\d+$/.test(digits);
  }

  /**
   * Generate unique key from multiple values
   */
  generateKey(...parts: (string | number)[]): string {
    return parts.join('|');
  }

  /**
   * Parse composite key into parts
   */
  parseKey(key: string): string[] {
    return key.split('|');
  }

  /**
   * Debounce function calls
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        func(...args);
        timeout = null;
      }, delay);
    };
  }
}

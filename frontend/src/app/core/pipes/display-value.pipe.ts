import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a value for display, handling nulls and zeros consistently
 * Supports objective display format (value / objective)
 */
@Pipe({
  name: 'displayValue',
  standalone: true,
})
export class DisplayValuePipe implements PipeTransform {
  transform(value: number | null | undefined, objectiveValue?: number | null): string {
    // Handle null/undefined
    if (value == null) {
      return objectiveValue != null ? `— / ${this.formatNumber(objectiveValue)}` : '—';
    }

    // Handle zero
    if (value === 0) {
      return objectiveValue != null ? `0 / ${this.formatNumber(objectiveValue)}` : '0';
    }

    // Format with objective
    if (objectiveValue != null) {
      return `${this.formatNumber(value)} / ${this.formatNumber(objectiveValue)}`;
    }

    return this.formatNumber(value);
  }

  private formatNumber(n: number | null | undefined): string {
    if (n == null) return '—';
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
}

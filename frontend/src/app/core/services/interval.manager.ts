import { Injectable } from '@angular/core';

/**
 * Helper service for managing intervals and timeouts
 * Provides safe management with automatic cleanup
 */
@Injectable({
  providedIn: 'root',
})
export class IntervalManager {
  private intervals = new Map<string, NodeJS.Timeout>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Create named interval with automatic tracking
   */
  setInterval(id: string, callback: () => void, interval: number): void {
    this.clearInterval(id);
    this.intervals.set(id, setInterval(callback, interval));
  }

  /**
   * Clear specific interval by id
   */
  clearInterval(id: string): void {
    const interval = this.intervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(id);
    }
  }

  /**
   * Create named timeout with automatic tracking
   */
  setTimeout(id: string, callback: () => void, delay: number): void {
    this.clearTimeout(id);
    this.timeouts.set(id, setTimeout(() => {
      callback();
      this.timeouts.delete(id);
    }, delay));
  }

  /**
   * Clear specific timeout by id
   */
  clearTimeout(id: string): void {
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }
  }

  /**
   * Clear all intervals and timeouts
   */
  clearAll(): void {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.intervals.clear();
    this.timeouts.clear();
  }

  /**
   * Check if interval exists
   */
  hasInterval(id: string): boolean {
    return this.intervals.has(id);
  }

  /**
   * Check if timeout exists
   */
  hasTimeout(id: string): boolean {
    return this.timeouts.has(id);
  }

  /**
   * Get count of active intervals
   */
  getIntervalCount(): number {
    return this.intervals.size;
  }

  /**
   * Get count of active timeouts
   */
  getTimeoutCount(): number {
    return this.timeouts.size;
  }
}

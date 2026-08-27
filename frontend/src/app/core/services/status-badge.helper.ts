import { Injectable } from '@angular/core';

/**
 * Status badge configuration
 */
export interface StatusBadgeConfig {
  class: string;
  label: string;
  icon?: string;
}

/**
 * Helper service for status badge rendering
 * Centralizes status styling and label logic
 */
@Injectable({
  providedIn: 'root',
})
export class StatusBadgeHelper {
  private readonly statusConfigs: Record<string, StatusBadgeConfig> = {
    active: {
      class: 'badge badge--success',
      label: 'Actif',
      icon: 'pi-check-circle',
    },
    inactive: {
      class: 'badge badge--danger',
      label: 'Inactif',
      icon: 'pi-times-circle',
    },
    pending: {
      class: 'badge badge--warning',
      label: 'En attente',
      icon: 'pi-hourglass',
    },
    draft: {
      class: 'badge badge--secondary',
      label: 'Brouillon',
      icon: 'pi-file',
    },
    completed: {
      class: 'badge badge--success',
      label: 'Complété',
      icon: 'pi-check',
    },
    cancelled: {
      class: 'badge badge--danger',
      label: 'Annulé',
      icon: 'pi-times',
    },
    true: {
      class: 'badge badge--success',
      label: '✓ Actif',
    },
    false: {
      class: 'badge badge--danger',
      label: '✗ Inactif',
    },
  };

  /**
   * Get badge configuration for status
   */
  getConfig(status: string | boolean): StatusBadgeConfig {
    const key = String(status).toLowerCase();
    return (
      this.statusConfigs[key] ?? {
        class: 'badge',
        label: String(status),
      }
    );
  }

  /**
   * Get badge CSS class
   */
  getClass(status: string | boolean): string {
    return this.getConfig(status).class;
  }

  /**
   * Get badge label
   */
  getLabel(status: string | boolean): string {
    return this.getConfig(status).label;
  }

  /**
   * Get badge icon
   */
  getIcon(status: string | boolean): string | undefined {
    return this.getConfig(status).icon;
  }

  /**
   * Register custom status configuration
   */
  registerConfig(status: string, config: StatusBadgeConfig): void {
    this.statusConfigs[status.toLowerCase()] = config;
  }

  /**
   * Get all registered statuses
   */
  getAvailableStatuses(): string[] {
    return Object.keys(this.statusConfigs);
  }
}

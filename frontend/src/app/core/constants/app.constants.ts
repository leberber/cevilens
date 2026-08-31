/**
 * Global application constants
 */

export const APP_CONFIG = {
  // Toast/Notification timings (milliseconds)
  TOAST: {
    SHORT: 3000,   // 3 seconds for success messages
    LONG: 4000,    // 4 seconds for error messages
    INFO: 3000,    // 3 seconds for info messages
  },

  // Navigation and UI timings
  NAVIGATION_DELAY: 1000,  // Delay before navigating away
  ANIMATION_DELAY: 200,    // General animation timing

  // API response handling
  API: {
    DEFAULT_ERROR_MESSAGE: 'Une erreur est survenue',
    DEFAULT_SUCCESS_MESSAGE: 'Opération réussie',
  },

  // Pagination
  PAGE_SIZE: 50,
  PAGE_SIZES: [10, 25, 50, 100],

  // Debounce/Throttle
  SEARCH_DEBOUNCE_MS: 300,
};

// Client categories
export const CLIENT_CATEGORIES = [
  { label: 'Gros', value: 'gros' },
  { label: 'Détail', value: 'detail' },
  { label: 'Horeca', value: 'horeca' },
];

export type ClientCategoryValue = 'gros' | 'detail' | 'horeca';

// Client category labels and badges
export const CATEGORY_LABELS: Record<string, string> = {
  gros: 'Gros',
  detail: 'Détail',
  horeca: 'Horeca',
};

export const CATEGORY_BADGES: Record<string, string> = {
  gros: 'badge badge--info',
  detail: 'badge badge--success',
  horeca: 'badge badge--warning',
};

// Pagination
export const BATCH_SIZE = 100;
export const SEARCH_DEBOUNCE_MS = 400;
export const SCROLL_THRESHOLD = 300;

// Short French month labels (0-indexed)
export const MONTH_SHORT_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'] as const;

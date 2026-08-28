/**
 * Canal (sales channel) constants
 */
export const CANAL_OPTIONS = [
  { label: 'Direct (VD)', value: 'VD' },
  { label: 'Horeca (VH)', value: 'VH' },
] as const;

export const CANAL_LABELS: Record<string, string> = {
  'VD': 'Direct (VD)',
  'VH': 'Horeca (VH)',
};

export const CANAL_DISPLAY = (canal: string | null): string => {
  return CANAL_LABELS[canal as keyof typeof CANAL_LABELS] || canal || '';
};

export type Canal = typeof CANAL_OPTIONS[number]['value'];

import { UserRole } from '../models/user.model';

export const ROLE_LABELS: Record<UserRole | string, string> = {
  platform_admin: '🔑 Platform Admin',
  distributor_admin: '🔑 Admin',
  superviseur: '👮 Superviseur',
  prevendeur: '🚚 Prévendeur',
  prevender: '🚚 Prévendeur', // legacy
  admin: 'Admin', // legacy
};

export const ROLE_BADGES: Record<UserRole | string, string> = {
  platform_admin: 'badge badge--danger',
  distributor_admin: 'badge badge--warning',
  superviseur: 'badge badge--info',
  prevendeur: '',
  prevender: '', // legacy
  admin: 'badge badge--danger', // legacy
};

export const ROLE_HIERARCHY = {
  platform_admin: 4,
  distributor_admin: 3,
  superviseur: 2,
  prevendeur: 1,
  prevender: 1, // legacy
  admin: 4, // legacy equivalent to platform_admin
} as const;

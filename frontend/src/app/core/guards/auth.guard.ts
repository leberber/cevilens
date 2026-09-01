import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn ? true : router.createUrlTree(['/login']);
};

export const adminOrEmployeGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isAdminOrEmploye ? true : router.createUrlTree(['/fdv-performance']);
};

export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isAdmin ? true : router.createUrlTree(['/fdv-performance']);
};

export const platformAdminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isPlatformAdmin ? true : router.createUrlTree(['/fdv-performance']);
};

// Redirects prevenders away to their own page
export const notPrevenderGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isPrevender ? router.createUrlTree(['/prevendeur']) : true;
};

// Only prevenders can access
export const prevenderOnlyGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isPrevender ? true : router.createUrlTree(['/fdv-performance']);
};

// Root redirect: prevenders → /prevendeur, everyone else → /ventes
export const rootGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  return auth.isPrevender
    ? router.createUrlTree(['/prevendeur'])
    : router.createUrlTree(['/fdv-performance']);
};

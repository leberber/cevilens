import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';

// Brand preset — Cevital blue (#1749B2) + gold (#FFC200).
// primary-600 must match --primary-color in src/styles/_colors.scss.
const BrandPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '#edf2fd',
      100: '#d2e0f9',
      200: '#a5c1f3',
      300: '#78a2ed',
      400: '#4b83e7',
      500: '#2b65d1',
      600: '#1749B2',  // --primary-color
      700: '#133e96',  // --primary-700
      800: '#0f337a',
      900: '#0b285f',
      950: '#071a42',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: BrandPreset, options: { darkModeSelector: false } },
      ripple: true,
    }),
    MessageService,
    provideHttpClient(withInterceptors([authInterceptor, httpErrorInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};

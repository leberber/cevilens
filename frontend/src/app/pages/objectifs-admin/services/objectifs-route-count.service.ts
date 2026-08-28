import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ObjectifsRouteCountService {
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  routesVD: number = 0;
  routesVH: number = 0;
  routesFallbackMois: string | null = null;

  loadRouteCounts(
    mois: number,
    annee: number,
    onComplete?: () => void
  ): void {
    this.http.get<{ vd: number; vh: number; fallback_mois: string | null }>(
      `/api/v1/objectifs/routes-count?mois=${mois}&annee=${annee}`
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: d => {
          this.routesVD = d.vd;
          this.routesVH = d.vh;
          this.routesFallbackMois = d.fallback_mois;
          if (onComplete) onComplete();
        },
        error: () => {
          this.routesVD = 0;
          this.routesVH = 0;
          this.routesFallbackMois = null;
        },
      });
  }

  getRouteCount(canal: 'VD' | 'VH'): number {
    return canal === 'VD' ? this.routesVD : this.routesVH;
  }

  reset(): void {
    this.routesVD = 0;
    this.routesVH = 0;
    this.routesFallbackMois = null;
  }
}

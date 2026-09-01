import { Injectable } from '@angular/core';
import type { DrilldownFamille } from '../../../core/services/prevendeur.service';

/**
 * Encapsulates counter animation logic for famille KPI cards.
 * Returns a cancel function that caller must store and invoke on component destroy.
 */
@Injectable({ providedIn: 'root' })
export class FdvPerfAnimationService {

  /**
   * Animate counters with easeOutCubic easing over 900ms
   * @param familles - families with target totals
   * @param currentValues - current animated values map
   * @param onTick - callback on each frame with updated values
   * @param onComplete - callback when animation completes
   * @returns cancel function that caller should store and call on destroy
   */
  animateCounters(
    familles: DrilldownFamille[],
    currentValues: Record<string, number>,
    onTick: (values: Record<string, number>) => void,
    onComplete: () => void
  ): () => void {
    const duration = 900; // milliseconds
    const fps = 60;
    const totalFrames = Math.round((duration / 1000) * fps);
    let frame = 0;

    // Build target values from famille data
    const targets = familles.map(f => ({
      nom: f.nom,
      from: currentValues[f.nom] ?? 0,
      to: f.total,
    }));

    // Start interval
    const interval = setInterval(() => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      // easeOutCubic: 1 - (1 - t)³
      const ease = 1 - Math.pow(1 - progress, 3);

      // Update all counter values
      for (const t of targets) {
        currentValues[t.nom] = Math.round(t.from + (t.to - t.from) * ease);
      }

      onTick({ ...currentValues });

      // Cleanup when done
      if (progress >= 1) {
        clearInterval(interval);
        onComplete();
      }
    }, 1000 / fps);

    // Return cancel function
    return () => {
      clearInterval(interval);
    };
  }

  /**
   * Trigger bar animation by toggling barsReady signal
   * Used when SF/product data changes and bars need to re-render
   */
  triggerBarAnimation(onTrigger: (ready: boolean) => void): void {
    onTrigger(false);
    requestAnimationFrame(() => {
      onTrigger(true);
    });
  }
}

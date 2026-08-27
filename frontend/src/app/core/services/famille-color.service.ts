import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FamilleColorService {
  private readonly palette = [
    { background: 'rgba(99,102,241,0.12)',  color: '#4f46e5' },  // indigo
    { background: 'rgba(16,185,129,0.12)',  color: '#059669' },  // emerald
    { background: 'rgba(245,158,11,0.12)',  color: '#d97706' },  // amber
    { background: 'rgba(236,72,153,0.12)',  color: '#db2777' },  // pink
    { background: 'rgba(20,184,166,0.12)',  color: '#0d9488' },  // teal
    { background: 'rgba(239,68,68,0.12)',   color: '#dc2626' },  // red
    { background: 'rgba(59,130,246,0.12)',  color: '#2563eb' },  // blue
    { background: 'rgba(139,92,246,0.12)',  color: '#7c3aed' },  // violet
    { background: 'rgba(234,88,12,0.12)',   color: '#c2410c' },  // orange
    { background: 'rgba(15,118,110,0.12)',  color: '#0f766e' },  // dark-teal
  ];

  private readonly colorCache = new Map<string, { background: string; color: string }>();

  getStyle(famille: string | null): { background: string; color: string } {
    if (!famille) return { background: 'transparent', color: 'inherit' };

    if (!this.colorCache.has(famille)) {
      let hash = 0;
      for (let i = 0; i < famille.length; i++) {
        hash = (hash * 31 + famille.charCodeAt(i)) >>> 0;
      }
      const p = this.palette[hash % this.palette.length];
      this.colorCache.set(famille, { background: p.background, color: p.color });
    }

    return this.colorCache.get(famille)!;
  }
}

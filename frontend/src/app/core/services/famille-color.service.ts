import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FamilleColorService {
  private readonly palette = [
    { background: 'rgba(99,102,241,0.08)',  color: '#6366f1' },  // indigo-500
    { background: 'rgba(16,185,129,0.08)',  color: '#10b981' },  // emerald-500
    { background: 'rgba(245,158,11,0.08)',  color: '#f59e0b' },  // amber-500
    { background: 'rgba(236,72,153,0.08)',  color: '#ec4899' },  // pink-500
    { background: 'rgba(20,184,166,0.08)',  color: '#14b8a6' },  // teal-500
    { background: 'rgba(244,63,94,0.08)',   color: '#f43f5e' },  // rose-500
    { background: 'rgba(59,130,246,0.08)',  color: '#3b82f6' },  // blue-500
    { background: 'rgba(168,85,247,0.08)',  color: '#a855f7' },  // purple-500
    { background: 'rgba(249,115,22,0.08)',  color: '#f97316' },  // orange-500
    { background: 'rgba(6,182,212,0.08)',   color: '#06b6d4' },  // cyan-500
  ];

  private readonly overrides: Record<string, { background: string; color: string }> = {
    huile: { background: 'rgba(212,163,36,0.07)', color: '#b8962e' },
  };

  private readonly colorCache = new Map<string, { background: string; color: string }>();

  getStyle(famille: string | null): { background: string; color: string } {
    if (!famille) return { background: '', color: '' };

    const key = famille.toLowerCase().trim();
    if (this.overrides[key]) return this.overrides[key];

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

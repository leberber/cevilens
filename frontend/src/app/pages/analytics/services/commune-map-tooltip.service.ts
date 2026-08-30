import { Injectable, ElementRef } from '@angular/core';
import type { CommuneDatum } from '../commune-map.component';

@Injectable({ providedIn: 'root' })
export class CommuneMapTooltipService {

  private fmtVal(v: number): string {
    return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`;
  }

  buildCard(
    name: string | undefined,
    row: CommuneDatum | undefined,
    totalAll: number,
    rank?: number,
  ): string {
    const bc = rank === 1 ? '#2563eb' : rank && rank <= 3 ? '#1d4ed8' : '#3b82f6';
    const header = `
      <div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:12px">
        ${rank ? `<div style="min-width:28px;height:28px;border-radius:8px;background:${bc};
                    display:flex;align-items:center;justify-content:center;
                    font-size:9px;font-weight:800;color:#fff;flex-shrink:0">#${rank}</div>` : ''}
        <div style="min-width:0">
          <div style="font-weight:700;color:#0f172a;font-size:13px;line-height:1.25;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name ?? '—'}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:1px">Commune</div>
        </div>
      </div>`;
    if (!row || row.total === 0) return header + `<div style="color:#94a3b8;font-size:11px">Aucune vente sur la période</div>`;
    const pct = Math.round((row.total / totalAll) * 100);
    return header + `
      <div style="font-size:21px;font-weight:800;color:${bc};letter-spacing:-.5px;line-height:1;margin-bottom:10px">
        ${this.fmtVal(row.total)} <span style="font-size:11px;font-weight:500;color:#64748b">unités</span></div>
      <div style="height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden;margin-bottom:4px">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#93c5fd,${bc});border-radius:3px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#94a3b8">
        <span>Part du total</span><span>${pct}%</span>
      </div>`;
  }

  positionCard(cardEl: ElementRef<HTMLDivElement> | null, x: number, y: number, containerW: number): void {
    const el = cardEl?.nativeElement;
    if (!el) return;
    const w = 210;
    const flipX = x + w / 2 > containerW - 10;
    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
    el.style.transform = flipX
      ? 'translate(calc(-100% - 12px), calc(-100% - 12px))'
      : 'translate(12px, calc(-100% - 12px))';
  }

  showCard(cardEl: ElementRef<HTMLDivElement> | null, html: string): void {
    const el = cardEl?.nativeElement;
    if (!el) return;
    el.innerHTML = html;
    el.classList.add('visible');
    el.classList.remove('fading');
  }

  hideCard(cardEl: ElementRef<HTMLDivElement> | null): void {
    const el = cardEl?.nativeElement;
    if (!el) return;
    el.classList.remove('visible');
    el.classList.add('fading');
  }

}

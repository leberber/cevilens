import { Injectable, ElementRef, inject } from '@angular/core';
import type { CommuneDatum, CommuneFamilyDatum } from '../commune-map.component';
import { FamilleColorService } from '../../../core/services/famille-color.service';

@Injectable({ providedIn: 'root' })
export class CommuneMapTooltipService {
  private readonly familleColors = inject(FamilleColorService);

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
      <div style="display:flex;align-items:flex-start;gap:9px;margin-bottom:8px">
        ${rank ? `<div style="min-width:24px;height:24px;border-radius:7px;background:${bc};
                    display:flex;align-items:center;justify-content:center;
                    font-size:8px;font-weight:800;color:#fff;flex-shrink:0">#${rank}</div>` : ''}
        <div style="min-width:0">
          <div style="font-weight:700;color:#0f172a;font-size:13px;line-height:1.25;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name ?? '—'}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:1px">Commune</div>
        </div>
      </div>`;
    if (!row || row.total === 0) return header + `<div style="color:#94a3b8;font-size:11px">Aucune vente sur la période</div>`;

    const pct = Math.round((row.total / totalAll) * 100);
    const totalLine = `
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:6px">
        <span style="font-size:20px;font-weight:800;color:${bc};letter-spacing:-.5px;line-height:1">
          ${this.fmtVal(row.total)}</span>
        <span style="font-size:11px;font-weight:500;color:#64748b">t · ${pct}% du total</span>
      </div>`;

    const families = row.families?.length ? this.buildFamilyRows(row.families) : '';

    return header + totalLine + families;
  }

  private buildFamilyRows(families: CommuneFamilyDatum[]): string {
    const maxVal = Math.max(...families.map(f => f.total), 1);

    const rows = families.map(f => {
      const { color } = this.familleColors.getStyle(f.nom);
      const barW = Math.max(Math.round((f.total / maxVal) * 100), 2);
      const delta = this.buildDelta(f.total, f.prev);

      return `
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
          <div style="width:5px;height:5px;border-radius:50%;background:${color};flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1px">
              <span style="font-size:10px;color:#475569;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px">${f.nom}</span>
              <div style="display:flex;align-items:center;gap:5px">
                <span style="font-size:10px;font-weight:700;color:#0f172a">${this.fmtVal(f.total)}t</span>
                ${delta}
              </div>
            </div>
            <div style="height:4px;background:#f1f5f9;border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${barW}%;background:${color};border-radius:2px;opacity:0.7"></div>
            </div>
          </div>
        </div>`;
    }).join('');

    return `<div style="border-top:1px solid #f1f5f9;padding-top:6px;margin-top:4px">${rows}</div>`;
  }

  private buildDelta(current: number, prev: number): string {
    if (!prev && !current) return '';
    if (!prev) return `<span style="font-size:8px;color:#16a34a;font-weight:700">NEW</span>`;

    const pct = Math.round(((current - prev) / prev) * 100);
    if (pct === 0) return `<span style="font-size:8px;color:#94a3b8">=</span>`;

    const arrow = pct > 0 ? '▲' : '▼';
    const color = pct > 0 ? '#16a34a' : '#dc2626';
    const sign = pct > 0 ? '+' : '';
    return `<span style="font-size:8px;font-weight:700;color:${color}">${arrow}${sign}${pct}%</span>`;
  }

  positionCard(cardEl: ElementRef<HTMLDivElement> | null, x: number, y: number, containerW: number): void {
    const el = cardEl?.nativeElement;
    if (!el) return;
    const w = 290;
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

import { Component, input, output, effect, ElementRef, untracked } from '@angular/core';
import * as d3 from 'd3';
import { D3ChartBase, fmtShort, type D3G } from './d3-chart-base';

export interface HBarItem { name: string; value: number; id?: number; subtitle?: string; }

@Component({
  selector: 'app-d3-hbar',
  standalone: true,
  template: `
    <svg #svg style="width:100%;height:100%;overflow:visible"></svg>
    <div #tip class="d3tip"></div>
  `,
  styles: [`
    :host { display:block; height:100%; width:100%; position:relative; }
    .d3tip {
      position:absolute; pointer-events:none;
      background:rgba(15,23,42,.92); color:#fff;
      font-size:11px; padding:8px 12px;
      border-radius:10px; opacity:0;
      transition:opacity .12s; white-space:nowrap; z-index:20;
      box-shadow: 0 4px 12px rgba(0,0,0,.15);
      backdrop-filter: blur(4px);
    }
  `],
})
export class D3HbarComponent extends D3ChartBase<HBarItem> {
  readonly data       = input<HBarItem[]>([]);
  readonly color      = input('#2563eb');
  readonly label      = input('caisses');
  readonly selectedId = input<number | null>(null);
  readonly itemSelect = output<HBarItem | null>();

  private tracksG!: D3G;
  private barsG!: D3G;
  private labelsG!: D3G;
  private gradId = '';
  private hasDrawnOnce = false;

  constructor(host: ElementRef<HTMLElement>) {
    super(host);
    effect(() => {
      const selId = this.selectedId();
      if (!this.built) return;
      this.barsG.selectAll<SVGRectElement, HBarItem>('.bar')
        .transition('opacity').duration(220).ease(d3.easeCubicOut)
        .attr('opacity', (d: HBarItem) => selId != null && d.id !== selId ? 0.25 : 1);
    });
  }

  protected override getInputData(): HBarItem[] { return this.data(); }

  protected override draw(data: HBarItem[], animate: boolean): void {
    const el  = this.svgRef?.nativeElement;
    const tip = this.tipRef?.nativeElement;
    if (!el || !tip) return;

    if (!data.length) {
      if (this.built) {
        this.tracksG.selectAll('*').remove();
        this.barsG.selectAll('*').remove();
        this.labelsG.selectAll('*').remove();
      }
      return;
    }

    const W   = this.lastW || 400;
    const H   = this.lastH || 260;
    const m   = { top: 8, right: 12, bottom: 8, left: 12 };
    const iW  = W - m.left - m.right;
    const iH  = H - m.top - m.bottom;
    const dur = animate ? 500 : 0;
    const isUpdate = this.hasDrawnOnce;

    const barH   = Math.min(Math.max(6, iH / data.length * 0.32), 14);
    const labelH = 13;
    const rowH   = barH + labelH + 4;
    const gap    = Math.max(4, (iH - data.length * rowH) / Math.max(data.length, 1));

    const yPos = (i: number) => i * (rowH + gap);
    const x    = d3.scaleLinear().domain([0, d3.max(data, d => d.value) ?? 1]).range([0, iW]);

    const barColor = this.color();
    const base     = d3.color(barColor)!.rgb();
    const lightHex = d3.rgb(
      base.r + (255 - base.r) * 0.88,
      base.g + (255 - base.g) * 0.88,
      base.b + (255 - base.b) * 0.88,
    ).formatHex();
    const selId = untracked(() => this.selectedId());

    // Defs for gradient
    if (!this.built) {
      this.svgSel  = d3.select(el);
      this.gSel    = this.svgSel.append('g');
      this.tracksG = this.gSel.append('g');
      this.barsG   = this.gSel.append('g');
      this.labelsG = this.gSel.append('g');

      // Gradient definition
      const defs = this.svgSel.append('defs');
      const grad = defs.append('linearGradient').attr('id', `hbar-grad-${this.host.nativeElement.id || Math.random().toString(36).slice(2)}`);
      grad.append('stop').attr('offset', '0%').attr('stop-color', lightHex);
      grad.append('stop').attr('offset', '100%').attr('stop-color', barColor);
      this.gradId = grad.attr('id');

      this.built = true;
    }

    const gradId = this.gradId;

    // Update gradient colors
    this.svgSel.select(`#${gradId} stop:first-child`).attr('stop-color', lightHex);
    this.svgSel.select(`#${gradId} stop:last-child`).attr('stop-color', barColor);

    this.updateLayout(W, H, m);

    type Indexed = HBarItem & { _i: number };
    const indexed: Indexed[] = data.map((d, i) => ({ ...d, _i: i }));

    // On data updates: enter/exit are instant, only matching names animate
    const enterDur = isUpdate ? 0 : dur;
    const exitDur  = isUpdate ? 0 : dur / 2;

    // Track backgrounds
    this.tracksG.selectAll<SVGRectElement, Indexed>('.track')
      .data(indexed, d => d.name)
      .join(
        enter => enter.append('rect').attr('class', 'track')
          .attr('rx', barH / 2).attr('ry', barH / 2)
          .attr('fill', lightHex).attr('opacity', 0.4)
          .attr('x', 0).attr('width', iW)
          .attr('y', d => yPos(d._i) + labelH).attr('height', barH),
        update => {
          this.tx(update, 'draw', dur)
            .attr('y', (d: Indexed) => yPos(d._i) + labelH)
            .attr('height', barH).attr('width', iW)
            .attr('rx', barH / 2).attr('ry', barH / 2)
            .attr('fill', lightHex);
          return update;
        },
        exit => exitDur
          ? exit.transition('draw').duration(exitDur).attr('opacity', 0).remove()
          : exit.remove()
      );

    // Bars
    this.barsG.selectAll<SVGRectElement, Indexed>('.bar')
      .data(indexed, d => d.name)
      .join(
        enter => enter.append('rect').attr('class', 'bar')
          .attr('rx', barH / 2).attr('ry', barH / 2)
          .attr('fill', `url(#${gradId})`)
          .attr('x', 0)
          .attr('y', d => yPos(d._i) + labelH).attr('height', barH)
          .attr('opacity', d => selId != null && d.id !== selId ? 0.25 : 1)
          .attr('width', isUpdate ? ((d: Indexed) => Math.max(x(d.value), barH)) as any : 0)
          .call(e => isUpdate ? e : this.tx(e, 'draw', dur)
            .attr('width', (d: Indexed) => Math.max(x(d.value), barH))),
        update => {
          this.tx(update, 'draw', dur)
            .attr('y', (d: Indexed) => yPos(d._i) + labelH)
            .attr('height', barH)
            .attr('rx', barH / 2).attr('ry', barH / 2)
            .attr('width', (d: Indexed) => Math.max(x(d.value), barH));
          return update;
        },
        exit => exitDur
          ? exit.transition('draw').duration(exitDur).attr('width', 0).attr('opacity', 0).remove()
          : exit.remove()
      );

    // Name labels (above bar)
    this.labelsG.selectAll<SVGTextElement, Indexed>('.name')
      .data(indexed, d => d.name)
      .join(
        enter => enter.append('text').attr('class', 'name')
          .attr('text-anchor', 'start').attr('dominant-baseline', 'auto')
          .attr('font-size', 10.5).attr('fill', 'var(--text-color, #334155)').attr('font-weight', 600)
          .attr('x', 0).attr('opacity', isUpdate ? 1 : 0)
          .attr('y', d => yPos(d._i) + labelH - 4)
          .text(d => d.name.length > 35 ? d.name.slice(0, 35) + '…' : d.name)
          .call(e => isUpdate ? e : this.tx(e, 'draw', dur).attr('opacity', 1)),
        update => {
          this.tx(update, 'draw', dur)
            .attr('y', (d: Indexed) => yPos(d._i) + labelH - 4);
          update.text(d => d.name.length > 35 ? d.name.slice(0, 35) + '…' : d.name);
          return update;
        },
        exit => exitDur
          ? exit.transition().duration(exitDur).attr('opacity', 0).remove()
          : exit.remove()
      );

    // Subtitle labels (after name, same line)
    const hasSubtitles = data.some(d => !!d.subtitle);
    if (hasSubtitles) {
      this.labelsG.selectAll<SVGTextElement, Indexed>('.sub')
        .data(indexed, d => d.name)
        .join(
          enter => enter.append('text').attr('class', 'sub')
            .attr('text-anchor', 'end').attr('dominant-baseline', 'auto')
            .attr('font-size', 9).attr('fill', 'var(--text-color-secondary, #94a3b8)').attr('font-weight', 400)
            .attr('x', iW).attr('opacity', isUpdate ? 1 : 0)
            .attr('y', d => yPos(d._i) + labelH - 4)
            .text(d => d.subtitle ?? '')
            .call(e => isUpdate ? e : this.tx(e, 'draw', dur).attr('opacity', 1)),
          update => {
            this.tx(update, 'draw', dur)
              .attr('y', (d: Indexed) => yPos(d._i) + labelH - 4)
              .attr('x', iW);
            update.text(d => d.subtitle ?? '');
            return update;
          },
          exit => exitDur
            ? exit.transition().duration(exitDur).attr('opacity', 0).remove()
            : exit.remove()
        );
    } else {
      this.labelsG.selectAll('.sub').remove();
    }

    // Value labels — inside bar (white) when it would overflow, outside (colored) otherwise
    const valPad = 6;
    const valTextW = 32;
    const isInside = (d: Indexed) => Math.max(x(d.value), barH) + valPad + valTextW > iW;
    const valX = (d: Indexed) => isInside(d)
      ? Math.max(x(d.value), barH) - valPad
      : Math.max(x(d.value), barH) + valPad;
    const valAnchor = (d: Indexed) => isInside(d) ? 'end' : 'start';
    const valColor  = (d: Indexed) => isInside(d) ? '#fff' : barColor;

    this.labelsG.selectAll<SVGTextElement, Indexed>('.val')
      .data(indexed, d => d.name)
      .join(
        enter => enter.append('text').attr('class', 'val')
          .attr('font-size', 10).attr('font-weight', 700)
          .attr('dominant-baseline', 'middle').attr('opacity', isUpdate ? 1 : 0)
          .attr('y', d => yPos(d._i) + labelH + barH / 2)
          .attr('x', valX)
          .attr('text-anchor', valAnchor)
          .attr('fill', valColor)
          .text(d => d.value.toFixed(2))
          .call(e => isUpdate ? e : this.tx(e, 'draw', dur).attr('opacity', 1)),
        update => {
          this.tx(update, 'draw', dur)
            .attr('y', (d: Indexed) => yPos(d._i) + labelH + barH / 2)
            .attr('x', valX)
            .attr('text-anchor', valAnchor)
            .attr('fill', valColor);
          update.text(d => d.value.toFixed(2));
          return update;
        },
        exit => exitDur
          ? exit.transition().duration(exitDur).attr('opacity', 0).remove()
          : exit.remove()
      );

    // Hover zones
    this.gSel.selectAll<SVGRectElement, Indexed>('.hover-zone')
      .data(indexed, d => d.name)
      .join(
        enter => enter.append('rect').attr('class', 'hover-zone')
          .attr('fill', 'transparent').style('cursor', 'pointer')
          .attr('x', -m.left).attr('width', W)
          .attr('y', d => yPos(d._i)).attr('height', rowH)
          .on('mouseover', (_: MouseEvent, d: Indexed) => {
            d3.select(el).selectAll<SVGRectElement, Indexed>('.bar')
              .filter(b => b.name === d.name)
              .transition('hover').duration(120)
              .attr('filter', 'brightness(1.1) drop-shadow(0 1px 3px rgba(0,0,0,.15))');
            const sub = d.subtitle ? `<br/><span style="opacity:.7">${d.subtitle}</span>` : '';
            tip.innerHTML = `<b>${d.name}</b>${sub}<br/>${fmtShort(d.value)} ${this.label()}`;
            tip.style.opacity = '1';
          })
          .on('mousemove', (event: MouseEvent) => {
            Object.assign(tip.style, {
              left: `${event.offsetX + 12}px`,
              top: `${event.offsetY - 38}px`,
            });
          })
          .on('mouseout', () => {
            d3.select(el).selectAll('.bar')
              .transition('hover').duration(120)
              .attr('filter', null);
            tip.style.opacity = '0';
          })
          .on('click', (_: MouseEvent, d: Indexed) => {
            const cur = untracked(() => this.selectedId());
            this.itemSelect.emit(cur === d.id ? null : d);
          }),
        update => {
          this.tx(update, 'draw', dur)
            .attr('y', (d: Indexed) => yPos(d._i)).attr('height', rowH)
            .attr('x', -m.left).attr('width', W);
          return update;
        },
        exit => exit.remove()
      );

    this.hasDrawnOnce = true;
  }
}

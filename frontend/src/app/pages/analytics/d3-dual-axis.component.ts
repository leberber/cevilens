import { Component, input, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import { D3ChartBase, fmtShort, type D3G, type D3Path, type D3Line, type D3Rect } from './d3-chart-base';

export interface DualAxisPoint {
  label: string;
  bar: number;
  line: number;
  missed?: boolean;
}

type D3Sel = d3.Selection<SVGGElement, unknown, null, undefined>;

@Component({
  selector: 'app-d3-dual-axis',
  standalone: true,
  template: `
    <svg #svg style="width:100%;height:100%;overflow:visible"></svg>
    <div #tip class="d3tip"></div>
  `,
  styles: [`
    :host { display:block; height:100%; width:100%; position:relative; }
    .d3tip {
      position:absolute; pointer-events:none;
      background:rgba(15,23,42,.88); color:#fff;
      font-size:11px; padding:7px 11px;
      border-radius:8px; opacity:0;
      transition:opacity .12s; white-space:nowrap; z-index:20;
      line-height:1.5;
    }
  `],
})
export class D3DualAxisComponent extends D3ChartBase<DualAxisPoint> {
  readonly data      = input<DualAxisPoint[]>([]);
  readonly barLabel  = input('Volume');
  readonly lineLabel = input('Clients');
  readonly barUnit   = input('t');
  readonly barColor  = input('#3b82f6');
  readonly lineColor = input('#f59e0b');

  private xAxisG!:  D3G;
  private y1AxisG!: D3G;
  private y2AxisG!: D3G;
  private barsG!:   D3G;
  private missedG!: D3G;
  private lineEl!:  D3Path;
  private vlineEl!: D3Line;
  private hoverEl!: D3Rect;

  constructor(host: ElementRef<HTMLElement>) { super(host); }

  protected override getInputData(): DualAxisPoint[] { return this.data(); }

  protected override draw(data: DualAxisPoint[], animate: boolean): void {
    const el  = this.svgRef?.nativeElement;
    const tip = this.tipRef?.nativeElement;
    if (!el || !tip) return;

    const W   = this.lastW || 400;
    const H   = this.lastH || 200;
    const m   = { top: 12, right: 44, bottom: 26, left: 46 };
    const iW  = W - m.left - m.right;
    const iH  = H - m.top  - m.bottom;
    const dur = animate ? 550 : 0;

    const x  = d3.scaleBand().domain(data.map(d => d.label)).range([0, iW]).padding(0.35);
    const y1 = d3.scaleLinear().domain([0, d3.max(data, d => d.bar) ?? 1]).nice().range([iH, 0]);
    const y2 = d3.scaleLinear().domain([0, d3.max(data, d => d.line) ?? 1]).nice().range([iH, 0]);

    const lineGen = d3.line<DualAxisPoint>()
      .x(d => x(d.label)! + x.bandwidth() / 2)
      .y(d => y2(d.line))
      .curve(d3.curveMonotoneX);

    const fmtAxis = (v: d3.NumberValue) => fmtShort(+v);
    const barCol  = this.barColor();
    const lineCol = this.lineColor();

    if (!this.built) {
      this.svgSel  = d3.select(el);

      // Gradient for bars
      const defs = this.svgSel.append('defs');
      const grad = defs.append('linearGradient').attr('id', 'da-bar-grad')
        .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', barCol).attr('stop-opacity', 0.85);
      grad.append('stop').attr('offset', '100%').attr('stop-color', barCol).attr('stop-opacity', 0.45);

      const g       = this.gSel    = this.svgSel.append('g');
      this.gridG    = g.append('g');
      this.barsG    = g.append('g');
      this.missedG  = g.append('g');
      this.lineEl   = g.append('path').attr('fill', 'none')
        .attr('stroke', lineCol).attr('stroke-width', 2.2);
      this.xAxisG   = g.append('g');
      this.y1AxisG  = g.append('g');
      this.y2AxisG  = g.append('g');
      this.vlineEl  = g.append('line')
        .attr('stroke', '#94a3b8').attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3').style('opacity', 0);
      this.hoverEl  = this.svgSel.append('rect').attr('fill', 'transparent');
      this.built    = true;
    }

    this.updateLayout(W, H, m);

    // Grid lines
    this.gridG
      .call(d3.axisLeft(y1).ticks(4).tickSize(-iW).tickFormat(() => '') as unknown as (sel: D3Sel) => void)
      .call((s: D3Sel) => s.select('.domain').remove())
      .call((s: D3Sel) => s.selectAll('.tick line')
        .attr('stroke', 'var(--surface-border, #e2e8f0)').attr('stroke-dasharray', '3,3'));

    // Bars
    const bw = x.bandwidth();
    this.barsG.selectAll<SVGRectElement, DualAxisPoint>('.bar')
      .data(data, (d: DualAxisPoint) => d.label)
      .join(
        enter => enter.append('rect').attr('class', 'bar')
          .attr('rx', 3).attr('ry', 3)
          .attr('fill', 'url(#da-bar-grad)')
          .attr('x', d => x(d.label)!)
          .attr('width', bw)
          .attr('y', iH).attr('height', 0)
          .call(e => dur
            ? e.transition().duration(dur).ease(d3.easeCubicOut)
                .attr('y', d => y1(d.bar)).attr('height', d => iH - y1(d.bar))
            : e.attr('y', d => y1(d.bar)).attr('height', d => iH - y1(d.bar))),
        update => {
          this.tx(update, 'morph', dur)
            .attr('x', (d: DualAxisPoint) => x(d.label)!)
            .attr('width', bw)
            .attr('y', (d: DualAxisPoint) => y1(d.bar))
            .attr('height', (d: DualAxisPoint) => iH - y1(d.bar));
          return update;
        },
        exit => exit.transition().duration(dur / 2).attr('height', 0).attr('y', iH).remove()
      );

    // Missed bars (dashed red outline for months where client had no sales)
    const missedData = data.filter(d => d.missed);
    const nonZero = data.filter(d => d.bar > 0);
    const avgBar = nonZero.length ? nonZero.reduce((s, d) => s + d.bar, 0) / nonZero.length : 0;
    const missedY = avgBar > 0 ? y1(avgBar * 0.4) : iH * 0.6;
    const missedH = iH - missedY;

    this.missedG.selectAll<SVGRectElement, DualAxisPoint>('.missed-bar')
      .data(missedData, (d: DualAxisPoint) => d.label)
      .join(
        enter => enter.append('rect').attr('class', 'missed-bar')
          .attr('rx', 3).attr('ry', 3)
          .attr('fill', 'rgba(239, 68, 68, 0.08)')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,3')
          .attr('x', d => x(d.label)!)
          .attr('width', bw)
          .attr('y', iH).attr('height', 0)
          .call(e => dur
            ? e.transition().duration(dur).ease(d3.easeCubicOut)
                .attr('y', missedY).attr('height', missedH)
            : e.attr('y', missedY).attr('height', missedH)),
        update => {
          this.tx(update, 'missed', dur)
            .attr('x', (d: DualAxisPoint) => x(d.label)!)
            .attr('width', bw)
            .attr('y', missedY).attr('height', missedH);
          return update;
        },
        exit => exit.transition().duration(dur / 2).attr('height', 0).attr('y', iH).remove()
      );

    // Line path
    const flatLine = d3.line<DualAxisPoint>()
      .x(d => x(d.label)! + bw / 2).y(() => iH).curve(d3.curveMonotoneX);

    if (dur && !this.lineEl.attr('d')) {
      this.lineEl.attr('d', flatLine(data) ?? '');
    }
    this.tx(this.lineEl, 'morph', dur).attr('d', lineGen(data) ?? '');

    // Line dots
    this.gSel.selectAll<SVGCircleElement, DualAxisPoint>('.ldot')
      .data(data, (d: DualAxisPoint) => d.label)
      .join(
        enter => enter.append('circle').attr('class', 'ldot')
          .attr('r', 3.5).attr('fill', lineCol)
          .attr('stroke', 'var(--surface-card, #fff)').attr('stroke-width', 2)
          .attr('cx', d => x(d.label)! + bw / 2)
          .attr('cy', iH).attr('opacity', 0)
          .call(e => dur
            ? e.transition().delay(dur * 0.6).duration(300)
                .attr('cy', d => y2(d.line)).attr('opacity', 1)
            : e.attr('cy', d => y2(d.line)).attr('opacity', 1)),
        update => {
          this.tx(update, 'morph', dur)
            .attr('cx', (d: DualAxisPoint) => x(d.label)! + bw / 2)
            .attr('cy', (d: DualAxisPoint) => y2(d.line));
          return update;
        },
        exit => exit.remove()
      );

    // X axis
    this.xAxisG.attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(x).tickSize(0) as unknown as (sel: D3Sel) => void)
      .call((s: D3Sel) => s.select('.domain').attr('stroke', 'var(--surface-border, #e2e8f0)'))
      .call((s: D3Sel) => s.selectAll('text')
        .attr('fill', 'var(--text-color-secondary, #94a3b8)')
        .attr('font-size', 8.5).attr('dy', '1em'));

    // Left Y axis (volume)
    this.y1AxisG
      .call(d3.axisLeft(y1).ticks(4).tickFormat(fmtAxis) as unknown as (sel: D3Sel) => void)
      .call((s: D3Sel) => s.select('.domain').remove())
      .call((s: D3Sel) => s.selectAll('text')
        .attr('fill', barCol).attr('font-size', 9));

    // Right Y axis (clients / commandes)
    this.y2AxisG.attr('transform', `translate(${iW},0)`)
      .call(d3.axisRight(y2).ticks(4).tickFormat(d3.format('d')) as unknown as (sel: D3Sel) => void)
      .call((s: D3Sel) => s.select('.domain').remove())
      .call((s: D3Sel) => s.selectAll('text')
        .attr('fill', lineCol).attr('font-size', 9));

    // Axis labels (rotated)
    const labelClass = 'axis-label';
    this.gSel.selectAll(`.${labelClass}`).remove();

    this.gSel.append('text').attr('class', labelClass)
      .attr('transform', `translate(${-m.left + 10},${iH / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('fill', barCol)
      .attr('font-size', 8).attr('font-weight', 600)
      .text(`${this.barLabel()} (${this.barUnit()})`);

    this.gSel.append('text').attr('class', labelClass)
      .attr('transform', `translate(${iW + m.right - 10},${iH / 2}) rotate(90)`)
      .attr('text-anchor', 'middle')
      .attr('fill', lineCol)
      .attr('font-size', 8).attr('font-weight', 600)
      .text(this.lineLabel());

    // Hover interaction
    this.vlineEl.attr('y1', 0).attr('y2', iH);
    this.hoverEl
      .attr('x', m.left).attr('y', m.top).attr('width', iW).attr('height', iH)
      .on('mousemove', (event: MouseEvent) => {
        const [mx] = d3.pointer(event, this.gSel.node());
        const bands = data.map(d => x(d.label)! + bw / 2);
        let idx = 0;
        let minD = Infinity;
        bands.forEach((bx, i) => { const dd = Math.abs(mx - bx); if (dd < minD) { minD = dd; idx = i; } });
        const pt = data[idx];
        if (!pt) return;
        const px = x(pt.label)! + bw / 2;
        this.vlineEl.attr('x1', px).attr('x2', px).style('opacity', 1);
        const lines = [
          `<b>${pt.label}</b>`,
          `<span style="color:${barCol}">${this.barLabel()}: <b>${pt.bar.toFixed(1)} ${this.barUnit()}</b></span>`,
          `<span style="color:${lineCol}">${this.lineLabel()}: <b>${pt.line}</b></span>`,
        ];
        if (pt.missed) lines.push(`<span style="color:#f87171">Manqué</span>`);
        tip.innerHTML = lines.join('<br/>');
        const tipLeft = m.left + px + 10;
        const flip = tipLeft + 140 > W;
        Object.assign(tip.style, {
          opacity: '1',
          left: flip ? `${m.left + px - 140}px` : `${tipLeft}px`,
          top: `${m.top}px`,
        });
      })
      .on('mouseleave', () => {
        this.vlineEl.style('opacity', 0);
        tip.style.opacity = '0';
      });
  }
}

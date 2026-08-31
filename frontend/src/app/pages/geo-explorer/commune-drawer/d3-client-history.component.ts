import { Component, input, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import { D3ChartBase, fmtShort } from '../../analytics/d3-chart-base';

export interface HistoryPoint { period: string; total: number; missed: number; }

type D3Sel = d3.Selection<SVGGElement, unknown, null, undefined>;

@Component({
  selector: 'app-d3-client-history',
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
      font-size:12px; padding:7px 11px;
      border-radius:8px; opacity:0;
      transition:opacity .12s; white-space:nowrap; z-index:20;
      line-height:1.6;
    }
  `],
})
export class D3ClientHistoryComponent extends D3ChartBase<HistoryPoint> {
  readonly data = input<HistoryPoint[]>([]);

  private xAxisG!: D3Sel;
  private yAxisG!: D3Sel;
  private barsG!: D3Sel;
  private missedG!: D3Sel;

  constructor(host: ElementRef<HTMLElement>) { super(host); }

  protected override getInputData(): HistoryPoint[] { return this.data(); }

  protected override draw(data: HistoryPoint[], animate: boolean): void {
    const el  = this.svgRef?.nativeElement;
    const tip = this.tipRef?.nativeElement;
    if (!el || !tip) return;

    const W  = this.lastW || 400;
    const H  = this.lastH || 200;
    const m  = { top: 12, right: 12, bottom: 28, left: 44 };
    const iW = W - m.left - m.right;
    const iH = H - m.top  - m.bottom;
    const dur = animate ? 500 : 0;

    const maxVal = d3.max(data, d => Math.max(d.total, d.missed)) ?? 1;

    const x = d3.scaleBand<string>()
      .domain(data.map(d => d.period))
      .range([0, iW])
      .padding(0.25);

    const y = d3.scaleLinear()
      .domain([0, maxVal])
      .nice()
      .range([iH, 0]);

    const shortMonth = (p: string) => {
      const [, mm] = p.split('-');
      const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
      return months[parseInt(mm, 10) - 1] ?? mm;
    };

    if (!this.built) {
      this.svgSel  = d3.select(el);
      this.gSel    = this.svgSel.append('g');
      this.gridG   = this.gSel.append('g');
      this.missedG = this.gSel.append('g');
      this.barsG   = this.gSel.append('g');
      this.xAxisG  = this.gSel.append('g');
      this.yAxisG  = this.gSel.append('g');
      this.built   = true;
    }

    this.updateLayout(W, H, m);

    // Grid lines
    this.gridG
      .call(d3.axisLeft(y).ticks(4).tickSize(-iW).tickFormat(() => '') as unknown as (sel: D3Sel) => void)
      .call((s: D3Sel) => s.select('.domain').remove())
      .call((s: D3Sel) => s.selectAll('.tick line').attr('stroke', '#e2e8f0').attr('stroke-dasharray', '3,3'));

    // Purchase bars
    this.barsG
      .selectAll<SVGRectElement, HistoryPoint>('.bar')
      .data(data, d => d.period)
      .join(
        enter => enter.append('rect').attr('class', 'bar')
          .attr('x', d => x(d.period)!)
          .attr('width', x.bandwidth())
          .attr('y', iH)
          .attr('height', 0)
          .attr('rx', 3)
          .attr('fill', '#3b82f6')
          .call(e => e.transition().duration(dur).ease(d3.easeCubicOut)
            .attr('y', d => y(d.total))
            .attr('height', d => iH - y(d.total))),
        update => update.call(u => this.tx(u, 'bars', dur)
          .attr('x', (d: HistoryPoint) => x(d.period)!)
          .attr('width', x.bandwidth())
          .attr('y', (d: HistoryPoint) => y(d.total))
          .attr('height', (d: HistoryPoint) => iH - y(d.total))),
        exit => exit.transition().duration(dur / 2).attr('height', 0).attr('y', iH).remove()
      );

    // Missed opportunity bars (dashed outline)
    this.missedG
      .selectAll<SVGRectElement, HistoryPoint>('.missed')
      .data(data.filter(d => d.missed > 0), d => d.period)
      .join(
        enter => enter.append('rect').attr('class', 'missed')
          .attr('x', d => x(d.period)!)
          .attr('width', x.bandwidth())
          .attr('y', iH)
          .attr('height', 0)
          .attr('rx', 3)
          .attr('fill', 'rgba(239, 68, 68, 0.08)')
          .attr('stroke', '#ef4444')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,3')
          .call(e => e.transition().duration(dur).ease(d3.easeCubicOut)
            .attr('y', d => y(d.missed))
            .attr('height', d => iH - y(d.missed))),
        update => update.call(u => this.tx(u, 'missed', dur)
          .attr('x', (d: HistoryPoint) => x(d.period)!)
          .attr('width', x.bandwidth())
          .attr('y', (d: HistoryPoint) => y(d.missed))
          .attr('height', (d: HistoryPoint) => iH - y(d.missed))),
        exit => exit.transition().duration(dur / 2).attr('height', 0).attr('y', iH).remove()
      );

    // X axis
    this.xAxisG.attr('transform', `translate(0,${iH})`)
      .call(d3.axisBottom(x).tickSize(3).tickFormat(shortMonth) as unknown as (sel: D3Sel) => void)
      .call((s: D3Sel) => s.select('.domain').attr('stroke', '#e2e8f0'))
      .call((s: D3Sel) => s.selectAll('text').attr('fill', '#94a3b8').attr('font-size', 9).attr('dy', '1em'))
      .call((s: D3Sel) => s.selectAll('.tick line').attr('stroke', '#e2e8f0'));

    // Y axis
    this.yAxisG
      .call(d3.axisLeft(y).ticks(4).tickFormat(v => fmtShort(+v)) as unknown as (sel: D3Sel) => void)
      .call((s: D3Sel) => s.select('.domain').remove())
      .call((s: D3Sel) => s.selectAll('text').attr('fill', '#64748b').attr('font-size', 10));

    // Hover
    const allBars = this.barsG.selectAll<SVGRectElement, HistoryPoint>('.bar');
    allBars
      .on('mouseover', (_, d) => {
        let html = `<b>${d.period}</b><br/>Achats: <b>${fmtShort(d.total)}</b>`;
        if (d.missed > 0) html += `<br/><span style="color:#f87171">Manqué: ${fmtShort(d.missed)}</span>`;
        tip.innerHTML = html;
        tip.style.opacity = '1';
      })
      .on('mousemove', (event: MouseEvent) => {
        Object.assign(tip.style, {
          left: `${event.offsetX + 12}px`,
          top: `${event.offsetY - 36}px`,
        });
      })
      .on('mouseout', () => { tip.style.opacity = '0'; });

    // Also hover on missed bars
    this.missedG.selectAll<SVGRectElement, HistoryPoint>('.missed')
      .on('mouseover', (_, d) => {
        tip.innerHTML = `<b>${d.period}</b><br/><span style="color:#f87171">Manqué: ${fmtShort(d.missed)}</span>`;
        tip.style.opacity = '1';
      })
      .on('mousemove', (event: MouseEvent) => {
        Object.assign(tip.style, {
          left: `${event.offsetX + 12}px`,
          top: `${event.offsetY - 36}px`,
        });
      })
      .on('mouseout', () => { tip.style.opacity = '0'; });
  }
}

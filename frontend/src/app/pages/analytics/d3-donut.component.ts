import { Component, input, output, effect, ElementRef, untracked } from '@angular/core';
import * as d3 from 'd3';
import { D3ChartBase, fmtShort } from './d3-chart-base';

export interface DonutSlice {
  nom: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-d3-donut',
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
    }
  `],
})
export class D3DonutComponent extends D3ChartBase<DonutSlice> {
  readonly data        = input<DonutSlice[]>([]);
  readonly centerVal   = input('');
  readonly centerUnit  = input('');
  readonly selectedNom = input<string | null>(null);
  readonly sliceSelect = output<string | null>();

  private arcsG!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private labelsG!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private centerG!: d3.Selection<SVGGElement, unknown, null, undefined>;

  constructor(host: ElementRef<HTMLElement>) {
    super(host);
    effect(() => {
      const nom = this.selectedNom();
      if (!this.built) return;
      this.arcsG.selectAll<SVGPathElement, d3.PieArcDatum<DonutSlice>>('.arc')
        .transition('sel').duration(220).ease(d3.easeCubicOut)
        .attr('opacity', d => nom != null && d.data.nom !== nom ? 0.3 : 1);
    });
  }

  protected override getInputData(): DonutSlice[] { return this.data(); }

  protected override draw(data: DonutSlice[], animate: boolean): void {
    const el  = this.svgRef?.nativeElement;
    const tip = this.tipRef?.nativeElement;
    if (!el || !tip) return;

    const W   = this.lastW || 300;
    const H   = this.lastH || 300;
    const cx  = W / 2;
    const cy  = H / 2;
    const r   = Math.min(cx, cy) * 0.78;
    const ri  = r * 0.72;
    const dur = animate ? 650 : 0;
    const grand = d3.sum(data, d => d.value);

    const pie = d3.pie<DonutSlice>().value(d => d.value).sort(null).padAngle(0.02);
    const arc = d3.arc<d3.PieArcDatum<DonutSlice>>()
      .innerRadius(ri).outerRadius(r).cornerRadius(5);
    const arcHover = d3.arc<d3.PieArcDatum<DonutSlice>>()
      .innerRadius(ri).outerRadius(r + 8).cornerRadius(5);
    const arcLabel = d3.arc<d3.PieArcDatum<DonutSlice>>()
      .innerRadius(r + 16).outerRadius(r + 16);

    const slices = pie(data);
    const selNom = untracked(() => this.selectedNom());

    if (!this.built) {
      this.svgSel  = d3.select(el);
      this.gSel    = this.svgSel.append('g');
      this.arcsG   = this.gSel.append('g');
      this.labelsG = this.gSel.append('g').attr('class', 'labels');
      this.centerG = this.gSel.append('g');
      this.built   = true;
    }

    this.svgSel.attr('viewBox', `0 0 ${W} ${H}`);
    this.gSel.attr('transform', `translate(${cx},${cy})`);

    // Arcs
    const joined = this.arcsG
      .selectAll<SVGPathElement, d3.PieArcDatum<DonutSlice>>('.arc')
      .data(slices, d => d.data.nom)
      .join(
        enter => enter.append('path').attr('class', 'arc')
          .attr('fill', d => d.data.color)
          .attr('stroke', 'var(--surface-card)').attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .attr('opacity', d => selNom != null && d.data.nom !== selNom ? 0.3 : 1)
          .each(function (d) { (this as any)._prev = { ...d, endAngle: d.startAngle }; })
          .attr('d', function (d) { return arc({ ...d, endAngle: d.startAngle } as any) ?? ''; }),
        update => update,
        exit => exit.transition().duration(dur / 2).attr('opacity', 0).remove()
      );

    if (dur) {
      joined.transition('draw').duration(dur).ease(d3.easeCubicOut)
        .attrTween('d', function (d) {
          const prev = (this as any)._prev ?? d;
          (this as any)._prev = d;
          const i = d3.interpolate(prev, d);
          return (t: number) => arc(i(t) as any) ?? '';
        })
        .attr('fill', d => d.data.color);
    } else {
      joined.attr('d', d => arc(d) ?? '').attr('fill', d => d.data.color)
        .each(function (d) { (this as any)._prev = d; });
    }

    joined
      .on('mouseover', function (_, d) {
        d3.select(this).raise().transition('hover').duration(150)
          .attr('d', arcHover(d) ?? '');
        const pct = grand ? Math.round((d.data.value / grand) * 100) : 0;
        tip.innerHTML = `<b>${d.data.nom}</b><br/>${fmtShort(d.data.value)} (${pct}%)`;
        tip.style.opacity = '1';
      })
      .on('mousemove', (event: MouseEvent) => {
        Object.assign(tip.style, {
          left: `${event.offsetX + 12}px`,
          top: `${event.offsetY - 36}px`,
        });
      })
      .on('mouseout', function (_, d) {
        d3.select(this).transition('hover').duration(150)
          .attr('d', arc(d) ?? '');
        tip.style.opacity = '0';
      })
      .on('click', (_, d) => {
        const cur = untracked(() => this.selectedNom());
        this.sliceSelect.emit(cur === d.data.nom ? null : d.data.nom);
      });

    // Percentage labels inside arcs
    this.arcsG.selectAll<SVGTextElement, d3.PieArcDatum<DonutSlice>>('.pct')
      .data(slices.filter(d => (d.endAngle - d.startAngle) > 0.25), d => d.data.nom)
      .join(
        enter => enter.append('text').attr('class', 'pct')
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('font-size', 10).attr('font-weight', 700)
          .attr('fill', '#fff').attr('pointer-events', 'none')
          .attr('opacity', 0)
          .call(e => dur
            ? e.transition().delay(dur * 0.6).duration(250).attr('opacity', 1)
            : e.attr('opacity', 1)),
        update => update,
        exit => exit.remove()
      )
      .attr('transform', d => `translate(${d3.arc<d3.PieArcDatum<DonutSlice>>().innerRadius((ri + r) / 2).outerRadius((ri + r) / 2).centroid(d)})`)
      .text(d => grand ? `${Math.round((d.data.value / grand) * 100)}%` : '');

    // Name labels outside arcs
    this.labelsG.selectAll<SVGTextElement, d3.PieArcDatum<DonutSlice>>('.lbl')
      .data(slices.filter(d => (d.endAngle - d.startAngle) > 0.18), d => d.data.nom)
      .join(
        enter => enter.append('text').attr('class', 'lbl')
          .attr('dominant-baseline', 'central')
          .attr('font-size', 10).attr('fill', 'var(--text-color-secondary)')
          .attr('pointer-events', 'none')
          .attr('opacity', 0)
          .call(e => dur
            ? e.transition().delay(dur * 0.7).duration(250).attr('opacity', 1)
            : e.attr('opacity', 1)),
        update => update,
        exit => exit.remove()
      )
      .attr('transform', d => {
        const c = arcLabel.centroid(d);
        return `translate(${c})`;
      })
      .attr('text-anchor', d => {
        const mid = (d.startAngle + d.endAngle) / 2;
        return mid < Math.PI ? 'start' : 'end';
      })
      .text(d => {
        const parts = d.data.nom.split(' ');
        return parts.length > 2 ? parts.slice(0, 2).join(' ') + '…' : d.data.nom;
      });

    // Center label
    this.centerG.selectAll('*').remove();
    const cv = this.centerVal() || fmtShort(grand);
    this.centerG.append('text')
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .attr('y', -6).attr('font-size', Math.min(ri * 0.45, 22))
      .attr('font-weight', 800).attr('fill', 'currentColor')
      .text(cv);
    const cu = this.centerUnit();
    if (cu) {
      this.centerG.append('text')
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('y', 12).attr('font-size', 9)
        .attr('fill', 'var(--text-color-secondary)').attr('letter-spacing', '1')
        .text(cu);
    }
  }
}

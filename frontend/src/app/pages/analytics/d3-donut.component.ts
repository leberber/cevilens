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
  readonly data            = input<DonutSlice[]>([]);
  readonly centerVal       = input('');
  readonly centerUnit      = input('');
  readonly selectedNom     = input<string | null>(null);
  readonly deltas          = input<Record<string, number | null>>({});
  readonly secondaryValues = input<Record<string, number>>({});
  readonly secondaryUnit   = input('');
  readonly secondaryUnits  = input<Record<string, string>>({});
  readonly sliceSelect     = output<string | null>();

  private arcsG!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private pctsG!: d3.Selection<SVGGElement, unknown, null, undefined>;
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

    if (!this.built) {
      this.svgSel  = d3.select(el);
      this.gSel    = this.svgSel.append('g');
      this.arcsG   = this.gSel.append('g');
      this.pctsG   = this.gSel.append('g').attr('pointer-events', 'none');
      this.labelsG = this.gSel.append('g').attr('class', 'labels');
      this.centerG = this.gSel.append('g');
      this.built   = true;
    }

    this.svgSel.attr('viewBox', `0 0 ${W} ${H}`);
    this.gSel.attr('transform', `translate(${cx},${cy})`);

    if (!data.length) {
      this.arcsG.selectAll('*').remove();
      this.pctsG.selectAll('*').remove();
      this.labelsG.selectAll('*').remove();
      this.centerG.selectAll('*').remove();
      this.centerG.append('text')
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', 11).attr('fill', 'var(--text-color-secondary)')
        .text('Aucune donnée');
      return;
    }

    const dur = animate ? 650 : 0;
    const grand = d3.sum(data, d => d.value);

    const pie = d3.pie<DonutSlice>().value(d => d.value).sort(null).padAngle(0.02);
    const arc = d3.arc<d3.PieArcDatum<DonutSlice>>()
      .innerRadius(ri).outerRadius(r).cornerRadius(5);
    const arcHover = d3.arc<d3.PieArcDatum<DonutSlice>>()
      .innerRadius(ri).outerRadius(r + 8).cornerRadius(5);

    const slices = pie(data);
    const selNom = untracked(() => this.selectedNom());

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

    const secMap  = this.secondaryValues();
    const secUnit = this.secondaryUnit();
    const secUnits = this.secondaryUnits();

    joined
      .on('mouseover', function (_, d) {
        d3.select(this).raise().transition('hover').duration(150)
          .attr('d', arcHover(d) ?? '');
        const pct = grand ? Math.round((d.data.value / grand) * 100) : 0;
        let html = `<b>${d.data.nom}</b><br/>${fmtShort(d.data.value)} t (${pct}%)`;
        const sec = secMap[d.data.nom];
        const unit = secUnits[d.data.nom] || secUnit;
        if (sec != null && unit) html += ` · ${fmtShort(sec)} ${unit}`;
        tip.innerHTML = html;
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

    // Percentage labels (in separate group so .raise() on arcs doesn't cover them)
    this.pctsG.selectAll<SVGTextElement, d3.PieArcDatum<DonutSlice>>('.pct')
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

    // Name labels outside arcs with leader lines + optional deltas
    const deltaMap = this.deltas();
    const hasDeltas = Object.keys(deltaMap).length > 0;
    const elbowR   = r + 6;                          // where the line bends
    const labelX   = r + 14;                         // horizontal end x
    const lh       = hasDeltas ? 20 : 13;            // min spacing per label

    // Build raw label positions from arc midpoints
    interface LblDatum {
      d: d3.PieArcDatum<DonutSlice>; mid: number;
      y: number; side: 1 | -1; anchor: 'start' | 'end';
    }
    const rawLabels: LblDatum[] = slices.map(d => {
      const mid = (d.startAngle + d.endAngle) / 2;
      const side: 1 | -1 = mid < Math.PI ? 1 : -1;
      return {
        d, mid,
        y: Math.sin(mid - Math.PI / 2) * elbowR,
        side,
        anchor: side === 1 ? 'start' as const : 'end' as const,
      };
    });

    // Resolve vertical collisions per side
    const resolveOverlaps = (labels: LblDatum[]) => {
      labels.sort((a, b) => a.y - b.y);
      for (let i = 1; i < labels.length; i++) {
        if (labels[i].y - labels[i - 1].y < lh)
          labels[i].y = labels[i - 1].y + lh;
      }
      // Re-center the stack around its natural midpoint
      if (labels.length > 1) {
        const top = labels[0].y;
        const bot = labels[labels.length - 1].y;
        const natTop = Math.min(...labels.map(l => Math.sin(l.mid - Math.PI / 2) * elbowR));
        const natBot = Math.max(...labels.map(l => Math.sin(l.mid - Math.PI / 2) * elbowR));
        const shift = ((natTop + natBot) - (top + bot)) / 2;
        labels.forEach(l => l.y += shift);
      }
    };
    const rightLabels = rawLabels.filter(l => l.side === 1);
    const leftLabels  = rawLabels.filter(l => l.side === -1);
    resolveOverlaps(rightLabels);
    resolveOverlaps(leftLabels);
    const posLabels = [...rightLabels, ...leftLabels];

    // Leader lines (polylines): arc edge → elbow → horizontal
    this.labelsG.selectAll<SVGPolylineElement, LblDatum>('.ldr')
      .data(posLabels, d => d.d.data.nom)
      .join(
        enter => enter.append('polyline').attr('class', 'ldr')
          .attr('fill', 'none')
          .attr('stroke', 'var(--text-color-secondary)')
          .attr('stroke-width', 0.8)
          .attr('opacity', 0)
          .call(e => dur
            ? e.transition().delay(dur * 0.7).duration(250).attr('opacity', 0.35)
            : e.attr('opacity', 0.35)),
        update => update.attr('opacity', 0.35),
        exit => exit.remove()
      )
      .attr('points', l => {
        const angle = l.mid - Math.PI / 2;
        const sx = Math.cos(angle) * (r + 2);
        const sy = Math.sin(angle) * (r + 2);
        const hx = l.side * labelX;
        return `${sx},${sy} ${hx},${l.y}`;
      });

    // Small dot at leader line start
    this.labelsG.selectAll<SVGCircleElement, LblDatum>('.ldr-dot')
      .data(posLabels, d => d.d.data.nom)
      .join(
        enter => enter.append('circle').attr('class', 'ldr-dot')
          .attr('r', 2)
          .attr('fill', d => d.d.data.color)
          .attr('opacity', 0)
          .call(e => dur
            ? e.transition().delay(dur * 0.7).duration(250).attr('opacity', 1)
            : e.attr('opacity', 1)),
        update => update.attr('fill', d => d.d.data.color).attr('opacity', 1),
        exit => exit.remove()
      )
      .attr('cx', l => Math.cos(l.mid - Math.PI / 2) * (r + 2))
      .attr('cy', l => Math.sin(l.mid - Math.PI / 2) * (r + 2));

    // Label groups
    const lblJoin = this.labelsG.selectAll<SVGGElement, LblDatum>('.lbl-g')
      .data(posLabels, d => d.d.data.nom)
      .join(
        enter => enter.append('g').attr('class', 'lbl-g')
          .attr('pointer-events', 'none')
          .attr('opacity', 0)
          .call(g => {
            g.append('text').attr('class', 'lbl')
              .attr('dominant-baseline', 'central')
              .attr('font-size', 9.5).attr('fill', 'var(--text-color-secondary)');
            g.append('text').attr('class', 'lbl-delta')
              .attr('dominant-baseline', 'central')
              .attr('font-size', 8).attr('font-weight', 700)
              .attr('dy', 11);
          })
          .call(e => dur
            ? e.transition().delay(dur * 0.7).duration(250).attr('opacity', 1)
            : e.attr('opacity', 1)),
        update => update,
        exit => exit.remove()
      );

    lblJoin.attr('transform', l => {
      const tx = l.side * labelX + l.side * 4;
      return `translate(${tx},${l.y})`;
    });

    lblJoin.select<SVGTextElement>('.lbl')
      .attr('text-anchor', l => l.anchor)
      .text(l => {
        const name = l.d.data.nom.length > 20 ? l.d.data.nom.slice(0, 20) + '…' : l.d.data.nom;
        return `${name} ${fmtShort(l.d.data.value)}t`;
      });

    lblJoin.select<SVGTextElement>('.lbl-delta')
      .attr('text-anchor', l => l.anchor)
      .attr('fill', l => {
        const pct = deltaMap[l.d.data.nom];
        if (pct == null) return 'transparent';
        return pct >= 0 ? 'var(--color-success-dark, #16a34a)' : '#dc2626';
      })
      .text(l => {
        if (!hasDeltas) return '';
        const pct = deltaMap[l.d.data.nom];
        if (pct == null) return '';
        const arrow = pct >= 0 ? '▲' : '▼';
        const sign = pct > 0 ? '+' : '';
        return `${arrow} ${sign}${pct}%`;
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

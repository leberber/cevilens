import {
  Component, input, output, effect, ElementRef, ViewChild, signal, computed,
  AfterViewInit, OnDestroy, inject, HostListener,
} from '@angular/core';
import * as L from 'leaflet';
import { HttpClient } from '@angular/common/http';
import { CommuneMapStyleService } from './services/commune-map-style.service';
import { CommuneMapTooltipService } from './services/commune-map-tooltip.service';
import { environment } from '../../../environments/environment';
import {
  DateRangePickerComponent,
  type DateRange,
} from '../../shared/components/date-range-picker/date-range-picker.component';

export interface CommuneDatum { code: number; total: number; }

type MapMode = 'choropleth' | 'bubbles';

interface GeoFeatureCollection {
  type: string;
  features: Array<{ type: string; properties: Record<string, any>; geometry: any }>;
}

@Component({
  selector: 'app-commune-map',
  standalone: true,
  imports: [DateRangePickerComponent],
  template: `
    <div #mapEl style="width:100%;height:100%;"></div>
    <div #cardEl class="map-card"></div>

    <!-- Top-left control row: mode toggle · fullscreen · canal -->
    <div class="map-controls-row">
      <div class="map-mode-toggle">
        <button [class.active]="mapMode() === 'choropleth'" (click)="setMapMode('choropleth')" title="Choroplèthe">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 3h5v4H1zM1 8h5v3H1zM7 1h6v5H7zM7 7h6v4H7z" fill="currentColor" opacity=".85"/>
          </svg>
        </button>
        <button [class.active]="mapMode() === 'bubbles'" (click)="setMapMode('bubbles')" title="Bulles">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="4"  cy="10" r="3"   fill="currentColor" opacity=".5"/>
            <circle cx="10" cy="7"  r="4.5" fill="currentColor" opacity=".85"/>
            <circle cx="5"  cy="4"  r="2"   fill="currentColor" opacity=".65"/>
          </svg>
        </button>
      </div>

      <button class="map-fs-btn" (click)="toggleFullscreen()"
              [class.active]="isFullscreen()"
              [title]="isFullscreen() ? 'Quitter le plein écran' : 'Plein écran'">
        @if (isFullscreen()) {
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 1v3H1M8 1v3h3M8 11V8h3M4 11V8H1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        } @else {
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        }
      </button>

      @if (canalOptions().length) {
        <div class="map-canal-toggle">
          @for (opt of canalOptions(); track opt.value) {
            <button [class.active]="canal() === opt.value" (click)="canalChange.emit(opt.value)">
              {{ opt.label }}
            </button>
          }
        </div>
      }

      @if (periodes().length) {
        <app-date-range-picker
          [compact]="true"
          [periodes]="periodes()"
          [dateFrom]="dateFrom()"
          [dateTo]="dateTo()"
          (rangeChange)="rangeChange.emit($event)" />
      }
    </div>

    @if (activeCommuneCount() > 0) {
      <div class="map-legend">
        <div class="map-legend__scale">
          <span class="map-legend__val">0</span>
          <div class="map-legend__bar" [class.map-legend__bar--bubble]="mapMode() === 'bubbles'"></div>
          <span class="map-legend__val">{{ maxStr() }}</span>
        </div>
        <div class="map-legend__info">
          <span><strong>{{ activeCommuneCount() }}</strong> communes</span>
          <span class="map-legend__sep">·</span>
          <span>Total <strong>{{ totalStr() }}</strong></span>
        </div>
      </div>
    }

    @if (geoLoading()) {
      <div class="map-sk">Chargement de la carte…</div>
    } @else if (geoError()) {
      <div class="map-sk map-sk--err">Carte indisponible</div>
    }
  `,
  styles: [`
    :host { display:block; width:100%; height:100%; position:relative; overflow:hidden; }

    .map-card {
      position:absolute; top:0; left:0; z-index:500;
      width:210px;
      background:rgba(255,255,255,.94);
      border:1px solid rgba(226,232,240,.9);
      border-radius:14px; padding:12px 14px;
      box-shadow:0 8px 28px rgba(0,0,0,.11), 0 2px 6px rgba(0,0,0,.06);
      font-size:12px; pointer-events:none;
      opacity:0; transition:opacity .18s;
      &.visible { opacity:1; }
      &.fading   { opacity:0; }
    }

    .map-controls-row {
      position:absolute; top:10px; left:10px; z-index:500;
      display:flex; align-items:center; gap:6px;
    }

    .map-mode-toggle, .map-canal-toggle {
      display:flex; border-radius:8px; overflow:hidden;
      border:1px solid #e2e8f0;
      box-shadow:0 1px 4px rgba(0,0,0,.08);

      button {
        display:flex; align-items:center; justify-content:center;
        height:28px; padding:0 9px;
        background:rgba(255,255,255,.92);
        color:#64748b; border:none; cursor:pointer;
        font-size:11px; font-weight:600;
        transition:background .15s, color .15s;

        &:hover { background:#f1f5f9; color:#1e293b; }
        &.active { background:#2563eb; color:#fff; }
        &:not(:last-child) { border-right:1px solid #e2e8f0; }
      }
    }

    .map-mode-toggle button { width:30px; padding:0; }

    .map-legend {
      position:absolute; bottom:18px; right:10px; z-index:500;
      display:flex; flex-direction:column; gap:5px; pointer-events:none;
      background:rgba(255,255,255,.92); border:1px solid #e2e8f0;
      border-radius:10px; padding:8px 12px; min-width:170px;
      box-shadow:0 2px 8px rgba(0,0,0,.07);

      &__scale {
        display:flex; align-items:center; gap:7px;
      }

      &__bar {
        flex:1; height:6px; border-radius:3px;
        background:linear-gradient(90deg,#dbeafe,#1d4ed8);

        &--bubble {
          background:linear-gradient(90deg,
            rgba(37,99,235,.12) 0%,
            rgba(37,99,235,.72) 100%);
        }
      }

      &__val {
        white-space:nowrap; font-size:9px; font-weight:600;
        color:#475569; font-variant-numeric:tabular-nums;
      }

      &__info {
        display:flex; align-items:center; gap:5px;
        font-size:9px; color:#94a3b8;
        strong { color:#475569; font-weight:700; }
      }

      &__sep { opacity:0.4; }
    }

    .map-fs-btn {
      display:flex; align-items:center; justify-content:center;
      width:30px; height:28px;
      background:rgba(255,255,255,.92); color:#64748b;
      border:1px solid #e2e8f0; border-radius:8px; cursor:pointer;
      box-shadow:0 1px 4px rgba(0,0,0,.08);
      transition:background .15s, color .15s;

      &:hover { background:#f1f5f9; color:#1e293b; }
      &.active { background:#2563eb; color:#fff; border-color:#2563eb; }
    }

    :host:fullscreen { border-radius:0; }

    .map-sk {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      background:rgba(248,250,252,.88); color:#94a3b8; font-size:13px; z-index:600;
      &--err { color:#ef4444; }
    }
  `],
})
export class CommuneMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('cardEl') cardEl!: ElementRef<HTMLDivElement>;

  readonly data          = input<CommuneDatum[]>([]);
  readonly selectedCode  = input<number | null>(null);
  readonly canal         = input<string>('');
  readonly canalOptions  = input<{ value: string; label: string }[]>([]);
  readonly periodes      = input<string[]>([]);
  readonly dateFrom      = input<string>('');
  readonly dateTo        = input<string>('');
  readonly communeSelect = output<{ code: number; name: string } | null>();
  readonly canalChange   = output<string>();
  readonly rangeChange   = output<DateRange>();

  readonly geoLoading   = signal(true);
  readonly geoError     = signal(false);
  readonly maxStr       = signal('');
  readonly mapMode      = signal<MapMode>('choropleth');
  readonly isFullscreen = signal(false);

  readonly activeCommuneCount = computed(() => this.data().filter(d => d.total > 0).length);
  readonly totalStr = computed(() => {
    const total = this.data().reduce((s, d) => s + d.total, 0);
    return total ? this.styleService.fmtVal(total) : '—';
  });

  private readonly http           = inject(HttpClient);
  private readonly el             = inject(ElementRef<HTMLElement>);
  private readonly styleService   = inject(CommuneMapStyleService);
  private readonly tooltipService = inject(CommuneMapTooltipService);
  private geoData        = signal<GeoFeatureCollection | null>(null);
  private mapReady       = signal(false);
  private map: L.Map | null = null;
  private geoLayer: L.FeatureGroup | null = null;
  private top1Marker: L.Marker | null = null;
  private cleanupTimers: ReturnType<typeof setTimeout>[] = [];

  private top1Code: number | undefined;
  private boundsFitted = false;
  private lastCodeSet = '';

  setMapMode(m: MapMode): void { this.mapMode.set(m); }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.el.nativeElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    const isFull = !!document.fullscreenElement;
    this.isFullscreen.set(isFull);
    setTimeout(() => {
      this.map?.invalidateSize();
      if (this.geoLayer) {
        this.map?.fitBounds(this.geoLayer.getBounds(), { padding: [30, 30] });
      }
    }, 150);
  }

  constructor() {
    // Fetch GeoJSON only when the set of commune codes changes.
    // When only totals change (e.g. product filter), the code set stays the
    // same so we skip the fetch and let the second effect re-animate fills.
    effect(() => {
      const data = this.data();
      if (!this.mapReady() || !data.length) return;
      const codeSet = [...data.map(d => d.code)].sort((a, b) => a - b).join(',');
      if (codeSet === this.lastCodeSet) return;
      this.lastCodeSet = codeSet;
      this.geoLoading.set(true);
      this.geoError.set(false);
      this.geoData.set(null);
      this.boundsFitted = false;
      this.http.get<GeoFeatureCollection>(`/api/v1/geo/communes-geojson?codes=${codeSet}`).subscribe({
        next: geo => { this.geoData.set(geo); this.geoLoading.set(false); },
        error: () => { this.geoLoading.set(false); this.geoError.set(true); },
      });
    });

    // Re-render when geo data, data values, or map mode changes
    effect(() => {
      const geo  = this.geoData();
      const data = this.data();
      void this.mapMode(); // track mode changes
      if (!this.mapReady() || !geo) return;
      this.renderLayer(geo, data);
    });

    // Highlight selected commune
    effect(() => {
      const selCode = this.selectedCode();
      if (!this.geoLayer) return;
      this.geoLayer.eachLayer(layer => {
        const code   = this.layerCode(layer);
        const isTop1 = code === this.top1Code;
        const isSel  = code === selCode;
        if (this.mapMode() === 'bubbles') {
          (layer as L.CircleMarker).setStyle({
            weight: isSel ? 2.5 : 1,
            color:  isSel ? '#7c3aed' : '#fff',
          });
        } else {
          (layer as L.Path).setStyle({
            weight:    isSel || isTop1 ? 2.5 : 0.6,
            color:     isSel ? '#7c3aed' : isTop1 ? '#2563eb' : '#94a3b8',
            dashArray: isTop1 ? '6 4' : undefined,
          });
        }
      });
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement, {
      center: [36.6949, 3.9753], zoom: 9,
      zoomControl: false, attributionControl: false, zoomSnap: 0.5,
    });
    L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}?access_token=${environment.mapboxToken}`, {
      attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 22,
    }).addTo(this.map);
    this.mapReady.set(true);
  }

  ngOnDestroy(): void {
    this.cleanupTimers.forEach(clearTimeout);
    this.map?.remove(); this.map = null;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private showTooltip(e: L.LeafletMouseEvent, html: string): void {
    this.tooltipService.positionCard(this.cardEl, e.containerPoint.x, e.containerPoint.y, this.el.nativeElement.offsetWidth);
    this.tooltipService.showCard(this.cardEl, html);
  }

  private moveTooltip(e: L.LeafletMouseEvent): void {
    this.tooltipService.positionCard(this.cardEl, e.containerPoint.x, e.containerPoint.y, this.el.nativeElement.offsetWidth);
  }

  private layerCode(layer: L.Layer): number | undefined {
    const v = (layer as any).feature?.properties?.['code'] ?? (layer as any).communeCode;
    return v != null ? Number(v) : undefined;
  }

  private layerName(layer: L.Layer): string | undefined {
    return ((layer as any).feature?.properties?.['name'] ?? (layer as any).communeName) as string | undefined;
  }

  private findLayerByCode(code: number): L.Layer | undefined {
    let found: L.Layer | undefined;
    this.geoLayer?.eachLayer(l => { if (this.layerCode(l) === code) found = l; });
    return found;
  }

  // ── #1 marker ─────────────────────────────────────────────────────────────

  private placeTop1Pin(center: L.LatLng, name: string | undefined): void {
    this.top1Marker?.remove();
    this.top1Marker = null;
    if (!this.map) return;
    const icon = L.divIcon({
      html: `<div style="width:26px;height:26px;border-radius:50%;background:#0369a1;color:#fff;
              font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center;
              border:2.5px solid #fff;box-shadow:0 2px 8px rgba(3,105,161,.45);
              pointer-events:none">#1</div>`,
      className: '', iconSize: [26, 26] as any, iconAnchor: [13, 13] as any,
    });
    this.top1Marker = L.marker(center, { icon, interactive: false }).addTo(this.map);
  }

  // ── Choropleth fill animation ─────────────────────────────────────────────

  private animateFills(dataMap: Map<number, CommuneDatum>, maxTotal: number, rankMap: Map<number, number>): void {
    if (!this.geoLayer) return;
    const STAGGER = 140, DUR = 500;
    type E = { path: SVGPathElement; fill: string; rank: number };
    const top: E[] = [], rest: E[] = [];

    this.geoLayer.eachLayer(layer => {
      const code = this.layerCode(layer);
      const row  = code != null ? dataMap.get(code) : undefined;
      const path = (layer as any)._path as SVGPathElement | undefined;
      if (!path) return;
      const fill = row && row.total > 0 ? this.styleService.fillColor(row.total, maxTotal) : '#e2e8f0';
      const rank = code != null ? (rankMap.get(code) ?? 9999) : 9999;
      rank <= 6 ? top.push({ path, fill, rank }) : rest.push({ path, fill, rank });
    });

    rest.forEach(({ path, fill }) => { path.style.transitionDelay = '0ms'; path.style.fill = fill; });
    top.sort((a, b) => a.rank - b.rank).forEach(({ path, fill, rank }) => {
      path.style.transitionDelay = `${(rank - 1) * STAGGER}ms`;
      path.style.fill = fill;
    });

    const t = setTimeout(() => {
      this.geoLayer?.eachLayer(l => {
        const p = (l as any)._path as SVGPathElement | undefined;
        if (p) p.style.transitionDelay = '';
      });
    }, (top.length - 1) * STAGGER + DUR + 80);
    this.cleanupTimers.push(t);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private renderLayer(geo: GeoFeatureCollection, data: CommuneDatum[]): void {
    if (!this.map) return;
    this.cleanupTimers.forEach(clearTimeout);
    this.cleanupTimers = [];
    this.top1Marker?.remove();
    this.top1Marker = null;

    const dataMap  = new Map(data.map(d => [d.code, d]));
    const maxTotal = Math.max(...data.map(d => d.total), 1);
    const totalAll = data.reduce((s, d) => s + d.total, 0) || 1;
    const sorted   = [...dataMap.values()].filter(d => d.total > 0).sort((a, b) => b.total - a.total);
    const rankMap  = new Map<number, number>(sorted.map((d, i) => [d.code, i + 1]));
    this.top1Code  = sorted[0]?.code;

    this.maxStr.set(this.styleService.fmtVal(maxTotal));

    if (this.geoLayer) { this.geoLayer.remove(); this.geoLayer = null; }

    if (this.mapMode() === 'bubbles') {
      this.renderBubbles(geo, dataMap, maxTotal, totalAll, rankMap);
    } else {
      this.renderChoropleth(geo, dataMap, maxTotal, totalAll, rankMap);
    }

    if (!this.boundsFitted) {
      this.map.fitBounds(this.geoLayer!.getBounds(), { padding: [12, 12], animate: false });
      this.boundsFitted = true;
    }
  }

  // ── Choropleth mode ───────────────────────────────────────────────────────

  private renderChoropleth(
    geo: GeoFeatureCollection,
    dataMap: Map<number, CommuneDatum>,
    maxTotal: number,
    totalAll: number,
    rankMap: Map<number, number>,
  ): void {
    this.geoLayer = L.geoJSON(geo as any, {
      style: (feature?: any) => {
        const code   = feature?.properties?.['code'] != null ? Number(feature.properties['code']) : undefined;
        const isTop1 = code === this.top1Code;
        return {
          fillColor: '#eff6ff', fillOpacity: 0.85,
          color:  isTop1 ? '#2563eb' : '#94a3b8',
          weight: isTop1 ? 2.5 : 0.6,
          dashArray: isTop1 ? '6 4' : undefined,
        };
      },
      onEachFeature: (feature: any, layer: L.Layer) => {
        const code = feature.properties?.['code'] != null ? Number(feature.properties['code']) : undefined;
        const name = feature.properties?.['name'] as string | undefined;
        const row  = code != null ? dataMap.get(code) : undefined;
        const hasSales = row != null && row.total > 0;

        const baseStyle = () => {
          const isTop1 = code === this.top1Code;
          const isSel  = code === this.selectedCode();
          return {
            weight:    isSel || isTop1 ? 2.5 : 0.6,
            color:     isSel ? '#7c3aed' : isTop1 ? '#2563eb' : '#94a3b8',
            dashArray: isTop1 ? '6 4' : undefined,
          };
        };

        layer.on('mouseover', (e: L.LeafletMouseEvent) => {
          if (hasSales) (layer as L.Path).setStyle({ weight: 2, color: '#1d4ed8' });
          this.showTooltip(e, this.tooltipService.buildCard(name, row, totalAll, rankMap.get(code!)));
        });
        layer.on('mousemove', (e: L.LeafletMouseEvent) => { this.moveTooltip(e); });
        layer.on('mouseout', () => { (layer as L.Path).setStyle(baseStyle()); this.tooltipService.hideCard(this.cardEl); });
        layer.on('click', () => {
          if (code == null || !hasSales) return;
          this.communeSelect.emit(this.selectedCode() === code ? null : { code, name: name ?? '' });
        });
      },
    }) as unknown as L.FeatureGroup;

    this.geoLayer.addTo(this.map!);

    this.geoLayer.eachLayer(layer => {
      const path = (layer as any)._path as SVGPathElement | undefined;
      if (path) { path.style.fill = '#eff6ff'; path.style.transition = 'fill 0.5s ease'; }
    });

    this.animateFills(dataMap, maxTotal, rankMap);

    const top1Layer = this.findLayerByCode(this.top1Code!);
    if (top1Layer) {
      const center = (top1Layer as L.Polygon).getBounds().getCenter();
      const t = setTimeout(() => this.placeTop1Pin(center, this.layerName(top1Layer)), 80);
      this.cleanupTimers.push(t);
    }
  }

  // ── Bubble mode ───────────────────────────────────────────────────────────

  private renderBubbles(
    geo: GeoFeatureCollection,
    dataMap: Map<number, CommuneDatum>,
    maxTotal: number,
    totalAll: number,
    rankMap: Map<number, number>,
  ): void {
    const MAX_R = 38, MIN_R = 4;
    const group = L.featureGroup();

    for (const feature of geo.features) {
      const code = feature.properties?.['code'] != null ? Number(feature.properties['code']) : undefined;
      const name = feature.properties?.['name'] as string | undefined;
      const row  = code != null ? dataMap.get(code) : undefined;
      if (code == null) continue;

      const center = L.geoJSON(feature as any).getBounds().getCenter();
      const radius = row && row.total > 0
        ? MIN_R + Math.sqrt(row.total / maxTotal) * (MAX_R - MIN_R)
        : MIN_R * 0.5;
      const rank   = rankMap.get(code);
      const alpha  = row && row.total > 0 ? 0.25 + Math.sqrt(row.total / maxTotal) * 0.55 : 0.12;

      const marker = L.circleMarker(center, {
        radius,
        fillColor:   '#2563eb',
        fillOpacity: alpha,
        color:       '#fff',
        weight:      1,
      });

      (marker as any).communeCode = code;
      (marker as any).communeName = name;

      const hasSales = row != null && row.total > 0;

      marker.on('mouseover', (e: L.LeafletMouseEvent) => {
        if (hasSales) marker.setStyle({ color: '#1d4ed8', weight: 2 });
        this.showTooltip(e, this.tooltipService.buildCard(name, row, totalAll, rank));
      });
      marker.on('mousemove', (e: L.LeafletMouseEvent) => { this.moveTooltip(e); });
      marker.on('mouseout', () => {
        const isSel = code === this.selectedCode();
        marker.setStyle({ color: isSel ? '#7c3aed' : '#fff', weight: isSel ? 2.5 : 1 });
        this.tooltipService.hideCard(this.cardEl);
      });
      marker.on('click', () => {
        if (!hasSales) return;
        this.communeSelect.emit(this.selectedCode() === code ? null : { code, name: name ?? '' });
      });

      group.addLayer(marker);
    }

    this.geoLayer = group;
    group.addTo(this.map!);

    // Pin #1 bubble
    const top1Layer = this.findLayerByCode(this.top1Code!);
    if (top1Layer) {
      const center = (top1Layer as L.CircleMarker).getLatLng();
      const t = setTimeout(() => this.placeTop1Pin(center, this.layerName(top1Layer)), 80);
      this.cleanupTimers.push(t);
    }
  }
}

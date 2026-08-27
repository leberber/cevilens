import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrevendeurService, PrevFacturation, PrevClient, PrevObjectifItem } from '../../core/services/prevendeur.service';
import { AuthService } from '../../core/services/auth.service';
import { FormatService } from '../../core/services/format.service';
import { LoadingManager } from '../../core/services/loading-manager.service';
import { PeriodService } from '../../core/services/period.service';
import { toggleInSet, isInSet } from '../../core/utils/set-toggle.util';
import { groupBy, calculatePercentage } from '../../core/utils/data-transform.util';

@Component({
  selector: 'app-prevendeur',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prevendeur.component.html',
  styleUrl: './prevendeur.component.scss',
})
export class PrevendeurComponent implements OnInit {
  private svc = inject(PrevendeurService);
  private format = inject(FormatService);
  private loadingManager = inject(LoadingManager);
  private period = inject(PeriodService);
  auth = inject(AuthService);

  periodes: string[] = [];
  selectedMois = '';
  loading = signal(false);
  data: PrevFacturation | null = null;
  activeTab: 'tournees' | 'clients' | 'objectifs' | 'menu' = 'tournees';
  expandedClients = new Set<string>();
  objectifs: PrevObjectifItem[] = [];
  loadingObjectifs = signal(false);
  collapsedFamilles = new Set<string>();
  editingKey: string | null = null;
  editingValue = '';
  savingKey: string | null = null;

  get userName(): string { return this.auth.currentUser()?.full_name ?? ''; }

  ngOnInit() {
    this.svc.getPeriodes().subscribe(p => {
      this.periodes = p;
      if (p.length) {
        this.selectedMois = p[0];
        this.load();
      }
    });
  }

  load() {
    if (!this.selectedMois) return;
    this.data = null;
    this.expandedClients.clear();
    this.loadingManager.load(
      this.loading,
      this.svc.getFacturation(this.selectedMois),
      d => { this.data = d; }
    );
    this.loadObjectifs();
  }

  loadObjectifs() {
    if (!this.selectedMois) return;
    this.loadingManager.load(
      this.loadingObjectifs,
      this.svc.getObjectifs(this.selectedMois),
      d => {
        this.objectifs = d;
        this.collapsedFamilles = new Set(d.map(o => o.famille || 'autre'));
      }
    );
  }

  prevPeriod() {
    const prev = this.period.getPrevious(this.periodes, this.selectedMois);
    if (prev) { this.selectedMois = prev; this.load(); }
  }

  nextPeriod() {
    const next = this.period.getNext(this.periodes, this.selectedMois);
    if (next) { this.selectedMois = next; this.load(); }
  }

  get canGoPrev(): boolean { return this.period.canGoPrevious(this.periodes, this.selectedMois); }
  get canGoNext(): boolean { return this.period.canGoNext(this.periodes, this.selectedMois); }

  toggleClient(key: string) {
    toggleInSet(this.expandedClients, key);
  }

  isExpanded(key: string): boolean { return this.expandedClients.has(key); }

  formatPeriod(p: string): string {
    return this.period.format(p);
  }

  get totalMontant(): number {
    if (!this.data) return 0;
    return this.data.routes.flatMap(r => r.clients).reduce((s, c) => {
      return s + Object.entries(c.totaux).reduce((cs, [prod, qty]) => {
        if (!qty) return cs;
        const prix = this.data!.products_meta[prod]?.prix ?? 0;
        return cs + qty * prix;
      }, 0);
    }, 0);
  }

  clientMontant(client: PrevClient): number {
    if (!this.data) return 0;
    return Object.entries(client.totaux).reduce<number>((s, [prod, qty]) => {
      if (!qty) return s;
      const prix = this.data!.products_meta[prod]?.prix ?? 0;
      return s + qty * prix;
    }, 0);
  }

  formatMontant(n: number): string {
    return this.format.formatMontant(n);
  }

  val(v: number | null): string {
    return this.format.emptyIfNull(v);
  }

  familleClass(p: string): string {
    const f = this.data?.products_meta[p]?.famille;
    if (f === 'huile') return 'col--huile';
    if (f === 'sucre') return 'col--sucre';
    return '';
  }

  clientFamilies(client: PrevClient): string[] {
    if (!this.data) return [];
    const fams = new Set<string>();
    for (const [prod, qty] of Object.entries(client.totaux)) {
      if (qty && qty > 0) {
        const f = this.data.products_meta[prod]?.famille;
        if (f) fams.add(f);
      }
    }
    return Array.from(fams);
  }

  get allClients(): PrevClient[] {
    if (!this.data) return [];
    return this.data.routes.flatMap(r => r.clients)
      .sort((a, b) => a.nom_client.localeCompare(b.nom_client, 'fr'));
  }

  clientKey(route: string, client: PrevClient): string {
    return route + '|' + client.nom_client;
  }

  startEdit(route: string, client: PrevClient, event: Event) {
    event.stopPropagation();
    this.editingKey = this.clientKey(route, client);
    this.editingValue = client.nom_sodichn ?? '';
    setTimeout(() => {
      const el = document.querySelector('.pv-rc-input') as HTMLInputElement;
      if (el) el.focus();
    }, 30);
  }

  saveEdit(client: PrevClient, event: Event) {
    event.stopPropagation();
    if (!this.editingKey || !client.code_client) { this.editingKey = null; return; }
    const value = this.editingValue.trim();
    const key = this.editingKey;
    this.editingKey = null;
    this.savingKey = key;
    this.svc.updateNomSodichn(client.code_client, value, client.nom_client).subscribe({
      next: () => {
        client.nom_sodichn = value || null;
        this.savingKey = null;
      },
      error: () => { this.savingKey = null; },
    });
  }

  cancelEdit(event: Event) {
    event.stopPropagation();
    this.editingKey = null;
  }

  get objectifsByFamille(): { famille: string; items: PrevObjectifItem[]; pct: number }[] {
    const map = groupBy(this.objectifs, o => o.famille || 'autre');
    return Array.from(map.entries())
      .map(([famille, items]) => {
        const totalActual = items.reduce((s, o) => s + o.actual, 0);
        const totalObj = items.reduce((s, o) => s + o.objectif, 0);
        const pct = calculatePercentage(totalActual, totalObj);
        return { famille, items, pct };
      })
      .sort((a, b) => a.pct - b.pct);
  }

  toggleFamille(famille: string) {
    toggleInSet(this.collapsedFamilles, famille);
  }

  readonly skeletonRows = Array(6).fill(0);
}

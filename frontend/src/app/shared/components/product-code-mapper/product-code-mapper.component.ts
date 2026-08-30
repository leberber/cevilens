import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../../core/services/notification.service';

interface ProduitHit {
  code_produit: string;
  nom_produit: string | null;
  description_produit: string | null;
  famille: string | null;
}

interface MapperRow {
  code: string;
  query: string;
  hits: ProduitHit[];
  selected: ProduitHit | null;
  saving: boolean;
  done: boolean;
}

@Component({
  selector: 'app-product-code-mapper',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="code-mapper">
      <div class="code-mapper__header">
        <i class="pi pi-exclamation-triangle code-mapper__header-icon"></i>
        <div class="code-mapper__header-body">
          <div class="code-mapper__header-title">Codes produits non reconnus</div>
          <div class="code-mapper__header-sub">
            {{ pendingCount() }} code(s) introuvable(s) dans le catalogue — associez chacun à un produit
          </div>
        </div>
        <button class="btn-secondary" type="button" (click)="dismissed.emit()">
          <i class="pi pi-times"></i> Ignorer
        </button>
      </div>

      @for (row of rows(); track row.code) {
        <div class="code-mapper__row" [class.code-mapper__row--done]="row.done">
          @if (row.done) {
            <i class="pi pi-check-circle code-mapper__done-icon"></i>
            <span class="code-mapper__code">{{ row.code }}</span>
            <span class="code-mapper__linked-to">→ {{ row.selected!.code_produit }}</span>
          } @else {
            <span class="code-mapper__code">{{ row.code }}</span>
            <div class="code-mapper__search-wrap">
              <input
                class="code-mapper__input"
                type="text"
                placeholder="Rechercher dans le catalogue…"
                [(ngModel)]="row.query"
                (ngModelChange)="onSearch(row)"
                autocomplete="off"
              />
              @if (row.hits.length > 0) {
                <div class="code-mapper__dropdown">
                  @for (hit of row.hits; track hit.code_produit) {
                    <button class="code-mapper__hit" type="button" (click)="select(row, hit)">
                      <span class="code-mapper__hit-code">{{ hit.code_produit }}</span>
                      <span class="code-mapper__hit-name">
                        {{ hit.nom_produit || hit.description_produit || '—' }}
                      </span>
                    </button>
                  }
                </div>
              }
            </div>
            <button class="btn-secondary" type="button"
                    [disabled]="!row.selected || row.saving"
                    (click)="link(row)">
              @if (row.saving) {
                <i class="pi pi-spin pi-spinner"></i>
              } @else {
                <i class="pi pi-link"></i> Lier
              }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ProductCodeMapperComponent implements OnChanges {
  private readonly http   = inject(HttpClient);
  private readonly notify = inject(NotificationService);

  @Input() codes: string[] = [];
  @Output() allResolved = new EventEmitter<void>();
  @Output() dismissed   = new EventEmitter<void>();

  readonly rows         = signal<MapperRow[]>([]);
  readonly pendingCount = signal(0);

  private readonly _timers = new Map<string, ReturnType<typeof setTimeout>>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['codes']) {
      const rows = this.codes.map(code => ({
        code, query: '', hits: [], selected: null, saving: false, done: false,
      }));
      this.rows.set(rows);
      this.pendingCount.set(rows.length);
    }
  }

  onSearch(row: MapperRow): void {
    row.selected = null;
    row.hits = [];
    if (this._timers.has(row.code)) clearTimeout(this._timers.get(row.code)!);
    if (!row.query.trim()) { this.rows.update(r => [...r]); return; }
    const timer = setTimeout(() => {
      this.http
        .get<{ items: ProduitHit[] }>(`/api/v1/produits?search=${encodeURIComponent(row.query)}&per_page=8`)
        .subscribe(res => {
          row.hits = res.items;
          this.rows.update(r => [...r]);
        });
    }, 300);
    this._timers.set(row.code, timer);
  }

  select(row: MapperRow, hit: ProduitHit): void {
    row.selected = hit;
    row.query    = `${hit.code_produit} — ${hit.nom_produit || hit.description_produit || ''}`;
    row.hits     = [];
    this.rows.update(r => [...r]);
  }

  link(row: MapperRow): void {
    if (!row.selected) return;
    row.saving = true;
    this.rows.update(r => [...r]);

    this.http
      .patch(`/api/v1/produits/${encodeURIComponent(row.selected.code_produit)}`, { code_dd: row.code })
      .subscribe({
        next: () => {
          row.saving = false;
          row.done   = true;
          this.rows.update(r => [...r]);
          this.pendingCount.update(n => n - 1);
          this.notify.success(`Code "${row.code}" associé à ${row.selected!.code_produit}`);
          if (this.pendingCount() === 0) this.allResolved.emit();
        },
        error: err => {
          row.saving = false;
          this.rows.update(r => [...r]);
          this.notify.showHttpError(err);
        },
      });
  }
}

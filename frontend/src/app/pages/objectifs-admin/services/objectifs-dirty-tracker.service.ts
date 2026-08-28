import { Injectable } from '@angular/core';

export interface ObjectifRow {
  code_produit: string;
  _tonne?: number | null;
  _packs?: number | null;
  _packs_tournee?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class ObjectifsDirtyTrackerService {
  private snapshot = new Map<string, { tonne: number | null; packs: number | null; packs_tournee: number | null }>();

  isDirtyRow(row: ObjectifRow): boolean {
    const snap = this.snapshot.get(row.code_produit);
    return row._tonne !== (snap?.tonne ?? null) ||
           row._packs !== (snap?.packs ?? null) ||
           row._packs_tournee !== (snap?.packs_tournee ?? null);
  }

  getDirtyCount(rows: ObjectifRow[]): number {
    return rows.filter(r => this.isDirtyRow(r)).length;
  }

  captureSnapshot(rows: ObjectifRow[]): void {
    this.snapshot.clear();
    for (const r of rows) {
      this.snapshot.set(r.code_produit, {
        tonne: r._tonne ?? null,
        packs: r._packs ?? null,
        packs_tournee: r._packs_tournee ?? null,
      });
    }
  }

  clearSnapshot(): void {
    this.snapshot.clear();
  }
}

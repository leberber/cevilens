export interface ColDef<T = any> {
  field: keyof T | string;
  header: string;
  width?: string;
  visible: boolean;
  sortable?: boolean;
  filterable?: boolean;
}

export const TABLE_BATCH_SIZE = 100;

export class TableConfig {
  static getStorageKey(pageName: string): string {
    return `cevital_${pageName}_columns`;
  }

  static saveColumnState(pageName: string, columns: ColDef[]): void {
    localStorage.setItem(this.getStorageKey(pageName), JSON.stringify(columns));
  }

  static loadColumnState(pageName: string, defaultColumns: ColDef[]): ColDef[] {
    const saved = localStorage.getItem(this.getStorageKey(pageName));
    return saved ? JSON.parse(saved) : defaultColumns;
  }

  static isColumnVisible(columns: ColDef[], field: string): boolean {
    return columns.find(c => c.field === field)?.visible ?? true;
  }

  static toggleColumnVisibility(columns: ColDef[], field: string): ColDef[] {
    return columns.map(c =>
      c.field === field ? { ...c, visible: !c.visible } : c
    );
  }
}

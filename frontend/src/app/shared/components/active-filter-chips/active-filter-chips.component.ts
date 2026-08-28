import { Component, Input, Output, EventEmitter } from '@angular/core';

/**
 * Reusable active filter chips display component
 * Shows a list of applied filters with remove buttons and a clear all option.
 * Used by any table or list component with column-level filtering.
 */
@Component({
  selector: 'app-active-filter-chips',
  standalone: true,
  imports: [],
  template: `
    @if (chips.length > 0) {
      <div class="active-filters">
        @for (chip of chips; track chip.field) {
          <span class="active-filter-chip">
            <span class="active-filter-chip__label">{{ chip.label }}</span>
            <span class="active-filter-chip__sep">:</span>
            <span class="active-filter-chip__value">{{ chip.value }}</span>
            <button class="active-filter-chip__remove" (click)="onRemove(chip.field)" title="Supprimer ce filtre">
              <i class="pi pi-times"></i>
            </button>
          </span>
        }
        <button class="active-filters-clear" (click)="onClearAll()" title="Effacer tous les filtres">
          <i class="pi pi-times"></i> Tout effacer
        </button>
      </div>
    }
  `,
  styles: [`
    .active-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      padding: 0.75rem;
      background: var(--surface-100);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
    }

    .active-filter-chip {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.4rem 0.7rem;
      background: var(--primary-color);
      color: #fff;
      border-radius: 6px;
      font-weight: 500;
      white-space: nowrap;
    }

    .active-filter-chip__label {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.05em;
    }

    .active-filter-chip__sep {
      opacity: 0.7;
    }

    .active-filter-chip__value {
      font-weight: 500;
    }

    .active-filter-chip__remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 0;
      margin-left: 0.3rem;
      background: rgba(255, 255, 255, 0.25);
      border: none;
      border-radius: 3px;
      color: #fff;
      cursor: pointer;
      transition: background 0.15s;

      &:hover {
        background: rgba(255, 255, 255, 0.4);
      }

      i {
        font-size: 0.5rem;
      }
    }

    .active-filters-clear {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 6px;
      color: var(--color-error);
      font-size: var(--font-size-xs);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;

      &:hover {
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.5);
      }

      i {
        font-size: 0.6rem;
      }
    }
  `],
})
export class ActiveFilterChipsComponent {
  @Input() chips: { field: string; label: string; value: string }[] = [];
  @Output() remove = new EventEmitter<string>();
  @Output() clearAll = new EventEmitter<void>();

  onRemove(field: string): void {
    this.remove.emit(field);
  }

  onClearAll(): void {
    this.clearAll.emit();
  }
}

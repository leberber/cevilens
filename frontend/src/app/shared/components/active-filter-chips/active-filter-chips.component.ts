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
      gap: 0.6rem;
      align-items: center;
      font-size: var(--font-size-sm);
    }

    .active-filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.9rem;
      background: linear-gradient(135deg, #FFE082 0%, rgba(255, 224, 130, 0.85) 100%);
      color: #1a1a2e;
      border-radius: 8px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(255, 224, 130, 0.25);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        box-shadow: 0 4px 12px rgba(255, 224, 130, 0.35);
        transform: translateY(-1px);
      }
    }

    .active-filter-chip__label {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.65rem;
      letter-spacing: 0.06em;
      opacity: 0.9;
    }

    .active-filter-chip__sep {
      opacity: 0.6;
      font-weight: 300;
    }

    .active-filter-chip__value {
      font-weight: 600;
      font-size: 0.9rem;
    }

    .active-filter-chip__remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      margin-left: 0.2rem;
      background: rgba(26, 26, 46, 0.2);
      border: none;
      border-radius: 4px;
      color: #1a1a2e;
      cursor: pointer;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;

      &:hover {
        background: rgba(26, 26, 46, 0.35);
        transform: scale(1.1);
      }

      &:active {
        transform: scale(0.95);
      }

      i {
        font-size: 0.55rem;
      }
    }

    .active-filters-clear {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.9rem;
      background: rgba(239, 68, 68, 0.08);
      border: 1.5px solid rgba(239, 68, 68, 0.25);
      border-radius: 8px;
      color: #dc3545;
      font-size: var(--font-size-xs);
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.04em;

      &:hover {
        background: rgba(239, 68, 68, 0.12);
        border-color: rgba(239, 68, 68, 0.4);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
      }

      &:active {
        transform: translateY(0);
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

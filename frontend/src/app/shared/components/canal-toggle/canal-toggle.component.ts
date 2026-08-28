import { Component, Input, Output, EventEmitter } from '@angular/core';

/**
 * Reusable VD/VH canal toggle component
 * Unified control for switching between Direct (VD) and Horeca (VH) sales channels.
 * Eliminates redundant implementations across dashboard, objectifs-admin, and analytics.
 */
@Component({
  selector: 'app-canal-toggle',
  standalone: true,
  imports: [],
  template: `
    <div class="seg-control seg-control--glass seg-control--rounded">
      <button
        class="seg-btn"
        [class.seg-btn--active]="canal === 'VD'"
        [disabled]="disabled"
        (click)="onToggle('VD')"
        title="Vente Direct"
      >Direct (VD)</button>
      <button
        class="seg-btn"
        [class.seg-btn--active]="canal === 'VH'"
        [disabled]="disabled"
        (click)="onToggle('VH')"
        title="Vente Horeca"
      >Horeca (VH)</button>
    </div>
  `,
})
export class CanalToggleComponent {
  @Input() canal: 'VD' | 'VH' = 'VD';
  @Input() disabled: boolean = false;
  @Output() canalChange = new EventEmitter<'VD' | 'VH'>();

  onToggle(newCanal: 'VD' | 'VH'): void {
    if (newCanal !== this.canal) {
      this.canalChange.emit(newCanal);
    }
  }
}

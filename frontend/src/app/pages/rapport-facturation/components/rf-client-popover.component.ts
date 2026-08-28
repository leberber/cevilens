import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Popover } from 'primeng/popover';

@Component({
  selector: 'app-rf-client-popover',
  standalone: true,
  imports: [FormsModule, Popover],
  template: `
    <button class="rf-clients-pill"
      [class.rf-clients-pill--loading]="loading"
      (click)="!loading && popover.toggle($event)">
      @if (loading) {
        <i class="pi pi-spinner pi-spin"></i>
        <span>Chargement…</span>
      } @else {
        <i class="pi pi-users"></i>
        <span>{{ selectedCount }}<span class="rf-pill-sep">/{{ totalCount }}</span></span>
      }
    </button>

    <p-popover #popover>
      <div class="rf-pop">
        <div class="rf-pop__head">
          <span class="rf-pop__title">Clients</span>
          <div class="rf-pop__actions">
            <button class="btn-text" (click)="selectAll.emit()">Tous</button>
            <span class="rf-pop__dot">·</span>
            <button class="btn-text" (click)="deselectAll.emit()">Aucun</button>
          </div>
        </div>
        <div class="table-search rf-pop-search">
          <div class="search-icon"><i class="pi pi-search"></i></div>
          <input [(ngModel)]="searchTerm" placeholder="Rechercher un client…" (change)="searchChange.emit(searchTerm)" />
        </div>
        <div class="rf-pop__list">
          @for (c of filteredClients; track c) {
            <div class="rf-client-item"
              [class.rf-client-item--on]="isSelected(c)"
              (click)="toggle.emit(c)">
              <span class="rf-avatar">{{ initials(c) }}</span>
              <span class="rf-client-name">{{ c }}</span>
              @if (isSelected(c)) {
                <span class="rf-check"><i class="pi pi-check"></i></span>
              }
            </div>
          }
          @if (filteredClients.length === 0) {
            <p class="rf-no-results">Aucun résultat</p>
          }
        </div>
      </div>
    </p-popover>
  `,
})
export class RfClientPopoverComponent {
  @Input() loading: boolean = false;
  @Input() allClients: string[] = [];
  @Input() selectedClients: Set<string> = new Set();
  @Input() filteredClients: string[] = [];
  @Input() searchTerm: string = '';

  @Output() searchChange = new EventEmitter<string>();
  @Output() toggle = new EventEmitter<string>();
  @Output() selectAll = new EventEmitter<void>();
  @Output() deselectAll = new EventEmitter<void>();

  @ViewChild('popover') popover: any;

  get selectedCount(): number {
    return this.selectedClients.size;
  }

  get totalCount(): number {
    return this.allClients.length;
  }

  isSelected(client: string): boolean {
    return this.selectedClients.has(client);
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}

import { Component, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

/**
 * Reusable table state component
 * Consolidates loading/empty/content patterns for tables
 */
@Component({
  selector: 'app-table-state',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent, EmptyStateComponent],
  template: `
    @if (loading) {
      <app-skeleton-loader [rows]="5" [columns]="6"></app-skeleton-loader>
    } @else if (!items || items.length === 0) {
      <app-empty-state
        icon="pi-inbox"
        [message]="emptyMessage"
        [subMessage]="emptySubMessage">
      </app-empty-state>
    } @else {
      <ng-container *ngTemplateOutlet="content"></ng-container>
    }
  `,
})
export class TableStateComponent {
  @Input() loading: boolean = false;
  @Input() items: any[] = [];
  @Input() emptyMessage: string = 'No items found';
  @Input() emptySubMessage?: string;
  @Input() content?: TemplateRef<any>;
}

import { Component, Input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

/**
 * Reusable page layout component
 * Eliminates repetitive page structure HTML (header + toolbar + content)
 *
 * Usage:
 * ```html
 * <app-page-layout
 *   icon="pi-chart-line"
 *   title="Sales"
 *   subtitle="View sales data"
 *   [actions]="actionsTemplate"
 *   [toolbar]="toolbarTemplate">
 *   <ng-template #content>
 *     Your page content here
 *   </ng-template>
 * </app-page-layout>
 *
 * <ng-template #actionsTemplate>
 *   Optional header actions
 * </ng-template>
 *
 * <ng-template #toolbarTemplate>
 *   Optional toolbar content
 * </ng-template>
 * ```
 */
@Component({
  selector: 'app-page-layout',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header__left">
        @if (icon) {
          <div class="page-icon"><i [class]="'pi ' + icon"></i></div>
        }
        <div>
          <h1 class="page-header__title">{{ title }}</h1>
          @if (subtitle) {
            <p class="page-header__sub">{{ subtitle }}</p>
          }
          @if (context) {
            <div class="page-header__context">
              <ng-container [ngTemplateOutlet]="context"></ng-container>
            </div>
          }
        </div>
      </div>
      @if (actions) {
        <div class="page-header__actions">
          <ng-container [ngTemplateOutlet]="actions"></ng-container>
        </div>
      }
    </div>

    <!-- Content container -->
    <div class="table-container" [class.table-container--no-toolbar]="!toolbar">
      @if (toolbar) {
        <div class="prod-toolbar">
          <ng-container [ngTemplateOutlet]="toolbar"></ng-container>
        </div>
      }

      <div class="table-wrapper">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
      margin-bottom: var(--space-6);
    }

    .page-header__left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .page-icon {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: var(--radius-lg);
      background: var(--primary-100);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 1.25rem;
      color: var(--primary-color);
    }

    .page-header__title {
      margin: 0;
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--text-color);
    }

    .page-header__sub {
      margin: 0.15rem 0 0;
      font-size: var(--font-size-sm);
      color: var(--text-color-secondary);
    }

    .page-header__context {
      margin-top: 0.3rem;
    }

    .page-header__actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .prod-toolbar {
      padding: 0.75rem 1.5rem;
      border-bottom: 1px solid var(--surface-border);
    }
  `],
})
export class PageLayoutComponent {
  @Input() icon: string | null = null;
  @Input() title: string = '';
  @Input() subtitle: string | null = null;
  @Input() actions: TemplateRef<any> | null = null;
  @Input() toolbar: TemplateRef<any> | null = null;
  @Input() context: TemplateRef<any> | null = null;
}

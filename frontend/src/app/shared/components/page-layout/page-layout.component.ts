import { Component, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule],
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
      gap: 20px;
      padding: 24px;
      background: white;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 24px;
    }

    .page-header__left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .page-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      border-radius: 8px;
      font-size: 24px;
      color: #6b7280;
    }

    .page-header__title {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #111827;
    }

    .page-header__sub {
      margin: 4px 0 0 0;
      font-size: 14px;
      color: #6b7280;
    }

    .page-header__actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .table-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }

    .table-container--no-toolbar {
      border: 1px solid #e5e7eb;
    }

    .prod-toolbar {
      padding: 16px 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .table-wrapper {
      overflow: auto;
    }
  `],
})
export class PageLayoutComponent {
  @Input() icon: string | null = null;
  @Input() title: string = '';
  @Input() subtitle: string | null = null;
  @Input() actions: TemplateRef<any> | null = null;
  @Input() toolbar: TemplateRef<any> | null = null;
}

import { Component, Input } from '@angular/core';

/**
 * Reusable empty state component
 * Consolidates repeated empty state UI patterns across components
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  template: `
    <div class="empty-state-wrapper">
      @if (loading) {
        <div class="skeleton-wrapper">
          <div class="skeleton skeleton--circle"></div>
          <div class="skeleton skeleton--line"></div>
          <div class="skeleton skeleton--line skeleton--short"></div>
        </div>
      } @else {
        <div class="empty-state">
          @if (icon) {
            <i [class]="'pi ' + icon"></i>
          }
          <p class="message">{{ message }}</p>
          @if (subMessage) {
            <p class="sub-message">{{ subMessage }}</p>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .empty-state-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem 1rem;
      min-height: 200px;
    }

    .empty-state {
      text-align: center;
      color: #64748b;
    }

    .empty-state i {
      font-size: 3rem;
      color: #cbd5e1;
      margin-bottom: 1rem;
      display: block;
    }

    .empty-state .message {
      font-size: 1rem;
      font-weight: 500;
      margin: 0.5rem 0;
      color: #475569;
    }

    .empty-state .sub-message {
      font-size: 0.875rem;
      margin: 0.5rem 0 0;
      color: #94a3b8;
    }

    .skeleton-wrapper {
      width: 100%;
      max-width: 300px;
    }

    .skeleton {
      display: block;
      height: 16px;
      background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
      margin: 0.5rem 0;
    }

    .skeleton--circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      margin: 0 auto 1rem;
    }

    .skeleton--short {
      width: 60%;
      margin-left: auto;
      margin-right: auto;
    }

  `]
})
export class EmptyStateComponent {
  @Input() icon?: string;
  @Input() message: string = 'No items found';
  @Input() subMessage?: string;
  @Input() loading: boolean = false;
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-rows">
      @for (row of rowsArray; track $index; let i = $index) {
        <div class="skeleton-row" [style.animation-delay]="(i * 60) + 'ms'">
          @for (col of columnsArray; track $index; let j = $index) {
            <div class="skeleton-cell"
                 [style.width]="widths ? widths[($index + j) % widths.length] : '70%'"></div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-row {
      display: flex;
      gap: 12px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton-cell {
      height: 20px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
      border-radius: 4px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `],
})
export class SkeletonLoaderComponent {
  @Input() rows = 6;
  @Input() columns = 5;
  @Input() widths: string[] | undefined;

  get rowsArray(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }

  get columnsArray(): number[] {
    return Array.from({ length: this.columns }, (_, i) => i);
  }
}

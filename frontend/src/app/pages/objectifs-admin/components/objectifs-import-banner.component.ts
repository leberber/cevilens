import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-objectifs-import-banner',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './objectifs-import-banner.component.scss',
  template: `
    @if (importResult) {
      <div class="obj-import-banner" [class.obj-import-banner--warn]="importResult.notFound.length > 0">
        <div class="obj-import-banner__top">
          <i class="pi pi-check-circle"></i>
          <span class="obj-import-banner__msg">
            <strong>{{ importResult.imported }}</strong> produit(s) importé(s)
            @if (importResult.notFound.length > 0) {
              &nbsp;—&nbsp;<strong>{{ importResult.notFound.length }}</strong> non trouvé(s)
              <button class="obj-import-detail-toggle" (click)="showDetailChange.emit(!showDetail)">
                {{ showDetail ? 'masquer' : 'voir détail' }}
                <i class="pi" [class.pi-chevron-down]="!showDetail" [class.pi-chevron-up]="showDetail"></i>
              </button>
            }
          </span>
          <button class="obj-import-close" (click)="dismiss.emit()">
            <i class="pi pi-times"></i>
          </button>
        </div>
        @if (showDetail && importResult.notFound.length > 0) {
          <ul class="obj-import-not-found-list">
            @for (name of importResult.notFound; track name) {
              <li>{{ name }}</li>
            }
          </ul>
        }
      </div>
    }
  `,
})
export class ObjectifsImportBannerComponent {
  @Input() importResult: { imported: number; notFound: string[] } | null = null;
  @Input() showDetail: boolean = false;
  @Output() showDetailChange = new EventEmitter<boolean>();
  @Output() dismiss = new EventEmitter<void>();
}

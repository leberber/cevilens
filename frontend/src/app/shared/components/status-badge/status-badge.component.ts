import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [],
  template: `
    <span [class]="isActive ? activeClass : inactiveClass">
      {{ isActive ? activeLabel : inactiveLabel }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input() isActive: boolean = false;
  @Input() activeLabel: string = 'Actif';
  @Input() inactiveLabel: string = 'Inactif';
  @Input() activeClass: string = 'badge badge--success';
  @Input() inactiveClass: string = 'badge badge--danger';
}

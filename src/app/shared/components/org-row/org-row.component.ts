import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ElementSizeDirective } from '../../directives/element-size.directive';
import { ApiOrganization } from '../../../core/services/organization.service';

@Component({
  selector: 'app-org-row',
  imports: [ButtonModule, ElementSizeDirective],
  template: `
    <div class="row" [appElementSize]="{ compact: 600 }" (click)="select.emit(org())">
      <span class="row-ref">{{ org().external_reference || '—' }}</span>
      <div class="row-main">
        <div class="row-logo">{{ initials() }}</div>
        <span class="row-name">{{ org().name }}</span>
      </div>
      <div class="row-meta">
        <span class="row-status" [class.is-active]="org().status === 1">
          <span class="row-status__dot"></span>
          <span class="row-status__label">{{ org().status_label }}</span>
        </span>
        <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" (onClick)="$event.stopPropagation()" />
      </div>
    </div>
  `,
  styleUrl: './org-row.component.scss',
})
export class OrgRowComponent {
  org = input.required<ApiOrganization>();
  select = output<ApiOrganization>();

  initials(): string {
    return this.org().name.slice(0, 2).toUpperCase();
  }
}

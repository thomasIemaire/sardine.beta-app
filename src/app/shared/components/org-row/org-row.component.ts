import { Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ElementSizeDirective } from '../../directives/element-size.directive';

export interface Organization {
  id: string;
  name: string;
  initials: string;
  type: string;
  membersCount: number;
  active: boolean;
}

@Component({
  selector: 'app-org-row',
  imports: [ButtonModule, ElementSizeDirective],
  template: `
    <div class="row" [appElementSize]="{ compact: 600 }">
      <div class="row-main">
        <div class="row-logo">{{ org().initials }}</div>
        <span class="row-name">{{ org().name }}</span>
      </div>
      <div class="row-meta">
        <span class="row-type">{{ org().type }}</span>
        <span class="row-count"><i class="fa-regular fa-user"></i> {{ org().membersCount }}</span>
        <span class="row-status" [class.is-active]="org().active">
          <span class="row-status__dot"></span>
          <span class="row-status__label">{{ org().active ? 'Active' : 'Inactive' }}</span>
        </span>
        <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" />
      </div>
    </div>
  `,
  styleUrl: './org-row.component.scss',
})
export class OrgRowComponent {
  org = input.required<Organization>();
}

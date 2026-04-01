import { Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ElementSizeDirective } from '../../directives/element-size.directive';
import { UserAvatarComponent } from '../user-avatar/user-avatar.component';

export interface Member {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: 1 | 2;
  role_label: string;
  status: 0 | 1;
  status_label: string;
}

@Component({
  selector: 'app-member-row',
  imports: [ButtonModule, ElementSizeDirective, UserAvatarComponent],
  template: `
    <div class="row" [appElementSize]="{ compact: 600 }">
      <div class="row-main">
        <div class="row-avatar">
          <app-user-avatar [userId]="member().user_id" [initials]="member().first_name[0] + member().last_name[0]" />
        </div>
        <div class="row-info">
          <span class="row-name">{{ member().first_name }} {{ member().last_name }}</span>
          @if (member().email) {
            <span class="row-email">{{ member().email }}</span>
          }
        </div>
      </div>
      <div class="row-meta">
        <div class="row-role-col">
          <span class="row-role" [attr.data-role]="member().role">{{ member().role_label }}</span>
        </div>
        <span class="row-status" [class.is-active]="member().status === 1">
          <span class="row-status__dot"></span>
          <span class="row-status__label">{{ member().status_label }}</span>
        </span>
        <p-button icon="fa-regular fa-ellipsis-vertical" severity="secondary" [text]="true" rounded size="small" />
      </div>
    </div>
  `,
  styleUrl: './member-row.component.scss',
})
export class MemberRowComponent {
  member = input.required<Member>();
}

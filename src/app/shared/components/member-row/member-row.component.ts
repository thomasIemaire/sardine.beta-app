import { Component, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ElementSizeDirective } from '../../directives/element-size.directive';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Administrateur' | 'Éditeur' | 'Lecteur';
  active: boolean;
}

@Component({
  selector: 'app-member-row',
  imports: [ButtonModule, ElementSizeDirective],
  template: `
    <div class="row" [appElementSize]="{ compact: 600 }">
      <div class="row-main">
        <div class="row-avatar">{{ member().firstName[0] }}{{ member().lastName[0] }}</div>
        <div class="row-info">
          <span class="row-name">{{ member().firstName }} {{ member().lastName }}</span>
          <span class="row-email">{{ member().email }}</span>
        </div>
      </div>
      <div class="row-meta">
        <div class="row-role-col">
            <span class="row-role" [attr.data-role]="member().role">{{ member().role }}</span>
          </div>
        <span class="row-status" [class.is-active]="member().active">
          <span class="row-status__dot"></span>
          <span class="row-status__label">{{ member().active ? 'Actif' : 'Inactif' }}</span>
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

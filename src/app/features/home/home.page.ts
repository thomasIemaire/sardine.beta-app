import { Component } from '@angular/core';
import { PageComponent } from '../../shared/components/page/page.component';

@Component({
  selector: 'app-home',
  imports: [PageComponent],
  template: `
    <app-page>
    </app-page>
  `,
})
export class HomePage {}

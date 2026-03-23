import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PageComponent } from '../../shared/components/page/page.component';
import { HeaderPageComponent } from '../../shared/components/header-page/header-page.component';
import { ToolbarComponent } from '../../shared/components/toolbar/toolbar.component';

@Component({
  selector: 'app-corbeille',
  imports: [ButtonModule, PageComponent, HeaderPageComponent, ToolbarComponent],
  template: `
    <app-page>
      <app-header-page
        title="Corbeille"
        subtitle="Éléments supprimés"
      >
      </app-header-page>
      <div class="corbeille-toolbar">
        <app-toolbar searchPlaceholder="Rechercher dans la corbeille...">
          <p-button label="Vider la corbeille" icon="fa-regular fa-trash" severity="danger" rounded size="small" />
        </app-toolbar>
      </div>
    </app-page>
  `,
  styles: `
    .corbeille-toolbar {
      padding: 1rem;
    }
  `,
})
export class CorbeillePage {}

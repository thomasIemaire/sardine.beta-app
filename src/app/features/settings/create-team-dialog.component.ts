import { Component, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TeamService } from '../../core/services/team.service';
import { ContextSwitcherService } from '../../core/layout/context-switcher/context-switcher.service';

@Component({
  selector: 'app-create-team-dialog',
  imports: [FormsModule, DialogModule, ButtonModule, InputTextModule],
  template: `
    <p-dialog
      [(visible)]="visible"
      header="Nouvelle équipe"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '420px' }"
      (onHide)="reset()"
    >
      <div class="dialog-body">
        <div class="field">
          <label class="field-label">Nom de l'équipe</label>
          <input
            pInputText
            pSize="small"
            [(ngModel)]="name"
            placeholder="Ex : Marketing"
            [disabled]="loading()"
            (keyup.enter)="submit()"
            autofocus
          />
        </div>

        @if (error()) {
          <div class="dialog-error">
            <i class="fa-regular fa-triangle-exclamation"></i>
            {{ error() }}
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <p-button
          label="Annuler"
          severity="secondary"
          size="small"
          rounded
          [text]="true"
          [disabled]="loading()"
          (onClick)="visible.set(false)"
        />
        <p-button
          label="Créer"
          size="small"
          rounded
          [disabled]="!name.trim()"
          [loading]="loading()"
          (onClick)="submit()"
        />
      </ng-template>
    </p-dialog>
  `,
  styles: `
    .dialog-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.25rem 0;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .field-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--p-text-color);
    }

    .dialog-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-m, 8px);
      background: var(--red-color-50, #fef2f2);
      border: 1px solid var(--red-color-200, #fecaca);
      font-size: 0.8125rem;
      color: var(--red-color-700, #b91c1c);

      i { font-size: 0.8125rem; }
    }
  `,
})
export class CreateTeamDialogComponent {
  private readonly teamService = inject(TeamService);
  private readonly contextSwitcher = inject(ContextSwitcherService);

  readonly visible = model(false);
  readonly parentTeamId = input<string | null>(null);
  readonly created = output<string>();

  name = '';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    const org = this.contextSwitcher.selectedOrganization();
    if (!org || !this.name.trim()) return;
    this.loading.set(true);
    this.error.set(null);
    const parentId = this.parentTeamId();
    const request$ = parentId
      ? this.teamService.createSubTeam(org.id, parentId, this.name.trim())
      : this.teamService.createTeam(org.id, this.name.trim());
    request$.subscribe({
      next: (team) => {
        this.loading.set(false);
        this.visible.set(false);
        this.created.emit(team.id);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Une erreur est survenue. Réessayez plus tard.');
      },
    });
  }

  reset(): void {
    this.name = '';
    this.loading.set(false);
    this.error.set(null);
  }
}

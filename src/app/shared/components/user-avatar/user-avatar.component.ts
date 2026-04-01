import { Component, computed, effect, input, output, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Tooltip } from 'primeng/tooltip';

@Component({
  selector: 'app-user-avatar',
  imports: [Tooltip],
  template: `
    @if (refreshable()) {
      <span class="avatar-wrapper" (click)="$event.stopPropagation()">
        @if (showImage()) {
          <img [src]="src()" (error)="showImage.set(false)" />
        } @else {
          <span class="avatar-initials">{{ initials() }}</span>
        }
        <button class="avatar-refresh" [class.is-loading]="loading()" (click)="onRefreshClick()" type="button" pTooltip="Rafraîchir l'avatar" tooltipPosition="right">
          <i class="fa-regular fa-arrows-rotate"></i>
        </button>
      </span>
    } @else {
      @if (showImage()) {
        <img [src]="src()" (error)="showImage.set(false)" />
      } @else {
        {{ initials() }}
      }
    }
  `,
  styles: `
    :host { display: contents; }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .avatar-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;

      img { width: 100%; height: 100%; }

      .avatar-initials { font-size: inherit; }

      .avatar-refresh {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        border: none;
        background: rgba(0, 0, 0, 0.45);
        color: #fff;
        font-size: 0.75rem;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.15s ease;

        &.is-loading i { animation: avatar-spin 0.7s linear infinite; }
      }

      &:hover .avatar-refresh { opacity: 1; }
    }

    @keyframes avatar-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
  `,
})
export class UserAvatarComponent {
  readonly userId = input.required<string>();
  readonly initials = input.required<string>();
  readonly refreshable = input(false);
  readonly refreshToken = input(0);

  readonly refreshClick = output<void>();
  readonly loading = signal(false);
  readonly showImage = signal(true);
  private readonly blobSrc = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.refreshToken() > 0) {
        const url = `${environment.storageUrl}/storage/avatars/${this.userId()}.webp`;
        fetch(url, { cache: 'reload' })
          .then((r) => { if (!r.ok) throw new Error('not found'); return r.blob(); })
          .then((blob) => {
            const prev = this.blobSrc();
            if (prev) URL.revokeObjectURL(prev);
            this.blobSrc.set(URL.createObjectURL(blob));
            this.showImage.set(true);
            this.loading.set(false);
          })
          .catch(() => { this.showImage.set(true); this.loading.set(false); });
      }
    });
  }

  readonly src = computed(() =>
    this.blobSrc() ?? `${environment.storageUrl}/storage/avatars/${this.userId()}.webp`
  );

  onRefreshClick(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.showImage.set(false);
    this.refreshClick.emit();
  }
}

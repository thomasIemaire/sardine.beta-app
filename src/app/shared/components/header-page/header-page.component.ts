import { Component, computed, input, output, signal, OnInit, DestroyRef, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';

export interface Facet {
  id: string;
  label: string;
}

@Component({
  selector: 'app-header-page',
  imports: [ButtonModule],
  template: `
    <div class="header-page">
      <div class="header-page-left">
        <div class="header-page-titles">
          <span class="header-page-title">{{ title() }}</span>
          @if (subtitle()) {
            <span class="header-page-subtitle">{{ subtitle() }}</span>
          }
        </div>
        @if (facets().length) {
          <div class="header-page-facets">
            @for (facet of facets(); track facet.id) {
              <p-button
                [label]="facet.label"
                [severity]="currentFacetId() === facet.id ? 'primary' : 'secondary'"
                rounded
                size="small"
                (onClick)="selectFacet(facet)"
              />
            }
          </div>
        }
      </div>
      <div class="header-page-actions">
        <ng-content select="[action]" />
      </div>
    </div>
  `,
  styles: `
  .header-page {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid var(--surface-border);
    padding: 1rem 2rem;
    gap: 2rem;

    .header-page-left {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .header-page-titles {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        
        .header-page-title {
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .header-page-subtitle {
          font-size: .875rem;
          color: var(--p-text-muted-color);
        }
      }

      .header-page-facets {
        display: flex;
        gap: 0.5rem;
      }
    }
  }`,
})
export class HeaderPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly facets = input<Facet[]>([]);
  readonly defaultFacetId = input<string>();

  readonly facetChange = output<Facet>();

  readonly currentFacetId = signal<string | undefined>(undefined);

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const facetParam = params.get('facet');
        const id = facetParam ?? this.defaultFacetId() ?? this.facets()[0]?.id;
        this.currentFacetId.set(id);

        const facet = this.facets().find((f) => f.id === id);
        if (facet) {
          this.facetChange.emit(facet);
        }
      });
  }

  selectFacet(facet: Facet): void {
    this.currentFacetId.set(facet.id);
    this.facetChange.emit(facet);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { facet: facet.id },
      queryParamsHandling: 'merge',
    });
  }
}

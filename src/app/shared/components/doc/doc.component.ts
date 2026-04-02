import { AfterViewInit, Component, ElementRef, inject, input, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BadgeModule } from 'primeng/badge';

export interface DocContent {
  title: string;
  badge?: string;
  description?: string;
  sections: DocSection[];
}

export interface DocSection {
  id: string;
  title: string;
  contents: DocSectionContent[];
}

export type DocSectionContent =
  | { type: 'text'; value: string }
  | { type: 'list'; value: string[] }
  | { type: 'callout'; icon: string; value: string };

@Component({
  selector: 'app-doc',
  imports: [CommonModule, BadgeModule],
  template: `
    <div class="doc">
      <div class="doc__main">
        <div class="doc__header">
          <div class="doc__title-row">
            <h1 class="doc__title">{{ content().title }}</h1>
            @if (content().badge) {
              <p-badge [value]="content().badge!" />
            }
          </div>
          @if (content().description) {
            <p class="doc__description">{{ content().description }}</p>
          }
        </div>

        <div class="doc__content">
          @for (section of content().sections; track section.id) {
            <div class="doc__section" [id]="section.id">
              <h2 class="doc__section-title">{{ section.title }}</h2>
              @for (block of section.contents; track $index) {
                @switch (block.type) {
                  @case ('text') {
                    <p class="doc__text">{{ block.value }}</p>
                  }
                  @case ('list') {
                    <ul class="doc__list">
                      @for (item of $any(block.value); track $index) {
                        <li class="doc__list-item">{{ item }}</li>
                      }
                    </ul>
                  }
                  @case ('callout') {
                    <div class="doc__callout">
                      <i [class]="$any(block).icon"></i>
                      <span>{{ block.value }}</span>
                    </div>
                  }
                }
              }
            </div>
          }
        </div>
      </div>

      @if (content().sections.length) {
        <nav class="doc__toc">
          <span class="doc__toc-title">Sur cette page</span>
          <ul class="doc__toc-list">
            @for (section of content().sections; track section.id) {
              <li
                class="doc__toc-item"
                [class.doc__toc-item--active]="activeSection() === section.id"
                (click)="scrollToSection(section.id)"
              >{{ section.title }}</li>
            }
          </ul>
        </nav>
      }
    </div>
  `,
  styles: `
    :host { display: block; width: 100%; }

    .doc {
      padding: 2rem 0 8rem 0;
      display: flex;
      gap: 2rem;
      width: 100%;

      &__main { flex: 1; min-width: 0; }

      &__header {
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid var(--surface-border);
      }

      &__title-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
      }

      &__title {
        font-size: 1.625rem;
        font-weight: 700;
        color: var(--p-text-color);
        margin: 0;
      }

      &__description {
        font-size: 0.875rem;
        color: var(--p-text-muted-color);
        line-height: 1.7;
        margin: 0;
      }

      &__content {
        display: flex;
        flex-direction: column;
        gap: 2.5rem;
      }

      &__section { scroll-margin-top: 1.5rem; }

      &__section-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--p-text-color);
        margin: 0 0 0.875rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--surface-border);
      }

      &__text {
        font-size: 0.875rem;
        color: var(--p-text-muted-color);
        line-height: 1.75;
        margin: 0 0 0.625rem;

        &:last-child { margin-bottom: 0; }
      }

      &__list {
        margin: 0 0 0.625rem;
        padding-left: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        &:last-child { margin-bottom: 0; }
      }

      &__list-item {
        font-size: 0.875rem;
        color: var(--p-text-muted-color);
        line-height: 1.7;
      }

      &__callout {
        display: flex;
        align-items: flex-start;
        gap: 0.625rem;
        background: color-mix(in srgb, var(--p-primary-color) 8%, transparent);
        border: 1px solid color-mix(in srgb, var(--p-primary-color) 25%, transparent);
        border-radius: var(--p-border-radius-md);
        padding: 0.75rem 1rem;
        margin: 0 0 0.625rem;

        i {
          font-size: 0.875rem;
          color: var(--p-primary-color);
          margin-top: 0.1rem;
          flex-shrink: 0;
        }

        span {
          font-size: 0.8125rem;
          color: var(--p-text-color);
          line-height: 1.65;
        }

        &:last-child { margin-bottom: 0; }
      }

      &__toc {
        position: sticky;
        top: 1.5rem;
        align-self: flex-start;
        width: 13rem;
        flex-shrink: 0;
      }

      &__toc-title {
        font-size: 0.6875rem;
        font-weight: 700;
        color: var(--p-text-muted-color);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        display: block;
        margin-bottom: 0.75rem;
      }

      &__toc-list {
        list-style: none;
        margin: 0;
        padding: 0;
        border-left: 1px solid var(--surface-border);
      }

      &__toc-item {
        font-size: 0.8rem;
        color: var(--p-text-muted-color);
        padding: 0.3rem 0 0.3rem 0.75rem;
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s;
        border-left: 2px solid transparent;
        margin-left: -1px;

        &:hover { color: var(--p-primary-color); }

        &--active {
          color: var(--p-text-color);
          font-weight: 600;
          border-left-color: var(--p-primary-color);
        }
      }
    }
  `,
})
export class DocComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef);

  content = input.required<DocContent>();

  readonly activeSection = signal('');

  private scrollContainer: HTMLElement | null = null;
  private clickedSection: string | null = null;
  private clickTimeout: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    this.route.fragment.subscribe((fragment) => {
      if (fragment) {
        this.lockSection(fragment);
        setTimeout(() => document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    });

    this.scrollContainer = this.findScrollParent(this.el.nativeElement);
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', this.onScroll, { passive: true });
      this.onScroll();
    }
  }

  private findScrollParent(el: HTMLElement): HTMLElement | null {
    let node = el.parentElement;
    while (node) {
      const { overflowY } = getComputedStyle(node);
      if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  ngOnDestroy(): void {
    this.scrollContainer?.removeEventListener('scroll', this.onScroll);
    if (this.clickTimeout) clearTimeout(this.clickTimeout);
  }

  scrollToSection(sectionId: string): void {
    this.lockSection(sectionId);
    this.router.navigate([], { relativeTo: this.route, fragment: sectionId, queryParamsHandling: 'merge' });
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private lockSection(id: string): void {
    this.clickedSection = id;
    this.activeSection.set(id);
    if (this.clickTimeout) clearTimeout(this.clickTimeout);
    this.clickTimeout = setTimeout(() => { this.clickedSection = null; }, 800);
  }

  private onScroll = (): void => {
    if (this.clickedSection || !this.scrollContainer) return;
    const containerTop = this.scrollContainer.getBoundingClientRect().top;
    let activeId = this.content().sections[0]?.id ?? '';
    for (const section of this.content().sections) {
      const el = document.getElementById(section.id);
      if (el && el.getBoundingClientRect().top - containerTop <= 60) {
        activeId = section.id;
      }
    }
    this.activeSection.set(activeId);
  };
}

import { Directive, ElementRef, inject, input, OnDestroy, OnInit, Renderer2 } from '@angular/core';

/**
 * Directive qui observe la largeur d'un élément et ajoute/retire des classes CSS
 * selon des seuils définis — similaire aux CSS Container Queries mais en Angular.
 *
 * Usage :
 *   <div [appElementSize]="{ compact: 400, tiny: 250 }">
 *
 * Quand la largeur de l'élément est ≤ 400px  → classe `compact` ajoutée
 * Quand la largeur de l'élément est ≤ 250px  → classe `tiny` ajoutée
 *
 * Dans le CSS du composant :
 *   .my-element { display: flex; }
 *   :host.compact .my-element { flex-direction: column; }
 *   :host.tiny .label { display: none; }
 */
@Directive({
  selector: '[appElementSize]',
  standalone: true,
})
export class ElementSizeDirective implements OnInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private renderer = inject(Renderer2);

  appElementSize = input<Record<string, number>>({});

  private observer: ResizeObserver | null = null;
  private activeClasses = new Set<string>();
  private rafId: number | null = null;

  ngOnInit(): void {
    this.observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0;
      // requestAnimationFrame évite la boucle "ResizeObserver loop"
      // en différant les modifications DOM hors du cycle de notification
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.evaluate(width);
      });
    });
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.observer?.disconnect();
  }

  private evaluate(width: number): void {
    const breakpoints = this.appElementSize();
    for (const [cls, maxWidth] of Object.entries(breakpoints)) {
      if (width <= maxWidth) {
        if (!this.activeClasses.has(cls)) {
          this.renderer.addClass(this.el.nativeElement, cls);
          this.activeClasses.add(cls);
        }
      } else {
        if (this.activeClasses.has(cls)) {
          this.renderer.removeClass(this.el.nativeElement, cls);
          this.activeClasses.delete(cls);
        }
      }
    }
  }
}

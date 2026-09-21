import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  Renderer2,
  inject,
} from '@angular/core';

@Directive({
  selector: '[appRevealOnScroll]',
})
export class RevealOnScrollDirective implements AfterViewInit, OnDestroy {
  @Input() revealDelay = 0;

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly zone = inject(NgZone);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (this.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.renderer.setStyle(this.element, 'opacity', '0');
    this.renderer.setStyle(this.element, 'transform', 'translateY(24px)');
    this.renderer.setStyle(
      this.element,
      'transition',
      `opacity 500ms ease ${this.revealDelay}ms, transform 500ms cubic-bezier(.22, 1, .36, 1) ${this.revealDelay}ms`,
    );

    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;

          this.renderer.setStyle(this.element, 'opacity', '1');
          this.renderer.setStyle(this.element, 'transform', 'translateY(0)');
          this.observer?.disconnect();
          this.observer = undefined;
        },
        { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
      );
      this.observer.observe(this.element);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}

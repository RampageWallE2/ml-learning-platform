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

interface AnimatedTextNode {
  node: Text;
  value: string;
}

@Directive({
  selector: '[appTypewriterText]',
})
export class TypewriterTextDirective implements AfterViewInit, OnDestroy {
  @Input() typewriterSpeed = 30;

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly zone = inject(NgZone);
  private readonly textNodes: AnimatedTextNode[] = [];
  private observer?: IntersectionObserver;
  private animationFrame?: number;

  ngAfterViewInit(): void {
    this.collectTextNodes();
    const accessibleText = this.textNodes
      .map(({ value }) => value.trim())
      .filter(Boolean)
      .join(' ');

    if (!this.textNodes.length || !accessibleText) return;

    this.renderer.setAttribute(this.element, 'aria-label', accessibleText);

    if (this.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.renderer.setStyle(
      this.element,
      'min-height',
      `${Math.ceil(this.element.getBoundingClientRect().height)}px`,
    );
    this.renderCharacters(0);

    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;

          this.observer?.disconnect();
          this.observer = undefined;
          this.startTyping();
        },
        { threshold: 0.45 },
      );
      this.observer.observe(this.element);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.animationFrame !== undefined) cancelAnimationFrame(this.animationFrame);
  }

  private collectTextNodes(): void {
    const document = this.element.ownerDocument;
    const showText = document.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
    const walker = document.createTreeWalker(this.element, showText);
    let current = walker.nextNode();

    while (current) {
      const node = current as Text;
      if (node.data.length) this.textNodes.push({ node, value: node.data });
      current = walker.nextNode();
    }
  }

  private startTyping(): void {
    const totalCharacters = this.textNodes.reduce((total, item) => total + item.value.length, 0);
    const speed = Math.max(10, this.typewriterSpeed);
    let startedAt: number | undefined;

    const animate = (timestamp: number): void => {
      startedAt ??= timestamp;
      const visibleCharacters = Math.min(
        totalCharacters,
        Math.floor((timestamp - startedAt) / speed) + 1,
      );
      this.renderCharacters(visibleCharacters);

      if (visibleCharacters < totalCharacters) {
        this.animationFrame = requestAnimationFrame(animate);
        return;
      }

      this.animationFrame = undefined;
      this.renderer.removeStyle(this.element, 'min-height');
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  private renderCharacters(visibleCharacters: number): void {
    let remaining = visibleCharacters;

    for (const item of this.textNodes) {
      const count = Math.min(remaining, item.value.length);
      item.node.data = item.value.slice(0, count);
      remaining -= count;
    }
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}

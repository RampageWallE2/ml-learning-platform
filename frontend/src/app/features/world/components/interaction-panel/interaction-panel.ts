import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  TemplateRef,
  afterRenderEffect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';

const TAB_STOPS =
  'button, a[href], input, select, textarea, summary, [tabindex], [contenteditable="true"]';

export type InteractionPanelMode = 'dialogue' | 'activity';

@Component({
  selector: 'app-interaction-panel',
  imports: [NgTemplateOutlet],
  templateUrl: './interaction-panel.html',
  styleUrl: './interaction-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InteractionPanel {
  readonly mode = input<InteractionPanelMode>('activity');
  readonly returnFocusTarget = input<HTMLElement | null>(null);
  readonly statusTemplate = input<TemplateRef<{ inline: boolean }> | null>(null);
  readonly statusBusy = input(false);
  readonly closed = output<void>();

  private readonly document = inject(DOCUMENT);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly statusRegion = viewChild<ElementRef<HTMLElement>>('statusRegion');
  private readonly previousFocus = this.document.activeElement as HTMLElement | null;
  private lastFocusedElement: HTMLElement | null = null;

  constructor() {
    // Recheck mode and save-status transitions, not every lesson action.
    afterRenderEffect(() => {
      this.mode();
      this.statusTemplate();
      this.statusBusy();
      const status = this.statusRegion()?.nativeElement;
      const active = this.document.activeElement as HTMLElement | null;
      // Disabling a focused retry button can move browser focus to the body.
      // Keep it in the notice until the request finishes, without stealing it
      // from a student who is still using the lesson content.
      if (
        status && this.lastFocusedElement && status.contains(this.lastFocusedElement)
        && (!active || active === this.document.body || !this.isAvailable(active))
      ) {
        status.focus({ preventScroll: true });
        return;
      }
      this.focusInitialElement();
    });

    inject(DestroyRef).onDestroy(() => {
      const panel = this.panel()?.nativeElement;
      const fallback = this.returnFocusTarget();

      // Wait until the parent has removed the background's inert attribute.
      queueMicrotask(() => {
        const active = this.document.activeElement;
        if (active !== this.document.body && active?.isConnected && !panel?.contains(active)) {
          return; // A replacement modal or a new route already owns the focus.
        }

        for (const target of [this.previousFocus, fallback]) {
          if (target && target !== this.document.body && this.isAvailable(target)) {
            target.focus({ preventScroll: true });
            if (this.document.activeElement === target) return;
          }
        }
      });
    });
  }

  rememberFocus(event: FocusEvent): void {
    if (event.target instanceof HTMLElement) this.lastFocusedElement = event.target;
  }

  onKeydown(event: KeyboardEvent): void {
    // Keep native button keys working without sending new movement to Phaser.
    event.stopPropagation();

    if (event.key === 'Escape') {
      event.preventDefault();
      if (!event.repeat) this.closed.emit();
      return;
    }

    if (event.key !== 'Tab') return;
    event.preventDefault();

    const panel = this.panel()?.nativeElement;
    if (!panel) return;
    const stops = Array.from(panel.querySelectorAll<HTMLElement>(TAB_STOPS))
      .filter((element) => element.tabIndex >= 0 && this.isAvailable(element))
      .sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
    const active = this.document.activeElement;
    const index = stops.findIndex((element) => element === active);
    let next: HTMLElement | undefined;

    if (index >= 0) {
      next = stops[(index + (event.shiftKey ? -1 : 1) + stops.length) % stops.length];
    } else if (active && panel.contains(active)) {
      // Lesson questions and hints use tabindex=-1. Continue from their DOM
      // position, so focusing a hint never sends the student back to the top.
      const direction = event.shiftKey
        ? Node.DOCUMENT_POSITION_PRECEDING
        : Node.DOCUMENT_POSITION_FOLLOWING;
      const candidates = stops.filter(
        (element) => active.compareDocumentPosition(element) & direction,
      );
      next = event.shiftKey ? candidates.at(-1) : candidates[0];
    }

    (next ?? (event.shiftKey ? stops.at(-1) : stops[0]) ?? panel).focus();
  }

  private focusInitialElement(): void {
    const panel = this.panel()?.nativeElement;
    const active = this.document.activeElement as HTMLElement | null;
    if (!panel || (active && panel.contains(active) && this.isAvailable(active))) return;

    const selector = this.mode() === 'dialogue' ? '[autofocus]' : 'h1, h2';
    const target =
      Array.from(panel.querySelectorAll<HTMLElement>(selector)).find((element) =>
        this.isAvailable(element),
      ) ?? panel;
    if (!target.hasAttribute('tabindex') && !target.matches(TAB_STOPS)) {
      target.tabIndex = -1;
    }
    target.focus({ preventScroll: true });
  }

  private isAvailable(element: HTMLElement): boolean {
    if (
      !element.isConnected ||
      element.matches(':disabled') ||
      element.closest('[hidden], [inert]')
    ) {
      return false;
    }

    for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
      const style = this.document.defaultView?.getComputedStyle(ancestor);
      if (
        style?.display === 'none' ||
        style?.visibility === 'hidden' ||
        style?.visibility === 'collapse'
      ) {
        return false;
      }
      if (ancestor.tagName === 'DETAILS' && !ancestor.hasAttribute('open')) {
        const summary = ancestor.querySelector('summary');
        if (!summary?.contains(element)) return false;
      }
    }
    return true;
  }
}

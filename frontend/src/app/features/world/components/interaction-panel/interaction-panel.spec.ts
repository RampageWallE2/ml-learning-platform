import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { InteractionPanel, InteractionPanelMode } from './interaction-panel';

@Component({
  imports: [InteractionPanel],
  template: `
    <div [attr.inert]="open() ? '' : null">
      <button id="opener" (click)="open.set(true)">Abrir clase</button>
      <div #map id="map" tabindex="-1">Mapa del juego</div>
    </div>
    <ng-template #saveStatus let-inline="inline">
      <p role="alert">{{ busy() ? 'Guardando progreso…' : 'Pendiente de guardar' }}</p>
      <button id="retry" [disabled]="busy()" [attr.data-inline]="inline">Reintentar</button>
    </ng-template>
    @if (open()) {
      <app-interaction-panel [mode]="mode()" [returnFocusTarget]="map"
        [statusTemplate]="showStatus() ? saveStatus : null" [statusBusy]="busy()" (closed)="open.set(false)">
        @if (mode() === 'dialogue') {
          <button id="continue" autofocus>Continuar conversación</button>
        } @else {
          <h2>Una clase de ejemplo</h2>
          <button id="first">Explorar gráfico</button>
          <button disabled>Deshabilitado</button>
          <fieldset disabled><button>Deshabilitado por fieldset</button></fieldset>
          <button hidden>Oculto</button>
          <div style="display: none"><button>Padre oculto</button></div>
          <div style="visibility: hidden"><button>Invisible</button></div>
          <div inert><button>Inerte</button></div>
          <button tabindex="-1">Fuera de la secuencia</button>
          <details>
            <summary>Más detalles</summary>
            <button id="detail">Consultar detalle</button>
          </details>
          <h3 id="question" tabindex="-1">¿Qué observas?</h3>
          @if (showLast()) {
            <button id="last">Responder</button>
          }
          <p id="hint" tabindex="-1">Revisa el gráfico.</p>
        }
      </app-interaction-panel>
    }
    <button id="other">Otra acción</button>
  `,
})
class PanelTestHost {
  readonly open = signal(false);
  readonly mode = signal<InteractionPanelMode>('activity');
  readonly showLast = signal(true);
  readonly showStatus = signal(false);
  readonly busy = signal(false);
}

describe('InteractionPanel', () => {
  it.each([
    ['dialogue', 'Conversación', 'Cerrar diálogo'],
    ['activity', 'Actividad', 'Cerrar actividad'],
  ] as const)('names the %s modal and its close control', (mode, label, closeLabel) => {
    const fixture = TestBed.createComponent(InteractionPanel);
    fixture.componentRef.setInput('mode', mode);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const panel = root.querySelector('[role="dialog"]')!;
    const close = root.querySelector<HTMLButtonElement>('.close-button')!;

    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.getAttribute('aria-label')).toBe(label);
    expect(close.getAttribute('aria-label')).toBe(closeLabel);
    expect(close.type).toBe('button');
    expect(panel.classList.contains(`interaction-panel--${mode}`)).toBe(true);
  });

  it.each<InteractionPanelMode>(['dialogue', 'activity'])('emits close once in %s mode', (mode) => {
    const fixture = TestBed.createComponent(InteractionPanel);
    fixture.componentRef.setInput('mode', mode);
    fixture.detectChanges();
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.close-button')!
      .click();

    expect(closed).toHaveBeenCalledOnce();
  });
});

describe('InteractionPanel — keyboard and focus', () => {
  async function openPanel(mode: InteractionPanelMode = 'activity') {
    const fixture = TestBed.createComponent(PanelTestHost);
    fixture.componentInstance.mode.set(mode);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const opener = root.querySelector<HTMLButtonElement>('#opener')!;
    opener.focus();
    opener.click();
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, root, opener };
  }

  function key(element: Element, value: string, shiftKey = false) {
    const event = new KeyboardEvent('keydown', {
      key: value,
      shiftKey,
      bubbles: true,
      cancelable: true,
    });
    element.dispatchEvent(event);
    return event;
  }

  it('opens an activity at its title without scrolling past the introduction', async () => {
    const { root } = await openPanel();
    expect(document.activeElement).toBe(root.querySelector('h2'));
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
  });

  it('opens a dialogue on its continue button', async () => {
    const { root } = await openPanel('dialogue');
    expect(document.activeElement).toBe(root.querySelector('#continue'));
  });

  it('uses the dialog itself when no projected focus target exists', async () => {
    const fixture = TestBed.createComponent(InteractionPanel);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('[role="dialog"]'));
  });

  it('wraps Tab from the last answer to close and Shift+Tab from close to the last answer', async () => {
    const { root } = await openPanel();
    const last = root.querySelector<HTMLButtonElement>('#last')!;
    const close = root.querySelector<HTMLButtonElement>('.close-button')!;
    last.focus();
    expect(key(last, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(close);
    key(close, 'Tab', true);
    expect(document.activeElement).toBe(last);
  });

  it.each<InteractionPanelMode>(['activity', 'dialogue'])('includes a single inline retry in the %s focus loop', async mode => {
    const { fixture, root } = await openPanel(mode);
    fixture.componentInstance.showStatus.set(true);
    fixture.detectChanges(); await fixture.whenStable();
    const last = root.querySelector<HTMLElement>(mode === 'activity' ? '#last' : '#continue')!;
    const retry = root.querySelector<HTMLButtonElement>('#retry')!;
    const close = root.querySelector<HTMLButtonElement>('.close-button')!;
    expect(root.querySelector('[role="dialog"]')!.contains(retry)).toBe(true);
    expect(root.querySelectorAll('#retry')).toHaveLength(1);
    expect(retry.dataset['inline']).toBe('true');
    last.focus(); key(last, 'Tab');
    expect(document.activeElement).toBe(retry);
    key(retry, 'Tab'); expect(document.activeElement).toBe(close);
    key(close, 'Tab', true); expect(document.activeElement).toBe(retry);
    key(retry, 'Tab', true); expect(document.activeElement).toBe(last);
  });

  it('keeps focus in the status when its retry button is disabled and lets it return after failure', async () => {
    const { fixture, root } = await openPanel();
    fixture.componentInstance.showStatus.set(true); fixture.detectChanges(); await fixture.whenStable();
    const retry = root.querySelector<HTMLButtonElement>('#retry')!;
    retry.focus(); fixture.componentInstance.busy.set(true);
    fixture.detectChanges(); await fixture.whenStable();
    const status = root.querySelector<HTMLElement>('.interaction-status')!;
    expect(retry.disabled).toBe(true);
    expect(document.activeElement).toBe(status);
    fixture.componentInstance.busy.set(false); fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(status);
    key(status, 'Tab'); expect(document.activeElement).toBe(retry);
  });

  it('does not steal focus from lesson content when a save notice appears or becomes busy', async () => {
    const { fixture, root } = await openPanel();
    const hint = root.querySelector<HTMLElement>('#hint')!;
    hint.focus(); fixture.componentInstance.showStatus.set(true);
    fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(hint);
    fixture.componentInstance.busy.set(true); fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(hint);
    fixture.componentInstance.showStatus.set(false); fixture.detectChanges(); await fixture.whenStable();
    expect(root.querySelector('.interaction-status')).toBeNull();
    expect(document.activeElement).toBe(hint);
  });

  it('returns focus to the lesson when the focused notice is removed', async () => {
    const { fixture, root } = await openPanel();
    fixture.componentInstance.showStatus.set(true); fixture.detectChanges(); await fixture.whenStable();
    root.querySelector<HTMLButtonElement>('#retry')!.focus();
    fixture.componentInstance.showStatus.set(false); fixture.detectChanges(); await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('h2'));
  });

  it('skips disabled, hidden, inert, negative-tabindex and closed-details controls', async () => {
    const { root } = await openPanel();
    const first = root.querySelector<HTMLButtonElement>('#first')!;
    const summary = root.querySelector('summary')!;
    first.focus();
    key(first, 'Tab');
    expect(document.activeElement).toBe(summary);
    key(summary, 'Tab');
    expect(document.activeElement).toBe(root.querySelector('#last'));
  });

  it('includes details controls only after the details are opened', async () => {
    const { root } = await openPanel();
    root.querySelector('details')!.open = true;
    const summary = root.querySelector('summary')!;
    summary.focus();
    key(summary, 'Tab');
    expect(document.activeElement).toBe(root.querySelector('#detail'));
  });

  it('continues from a focused question in either direction', async () => {
    const { root } = await openPanel();
    const question = root.querySelector<HTMLElement>('#question')!;
    question.focus();
    key(question, 'Tab');
    expect(document.activeElement).toBe(root.querySelector('#last'));
    question.focus();
    key(question, 'Tab', true);
    expect(document.activeElement).toBe(root.querySelector('summary'));
  });

  it('wraps safely from a hint after the final answer', async () => {
    const { root } = await openPanel();
    const hint = root.querySelector<HTMLElement>('#hint')!;
    hint.focus();
    key(hint, 'Tab');
    expect(document.activeElement).toBe(root.querySelector('.close-button'));
    hint.focus();
    key(hint, 'Tab', true);
    expect(document.activeElement).toBe(root.querySelector('#last'));
  });

  it('recomputes the focus loop when a lesson removes its last answer', async () => {
    const { fixture, root } = await openPanel();
    fixture.componentInstance.showLast.set(false);
    fixture.detectChanges();
    const close = root.querySelector<HTMLButtonElement>('.close-button')!;
    close.focus();
    key(close, 'Tab', true);
    expect(document.activeElement).toBe(root.querySelector('summary'));
  });

  it('retains focus deliberately moved to a lesson hint across rerenders', async () => {
    const { fixture, root } = await openPanel();
    const hint = root.querySelector<HTMLElement>('#hint')!;
    hint.focus();
    fixture.componentInstance.showLast.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(hint);
  });

  it('moves focus to the new content when dialogue switches to an activity and back', async () => {
    const { fixture, root } = await openPanel('dialogue');
    fixture.componentInstance.mode.set('activity');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('h2'));
    fixture.componentInstance.mode.set('dialogue');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('#continue'));
  });

  it('closes with Escape and restores the opener after its inert attribute is removed', async () => {
    const { fixture, root, opener } = await openPanel();
    const event = key(root.querySelector('h2')!, 'Escape');
    expect(event.defaultPrevented).toBe(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('restores focus when closed with the close button or by lesson completion', async () => {
    const { fixture, root, opener } = await openPanel();
    root.querySelector<HTMLButtonElement>('.close-button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(opener);
    opener.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(opener);
  });

  it('returns to the game when the original opener no longer exists', async () => {
    const { fixture, root, opener } = await openPanel();
    opener.remove();
    key(root.querySelector('h2')!, 'Escape');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('#map'));
  });

  it('does not steal focus from another modal or a navigation destination on destruction', async () => {
    const { fixture, root } = await openPanel();
    fixture.componentInstance.open.set(false);
    fixture.detectChanges();
    const other = root.querySelector<HTMLButtonElement>('#other')!;
    other.focus();
    await fixture.whenStable();
    expect(document.activeElement).toBe(other);
  });

  it('ignores repeated Escape events while a close is pending', async () => {
    const fixture = TestBed.createComponent(InteractionPanel);
    fixture.detectChanges();
    await fixture.whenStable();
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    const panel = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    key(panel, 'Escape');
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', repeat: true, bubbles: true }),
    );
    expect(closed).toHaveBeenCalledOnce();
  });

  it('preserves native button keys while stopping keydown propagation to the game', async () => {
    const { root } = await openPanel();
    const observer = vi.fn();
    document.addEventListener('keydown', observer);
    try {
      for (const value of ['Enter', ' ', 'ArrowDown', 'e']) {
        expect(key(root.querySelector('#last')!, value).defaultPrevented).toBe(false);
      }
      expect(observer).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', observer);
    }
  });

  it('releases held movement keys to Phaser but keeps Space native on buttons', async () => {
    const { root } = await openPanel();
    const observer = vi.fn();
    document.addEventListener('keyup', observer);
    const button = root.querySelector('#last')!;
    try {
      for (const value of ['ArrowDown', 'e']) {
        button.dispatchEvent(new KeyboardEvent('keyup', { key: value, bubbles: true }));
      }
      button.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      expect(observer).toHaveBeenCalledTimes(2);
    } finally {
      document.removeEventListener('keyup', observer);
    }
  });
});

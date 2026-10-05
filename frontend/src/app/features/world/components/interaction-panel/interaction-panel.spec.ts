import { TestBed } from '@angular/core/testing';
import { InteractionPanel, InteractionPanelMode } from './interaction-panel';

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

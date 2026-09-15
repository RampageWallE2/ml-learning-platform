import { TestBed } from '@angular/core/testing';
import { Dialogue } from './dialogue';

describe('Dialogue', () => {
  const data = {
    id: 'test-dialogue',
    messages: [
      { speaker: 'npc' as const, name: 'Encargado', text: 'Primer mensaje.' },
      { speaker: 'player' as const, name: 'Tú', text: 'Respuesta.' }
    ]
  };

  function create() {
    const fixture = TestBed.createComponent(Dialogue);
    fixture.componentRef.setInput('dialogue', data);
    fixture.detectChanges();
    return fixture;
  }

  it('shows only the active speaker text while keeping both portraits visible', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Primer mensaje.');
    expect(root.textContent).not.toContain('Respuesta.');
    expect(root.querySelectorAll('.portrait-frame')).toHaveLength(2);

    root.querySelector<HTMLButtonElement>('.continue-button')!.click();
    fixture.detectChanges();
    expect(root.textContent).not.toContain('Primer mensaje.');
    expect(root.textContent).toContain('Respuesta.');
    expect(root.querySelector('.dialogue-band--player')?.classList).toContain('dialogue-band--active');
  });

  it('completes only after advancing from the last message', () => {
    const fixture = create();
    const completed = vi.fn();
    fixture.componentInstance.completed.subscribe(completed);
    fixture.componentInstance.next();
    expect(completed).not.toHaveBeenCalled();
    fixture.componentInstance.next();
    expect(completed).toHaveBeenCalledOnce();
  });
});

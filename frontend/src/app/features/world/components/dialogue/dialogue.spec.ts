import { TestBed } from '@angular/core/testing';
import { Dialogue } from './dialogue';
import { DialogueData } from './dialogue.types';

describe('Dialogue', () => {
  const data: DialogueData = {
    id: 'test-dialogue',
    messages: [
      { speaker: 'npc', name: 'Encargado', text: 'Primer mensaje.' },
      { speaker: 'player', name: 'Tú', text: 'Respuesta.' }
    ]
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function create(
    dialogue: DialogueData = data,
    finishTyping = true
  ) {
    const fixture = TestBed.createComponent(Dialogue);
    fixture.componentRef.setInput('dialogue', dialogue);
    fixture.detectChanges();

    if (finishTyping) {
      vi.runAllTimers();
      fixture.detectChanges();
    }

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
    vi.runAllTimers();
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
    vi.runAllTimers();
    fixture.componentInstance.next();
    expect(completed).toHaveBeenCalledOnce();
  });

  it('types each message and uses the first click to reveal it completely', () => {
    const fixture = create(data, false);
    const page = fixture.componentInstance;

    expect(page.isTyping()).toBe(true);
    expect(page.displayedText()).toBe('P');

    vi.advanceTimersByTime(66);
    expect(page.displayedText()).toBe('Prim');

    page.next();
    expect(page.currentIndex()).toBe(0);
    expect(page.displayedText()).toBe('Primer mensaje.');
    expect(page.isTyping()).toBe(false);

    page.next();
    expect(page.currentIndex()).toBe(1);
    expect(page.displayedText()).toBe('R');
    expect(page.isTyping()).toBe(true);
  });

  it('restarts from the first message when the dialogue input changes', () => {
    const fixture = create(data, false);
    const replacement: DialogueData = {
      id: 'replacement-dialogue',
      messages: [
        { speaker: 'npc', name: 'Operador', text: 'Nuevo diálogo.' }
      ]
    };

    fixture.componentInstance.next();
    fixture.componentInstance.next();
    expect(fixture.componentInstance.currentIndex()).toBe(1);

    fixture.componentRef.setInput('dialogue', replacement);
    fixture.detectChanges();

    expect(fixture.componentInstance.currentIndex()).toBe(0);
    expect(fixture.componentInstance.displayedText()).toBe('N');
    expect(fixture.componentInstance.isTyping()).toBe(true);
  });

  it('does not split Unicode characters while typing', () => {
    const fixture = create({
      id: 'unicode-dialogue',
      messages: [
        { speaker: 'npc', name: 'Operador', text: '👷 listo' }
      ]
    }, false);

    expect(fixture.componentInstance.displayedText()).toBe('👷');
  });

  it('resolves stable character ids through the central portrait registry', () => {
    const fixture = create({
      id: 'registered-character',
      messages: [
        {
          speaker: 'npc',
          characterId: 'ramp-controller',
          name: 'Encargado de rampa',
          text: 'Mensaje de prueba.'
        }
      ]
    });
    const root = fixture.nativeElement as HTMLElement;
    const frame = root.querySelector<HTMLElement>('.dialogue-band--npc .portrait-frame');
    const portrait = frame?.querySelector<HTMLElement>('.character-portrait--desktop');

    expect(frame?.dataset['characterId']).toBe('ramp-controller');
    expect(portrait?.style.backgroundImage).toContain('character_postman_1.png');
  });

  it('keeps the generic fallback for dialogue messages without a character id', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    const npcFrame = root.querySelector<HTMLElement>('.dialogue-band--npc .portrait-frame');
    const playerFrame = root.querySelector<HTMLElement>('.dialogue-band--player .portrait-frame');

    expect(npcFrame?.dataset['characterId']).toBe('npc-default');
    expect(playerFrame?.dataset['characterId']).toBe('player');
  });

  it('gives an explicit portrait priority over the registered character', () => {
    const fixture = create({
      id: 'custom-portrait',
      messages: [
        {
          speaker: 'npc',
          characterId: 'ramp-controller',
          portrait: '/assets/custom/avatar.png',
          name: 'Personaje',
          text: 'Mensaje de prueba.'
        }
      ]
    });
    const root = fixture.nativeElement as HTMLElement;
    const frame = root.querySelector<HTMLElement>('.dialogue-band--npc .portrait-frame');
    const portrait = frame?.querySelector<HTMLElement>('.character-portrait--desktop');

    expect(frame?.dataset['characterId']).toBe('custom');
    expect(portrait?.style.backgroundImage).toContain('/assets/custom/avatar.png');
  });
});

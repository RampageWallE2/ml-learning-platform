import { TestBed } from '@angular/core/testing';
import { Dialogue } from './dialogue';
import { DialogueData } from './dialogue.types';

describe('Dialogue', () => {
  const data: DialogueData = {
    id: 'test-dialogue',
    messages: [
      { speaker: 'npc', name: 'Encargado', text: 'Primer mensaje.' },
      { speaker: 'player', name: 'Tú', text: 'Respuesta.' },
    ],
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function create(dialogue: DialogueData = data, finishTyping = true) {
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
    expect(root.querySelector('.dialogue-band--player')?.classList).toContain(
      'dialogue-band--active',
    );
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
      messages: [{ speaker: 'npc', name: 'Operador', text: 'Nuevo diálogo.' }],
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
    const fixture = create(
      {
        id: 'unicode-dialogue',
        messages: [{ speaker: 'npc', name: 'Operador', text: '👷 listo' }],
      },
      false,
    );

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
          text: 'Mensaje de prueba.',
        },
      ],
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
    const playerPortrait = playerFrame?.querySelector<HTMLElement>('.character-portrait--desktop');
    expect(playerPortrait?.style.backgroundImage).toContain('character_postman_3.png');
    expect(playerPortrait?.style.backgroundPosition).toBe('-488px -145px');
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
          text: 'Mensaje de prueba.',
        },
      ],
    });
    const root = fixture.nativeElement as HTMLElement;
    const frame = root.querySelector<HTMLElement>('.dialogue-band--npc .portrait-frame');
    const portrait = frame?.querySelector<HTMLElement>('.character-portrait--desktop');

    expect(frame?.dataset['characterId']).toBe('custom');
    expect(portrait?.style.backgroundImage).toContain('/assets/custom/avatar.png');
  });

  it('uses the shared button and shows message progress without mouse-only instructions', () => {
    const fixture = create(data, false);
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector<HTMLButtonElement>('.continue-button')!;

    expect(button.type).toBe('button');
    expect(button.classList.contains('btn')).toBe(true);
    expect(button.classList.contains('btn--secondary')).toBe(true);
    expect(button.textContent).toContain('Mostrar texto');
    expect(button.querySelector('small')?.textContent).toContain('Mensaje 1 / 2');
    expect(button.textContent).not.toContain('clic');

    button.click();
    fixture.detectChanges();
    expect(button.textContent).toContain('Siguiente');
    expect(fixture.componentInstance.currentIndex()).toBe(0);

    button.click();
    vi.runAllTimers();
    fixture.detectChanges();
    expect(button.textContent).toContain('Continuar');
    expect(button.querySelector('small')?.textContent).toContain('Mensaje 2 / 2');
  });

  it('exposes the full message once to assistive technology while it is typing', () => {
    const fixture = create(data, false);
    const root = fixture.nativeElement as HTMLElement;
    const copy = root.querySelector('.dialogue-copy')!;
    const text = copy.querySelector('.dialogue-copy__text')!;

    expect(copy.getAttribute('aria-live')).toBe('polite');
    expect(copy.getAttribute('aria-atomic')).toBe('true');
    expect(text.getAttribute('aria-label')).toBe('Primer mensaje.');
    expect(text.querySelector('.dialogue-copy__reserve')?.getAttribute('aria-hidden')).toBe('true');
    expect(text.querySelector('.dialogue-copy__typed')?.getAttribute('aria-hidden')).toBe('true');
    expect(text.querySelector('.dialogue-copy__typed')?.textContent).toBe('P');
  });

  it('does not skip the last message when the reveal button is pressed', () => {
    const fixture = create({ id: 'last-message', messages: [data.messages[0]] }, false);
    const completed = vi.fn();
    fixture.componentInstance.completed.subscribe(completed);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.continue-button',
    )!;

    button.click();
    fixture.detectChanges();
    expect(completed).not.toHaveBeenCalled();
    expect(button.textContent).toContain('Continuar');
    expect(fixture.componentInstance.displayedText()).toBe('Primer mensaje.');

    button.click();
    expect(completed).toHaveBeenCalledOnce();
  });

  it('stops typing when the dialogue is destroyed', () => {
    const fixture = create(data, false);
    expect(fixture.componentInstance.isTyping()).toBe(true);
    fixture.destroy();
    const displayedText = fixture.componentInstance.displayedText();

    vi.advanceTimersByTime(500);
    expect(fixture.componentInstance.displayedText()).toBe(displayedText);
    expect(fixture.componentInstance.isTyping()).toBe(false);
  });
});

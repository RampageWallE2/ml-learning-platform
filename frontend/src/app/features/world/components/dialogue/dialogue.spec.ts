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

  it('shows only the active speaker and portrait without reserving an inactive band', () => {
    const fixture = create();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Primer mensaje.');
    expect(root.textContent).not.toContain('Respuesta.');
    expect(root.querySelectorAll('.portrait-frame')).toHaveLength(1);
    expect(root.querySelectorAll('.dialogue-band')).toHaveLength(1);
    expect(root.querySelector('.dialogue-band--player')).toBeNull();

    root.querySelector<HTMLButtonElement>('.continue-button')!.click();
    fixture.detectChanges();
    vi.runAllTimers();
    fixture.detectChanges();
    expect(root.textContent).not.toContain('Primer mensaje.');
    expect(root.textContent).toContain('Respuesta.');
    expect(root.querySelector('.dialogue-band--player')?.classList).toContain(
      'dialogue-band--active',
    );
    expect(root.querySelectorAll('.portrait-frame')).toHaveLength(1);
    expect(root.querySelector('.dialogue-band--npc')).toBeNull();
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

  it('shows the destination only at the end and keeps reveal and completion separate', () => {
    const fixture = create({
      ...data,
      nextDestination: 'Taller de mantenimiento',
      completionLabel: 'Volver al mapa',
      messages: [data.messages[0], { ...data.messages[1], kind: 'task' }],
    });
    const root = fixture.nativeElement as HTMLElement;
    const button = root.querySelector<HTMLButtonElement>('.continue-button')!;
    const completed = vi.fn();
    fixture.componentInstance.completed.subscribe(completed);
    expect(root.querySelector('.dialogue-destination')).toBeNull();
    expect(button.textContent).toContain('Siguiente');

    button.click();
    fixture.detectChanges();
    expect(root.querySelector('.dialogue-destination__label')?.textContent).toBe(
      'Siguiente destino',
    );
    expect(root.querySelector('.dialogue-destination__place')?.textContent).toBe(
      'Taller de mantenimiento',
    );
    expect(root.querySelector('.dialogue-purpose')).toBeNull();
    expect(button.textContent).toContain('Mostrar texto');
    expect(completed).not.toHaveBeenCalled();

    button.click();
    fixture.detectChanges();
    expect(button.textContent).toContain('Volver al mapa');
    expect(completed).not.toHaveBeenCalled();

    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    button.click();
    fixture.componentInstance.next();
    expect(button.disabled).toBe(true);
    expect(completed).not.toHaveBeenCalled();

    fixture.componentRef.setInput('busy', false);
    fixture.detectChanges();
    button.click();
    expect(completed).toHaveBeenCalledOnce();
  });

  it('clears the destination and custom completion label when the dialogue changes', () => {
    const fixture = create({
      id: 'intro-destination',
      nextDestination: 'Fondo del tajo',
      completionLabel: 'Entrar al tajo',
      messages: [data.messages[0]],
    });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.continue-button')?.textContent).toContain('Entrar al tajo');

    fixture.componentRef.setInput('dialogue', { id: 'plain-ending', messages: [data.messages[1]] });
    fixture.detectChanges();
    vi.runAllTimers();
    fixture.detectChanges();
    expect(root.querySelector('.dialogue-destination')).toBeNull();
    expect(root.querySelector('.continue-button')?.textContent).toContain('Continuar');
    expect(root.textContent).not.toContain('Fondo del tajo');
  });

  it('supports a completion label without inventing a next destination', () => {
    const fixture = create({
      id: 'investigation-complete',
      completionLabel: 'Volver al mapa',
      messages: [data.messages[0]],
    });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.dialogue-destination')).toBeNull();
    expect(root.querySelector('.continue-button')?.textContent).toContain('Volver al mapa');
  });

  it('keeps consecutive fragments with the same speaker separate until the final advance', () => {
    const fixture = create({
      id: 'short-fragments',
      messages: [
        { speaker: 'npc', name: 'Operador', text: 'Los cuadrados suman 8.' },
        { speaker: 'npc', name: 'Operador', text: 'Tenemos 4 registros.' },
        { speaker: 'npc', name: 'Operador', text: '8 dividido entre 4 da 2.' },
      ],
    });
    const page = fixture.componentInstance;
    const completed = vi.fn();
    page.completed.subscribe(completed);

    for (let index = 0; index < page.dialogue().messages.length; index++) {
      const currentText = page.dialogue().messages[index].text;
      if (page.isTyping()) page.next();
      fixture.detectChanges();
      expect(page.currentIndex()).toBe(index);
      expect(page.displayedText()).toBe(currentText);
      expect(page.currentMessage()?.name).toBe('Operador');
      expect(fixture.nativeElement.querySelectorAll('.dialogue-copy')).toHaveLength(1);
      expect(completed).not.toHaveBeenCalled();
      page.next();
    }

    expect(completed).toHaveBeenCalledOnce();
  });

  it('cannot advance or complete while the server confirmation is in flight', () => {
    const fixture = create();
    const page = fixture.componentInstance;
    const completed = vi.fn();
    page.completed.subscribe(completed);
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    page.next();
    expect(page.currentIndex()).toBe(0);
    expect(fixture.nativeElement.querySelector('.continue-button').disabled).toBe(true);
    page.currentIndex.set(1);
    page.next();
    expect(completed).not.toHaveBeenCalled();
    fixture.componentRef.setInput('busy', false);
    fixture.detectChanges();
    page.next();
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
    expect(npcFrame?.dataset['characterId']).toBe('npc-default');

    fixture.componentInstance.next();
    vi.runAllTimers();
    fixture.detectChanges();
    const playerFrame = root.querySelector<HTMLElement>('.dialogue-band--player .portrait-frame');
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
    expect(root.querySelector('.dialogue-progress')?.textContent).toContain('Mensaje 1 / 2');
    expect(button.textContent).not.toContain('clic');

    button.click();
    fixture.detectChanges();
    expect(button.textContent).toContain('Siguiente');
    expect(fixture.componentInstance.currentIndex()).toBe(0);

    button.click();
    vi.runAllTimers();
    fixture.detectChanges();
    expect(button.textContent).toContain('Continuar');
    expect(root.querySelector('.dialogue-progress')?.textContent).toContain('Mensaje 2 / 2');
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

  it('separates a task from findings and removes metadata when the next message is plain', () => {
    const fixture = create({
      id: 'structured-dialogue',
      messages: [
        { speaker: 'npc', name: 'Encargado', text: 'Busca los extremos.', kind: 'task' },
        {
          speaker: 'player',
          name: 'Tú',
          text: 'La diferencia fue de 7 minutos.',
          kind: 'finding',
          facts: [
            { label: 'Más corta', value: '11 min' },
            { label: 'Más larga', value: '18 min' },
            { label: 'Diferencia', value: '7 min' },
          ],
        },
        { speaker: 'npc', name: 'Encargado', text: 'Gracias por tu ayuda.' },
      ],
    });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.dialogue-purpose')?.textContent).toBe('Qué hacer');
    expect(root.querySelector('.dialogue-band--task')).not.toBeNull();
    expect(root.querySelector('.dialogue-facts')).toBeNull();

    fixture.componentInstance.next();
    vi.runAllTimers();
    fixture.detectChanges();
    expect(root.querySelector('.dialogue-purpose')?.textContent).toBe('Lo que encontramos');
    expect(root.querySelector('.dialogue-band--task')).toBeNull();
    expect(
      Array.from(root.querySelectorAll('.dialogue-facts dt'), (item) => item.textContent),
    ).toEqual(['Más corta', 'Más larga', 'Diferencia']);
    expect(
      Array.from(root.querySelectorAll('.dialogue-facts dd'), (item) => item.textContent),
    ).toEqual(['11 min', '18 min', '7 min']);

    fixture.componentInstance.next();
    vi.runAllTimers();
    fixture.detectChanges();
    expect(root.querySelector('.dialogue-purpose')).toBeNull();
    expect(root.querySelector('.dialogue-facts')).toBeNull();
    expect(root.textContent).not.toContain('11 min');
  });

  it.each([
    ['context', 'Situación'],
    ['reminder', 'Recuerda'],
  ] as const)('labels a %s message without adding data or extra actions', (kind, label) => {
    const fixture = create({
      id: 'reading-kind',
      messages: [{ speaker: 'npc', name: 'Encargado', text: 'Mensaje breve.', kind, facts: [] }],
    });
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.dialogue-purpose')?.textContent).toBe(label);
    expect(root.querySelector('.dialogue-facts')).toBeNull();
    expect(root.querySelectorAll('button')).toHaveLength(1);
  });

  it('renders facts as text, never as supplied HTML', () => {
    const unsafeText = '<img src=x onerror=alert(1)>';
    const fixture = create({
      id: 'safe-facts',
      messages: [
        {
          speaker: 'npc',
          name: 'Encargado',
          text: 'Un registro.',
          facts: [{ label: unsafeText, value: unsafeText }],
        },
      ],
    });
    const facts = (fixture.nativeElement as HTMLElement).querySelector('.dialogue-facts')!;
    expect(facts.querySelector('img')).toBeNull();
    expect(facts.querySelector('dt')?.textContent).toBe(unsafeText);
    expect(facts.querySelector('dd')?.textContent).toBe(unsafeText);
  });
});

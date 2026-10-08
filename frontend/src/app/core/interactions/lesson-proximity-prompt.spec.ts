import type Phaser from 'phaser';
import { LessonProximityPrompt } from './lesson-proximity-prompt';

describe('LessonProximityPrompt', () => {
  function create() {
    const object = (methods: string[]) => Object.fromEntries(
      methods.map(name => [name, vi.fn().mockReturnThis()]),
    );
    const frame = object([
      'clear', 'fillStyle', 'fillRect', 'lineStyle', 'strokeRect', 'beginPath',
      'moveTo', 'lineTo', 'closePath', 'fillPath', 'strokePath',
    ]);
    const texts: (ReturnType<typeof object> & { height: number })[] = [];
    const container = object(['setDepth', 'setVisible', 'setPosition', 'setScale', 'destroy']);
    const scene = {
      add: {
        graphics: vi.fn(() => frame), container: vi.fn(() => container),
        text: vi.fn((_x: number, _y: number, _value: string, _style: Phaser.Types.GameObjects.Text.TextStyle) => {
          const text = Object.assign(object([
            'setResolution', 'setOrigin', 'setText', 'setPosition', 'setWordWrapWidth',
          ]), { height: texts.length === 2 ? 40 : 16 });
          texts.push(text);
          return text;
        }),
      },
    };
    return { prompt: new LessonProximityPrompt(scene as unknown as Phaser.Scene), frame, texts, container, scene };
  }
  const camera = (width = 390, height = 600, zoom = 1) => ({
    zoom, worldView: { left: 0, top: 0, right: width / zoom, bottom: height / zoom,
      width: width / zoom, height: height / zoom },
  }) as Phaser.Cameras.Scene2D.Camera;

  it('draws the cream ficha with distinct typography and the shared long topic', () => {
    const { prompt, frame, texts, scene } = create();
    prompt.show('lesson-05', 'current', { x: 180, y: 300 }, camera(), false);
    expect(texts[0]['setText']).toHaveBeenLastCalledWith('CLASE 5');
    expect(texts[1]['setText']).toHaveBeenLastCalledWith('SIGUIENTE');
    expect(texts[2]['setText']).toHaveBeenLastCalledWith('Desviación respecto al promedio');
    expect(texts[2]['setWordWrapWidth']).toHaveBeenCalledWith(224, true);
    expect(texts[3]['setText']).toHaveBeenLastCalledWith('[E] · Iniciar');
    expect(scene.add.text.mock.calls[2][3]).toEqual(expect.objectContaining({ fontSize: 16 }));
    expect(frame['fillStyle']).toHaveBeenCalledWith(0xf4ebd8, 1);
  });

  it('uses the exact same frame and typography for the intro, then shows the conversation action nearby', () => {
    const { prompt, texts, frame, scene } = create();
    prompt.showIntro({ x: 180, y: 300 }, camera(), false, false);
    expect(texts[0]['setText']).toHaveBeenLastCalledWith('INTRODUCCIÓN');
    expect(texts[1]['setText']).toHaveBeenLastCalledWith('EMPIEZA AQUÍ');
    expect(texts[2]['setText']).toHaveBeenLastCalledWith('Habla con el supervisor');
    expect(texts[3]['setText']).toHaveBeenLastCalledWith('Acércate para empezar');
    expect(frame['fillStyle']).toHaveBeenCalledWith(0xf4ebd8, 1);
    expect(frame['fillStyle']).toHaveBeenCalledWith(0x8b6246, 1);
    prompt.showIntro({ x: 180, y: 300 }, camera(), true, true);
    expect(texts[3]['setText']).toHaveBeenLastCalledWith('Toca E · Conversar');
    expect(scene.add.container).toHaveBeenCalledTimes(1);
    expect(scene.add.text.mock.calls[2][3]).toEqual(expect.objectContaining({ fontSize: 16 }));
  });

  it('reuses the exact lesson frame and typography for a blocked zone without an entry action', () => {
    const { prompt, frame, texts, scene, container } = create();
    prompt.show('lesson-05', 'current', { x: 180, y: 300 }, camera(), false);
    frame['clear'].mockClear();
    prompt.showBlockedZone('Canteras', { x: 180, y: 300 }, camera());
    expect(texts[0]['setText']).toHaveBeenLastCalledWith('ZONA EN PREPARACIÓN');
    expect(texts[1]['setText']).toHaveBeenLastCalledWith('');
    expect(texts[2]['setText']).toHaveBeenLastCalledWith('Canteras');
    expect(texts[3]['setText']).toHaveBeenLastCalledWith('Próximamente podrás explorarla.');
    expect(texts[3]['setWordWrapWidth']).toHaveBeenLastCalledWith(224, true);
    expect(container['setVisible']).toHaveBeenLastCalledWith(true);
    expect(scene.add.container).toHaveBeenCalledTimes(1);
    expect(scene.add.text).toHaveBeenCalledTimes(4);
    expect(scene.add.text.mock.calls[2][3]).toEqual(expect.objectContaining({ fontSize: 16 }));
    // Content changes do not create another frame or change its palette/geometry.
    expect(frame['clear']).not.toHaveBeenCalled();
    expect(frame['fillStyle']).toHaveBeenCalledWith(0xf4ebd8, 1);
    prompt.hide();
    expect(container['setVisible']).toHaveBeenLastCalledWith(false);
  });

  it.each([false, true])('shares the retro ficha for an available zone and switches its copy without stale status (touch: %s)', touch => {
    const { prompt, texts, frame, scene, container } = create();
    prompt.showZone('Minería de Superficie', { x: 180, y: 300 }, camera(), touch);
    expect(texts[0]['setText']).toHaveBeenLastCalledWith('ZONA');
    expect(texts[1]['setText']).toHaveBeenLastCalledWith('DISPONIBLE');
    expect(texts[2]['setText']).toHaveBeenLastCalledWith('Minería de Superficie');
    expect(texts[2]['setWordWrapWidth']).toHaveBeenLastCalledWith(224, true);
    expect(texts[3]['setText']).toHaveBeenLastCalledWith(`${touch ? 'Toca E' : '[E]'} · Entrar`);
    expect(frame['fillStyle']).toHaveBeenCalledWith(0xf4ebd8, 1);
    expect(container['setVisible']).toHaveBeenLastCalledWith(true);
    prompt.showBlockedZone('Canteras', { x: 180, y: 300 }, camera());
    expect(texts[1]['setText']).toHaveBeenLastCalledWith('');
    expect(texts[3]['setText']).toHaveBeenLastCalledWith('Próximamente podrás explorarla.');
    prompt.showZone('HUB', { x: 180, y: 300 }, camera(), touch);
    expect(texts[1]['setText']).toHaveBeenLastCalledWith('DISPONIBLE');
    expect(texts[2]['setText']).toHaveBeenLastCalledWith('HUB');
    expect(texts[3]['setText']).toHaveBeenLastCalledWith(`${touch ? 'Toca E' : '[E]'} · Entrar`);
    expect(scene.add.container).toHaveBeenCalledTimes(1);
    expect(scene.add.text).toHaveBeenCalledTimes(4);
  });

  it('wraps the preparation footer and retains the ficha bounds at narrow portrait and landscape sizes', () => {
    const { prompt, texts, container } = create();
    // Simulate the footer height after Phaser wraps the longer preparation copy.
    texts[3].height = 32;
    for (const [width, height, zoom] of [[208, 600, 0.65], [700, 208, 1.5]]) {
      prompt.showBlockedZone('Zona 2', { x: 5, y: 100 / zoom }, camera(width, height, zoom));
      const fichaWidth = Math.min(248, width - 24);
      expect(texts[3]['setWordWrapWidth']).toHaveBeenLastCalledWith(fichaWidth - 24, true);
      expect(container['setScale']).toHaveBeenLastCalledWith(1 / zoom);
      expect(container['setVisible']).toHaveBeenLastCalledWith(true);
      const [x, y] = container['setPosition'].mock.lastCall!;
      expect(x * zoom).toBeGreaterThanOrEqual(8);
      expect(x * zoom + fichaWidth + 3).toBeLessThanOrEqual(width - 8);
      expect(y * zoom).toBeGreaterThanOrEqual(15);
      expect(y * zoom + 131 + 7).toBeLessThanOrEqual(height - 8);
    }
  });

  it('keeps the same readable screen size in portrait and landscape at different zooms', () => {
    const { prompt, container, frame } = create();
    for (const [width, height, zoom] of [[320, 600, 0.65], [700, 320, 1.5]]) {
      prompt.show('lesson-05', 'completed', { x: 5, y: 190 / zoom }, camera(width, height, zoom), true);
      expect(container['setScale']).toHaveBeenLastCalledWith(1 / zoom);
      const [x, y] = container['setPosition'].mock.lastCall!;
      expect(x * zoom).toBeGreaterThanOrEqual(8);
      expect(x * zoom + 251).toBeLessThanOrEqual(width - 8);
      expect(y * zoom).toBeGreaterThanOrEqual(8);
      expect(y * zoom + 115).toBeLessThanOrEqual(height - 8);
      expect(frame['lineTo']).toHaveBeenCalledWith(14, 122);
    }
  });

  it('flips below the player at the top edge and names the touch action', () => {
    const { prompt, frame, container, texts } = create();
    prompt.show('lesson-03', 'completed', { x: 200, y: 10 }, camera(), true);
    expect(container['setPosition'].mock.lastCall![1]).toBe(36);
    expect(frame['lineTo']).toHaveBeenCalledWith(124, -7);
    expect(texts[3]['setText']).toHaveBeenLastCalledWith('Toca E · Repetir');
  });

  it('reuses its display objects, hides safely and destroys its owned children', () => {
    const { prompt, scene, container, frame } = create();
    prompt.show('lesson-03', 'pending', { x: 200, y: 300 }, camera(), false);
    prompt.show('lesson-03', 'pending', { x: 200, y: 310 }, camera(), false);
    expect(scene.add.container).toHaveBeenCalledTimes(1);
    expect(scene.add.text).toHaveBeenCalledTimes(4);
    expect(frame['clear']).toHaveBeenCalledTimes(1);
    prompt.show('lesson-03', 'pending', { x: 200, y: 300 }, camera(100), false);
    expect(container['setVisible']).toHaveBeenLastCalledWith(false);
    prompt.hide();
    prompt.destroy();
    expect(container['destroy']).toHaveBeenCalledWith(true);
  });
});

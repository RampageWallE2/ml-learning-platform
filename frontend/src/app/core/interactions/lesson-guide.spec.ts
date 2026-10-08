import type Phaser from 'phaser';
import { calculateLessonGuide, LessonGuide } from './lesson-guide';

describe('lesson guide bearing', () => {
  const player = { x: 500, y: 400 };
  const view = { left: 0, right: 1000, top: 0, bottom: 800 };

  it.each([
    { target: { x: 1500, y: 400 }, angle: 0, x: 548, y: 400 },
    { target: { x: -500, y: 400 }, angle: Math.PI, x: 452, y: 400 },
    { target: { x: 500, y: -400 }, angle: -Math.PI / 2, x: 500, y: 352 },
    { target: { x: 500, y: 1200 }, angle: Math.PI / 2, x: 500, y: 448 },
  ])('points at an offscreen destination $target', ({ target, angle, x, y }) => {
    const result = calculateLessonGuide(player, target, view, 1)!;
    expect(result.angle).toBeCloseTo(angle);
    expect(result.x).toBeCloseTo(x);
    expect(result.y).toBeCloseTo(y);
  });

  it('uses the true bearing, including diagonal destinations', () => {
    const result = calculateLessonGuide(player, { x: 1500, y: -600 }, view, 1)!;
    expect(result.angle).toBeCloseTo(-Math.PI / 4);
    expect(result.x).toBeCloseTo(500 + 48 / Math.sqrt(2));
    expect(result.y).toBeCloseTo(400 - 48 / Math.sqrt(2));
  });

  it('keeps the marker at the same screen size and distance when zoom changes', () => {
    for (const zoom of [0.65, 1, 1.5]) {
      const result = calculateLessonGuide(player, { x: 1500, y: 400 }, view, zoom)!;
      expect((result.x - player.x) * zoom).toBeCloseTo(48);
      expect(result.scale * zoom).toBeCloseTo(1);
    }
  });

  it('does not shift its bearing when the camera scrolls to another part of the map', () => {
    const result = calculateLessonGuide(
      { x: 3500, y: 4400 },
      { x: 4500, y: 3400 },
      { left: 3000, right: 4000, top: 4000, bottom: 4800 },
      1,
    )!;
    expect(result.angle).toBeCloseTo(-Math.PI / 4);
    expect(result.x).toBeCloseTo(3500 + 48 / Math.sqrt(2));
  });

  it.each([
    { x: 500, y: 400 },
    { x: 0, y: 0 },
    { x: 1000, y: 800 },
  ])('defers to the NPC marker once the target %s is on screen', (target) => {
    expect(calculateLessonGuide(player, target, view, 1)).toBeNull();
  });

  it('keeps the arrow and label inside a viewport at map edges', () => {
    const result = calculateLessonGuide({ x: 5, y: 795 }, { x: -500, y: 1600 }, view, 0.65)!;
    expect(result.x).toBeGreaterThanOrEqual(24 / 0.65);
    expect(result.y).toBeLessThanOrEqual(800 - 42 / 0.65);
    expect(result.angle).toBeCloseTo(Math.atan2(805, -505));
  });

  it.each([0, -1, NaN, Infinity])('ignores an invalid zoom %s', (zoom) => {
    expect(calculateLessonGuide(player, { x: 1500, y: 400 }, view, zoom)).toBeNull();
  });

  it('hides for invalid positions or a viewport too small to contain its label', () => {
    expect(calculateLessonGuide(player, { x: NaN, y: 400 }, view, 1)).toBeNull();
    expect(
      calculateLessonGuide(
        player,
        { x: 1500, y: 400 },
        { left: 0, right: 40, top: 0, bottom: 40 },
        1,
      ),
    ).toBeNull();
  });
});

describe('LessonGuide display lifecycle', () => {
  function create() {
    const mockObject = (methods: readonly string[]) =>
      Object.fromEntries(methods.map((name) => [name, vi.fn().mockReturnThis()]));
    const arrow = mockObject([
      'fillStyle',
      'lineStyle',
      'beginPath',
      'moveTo',
      'lineTo',
      'closePath',
      'fillPath',
      'strokePath',
      'setDepth',
      'setPosition',
      'setScale',
      'setRotation',
      'setVisible',
      'destroy',
    ]);
    const label = mockObject([
      'setOrigin',
      'setDepth',
      'setResolution',
      'setText',
      'setPosition',
      'setScale',
      'setVisible',
      'destroy',
    ]);
    const scene = { add: { graphics: vi.fn(() => arrow), text: vi.fn(() => label) } };
    const camera = { worldView: { left: 0, right: 1000, top: 0, bottom: 800 }, zoom: 1 };
    return {
      guide: new LessonGuide(scene as unknown as Phaser.Scene),
      camera: camera as unknown as Phaser.Cameras.Scene2D.Camera,
      arrow,
      label,
      scene,
    };
  }

  it('starts hidden and does not recreate graphics while the player moves', () => {
    const { guide, camera, arrow, label, scene } = create();
    expect(arrow['setVisible']).toHaveBeenLastCalledWith(false);
    guide.setTarget({ lessonId: 'lesson-02', x: 1500, y: 400 });
    expect(label['setText']).toHaveBeenLastCalledWith('C2');
    guide.update({ x: 500, y: 400 }, camera);
    guide.update({ x: 510, y: 405 }, camera);
    expect(arrow['setVisible']).toHaveBeenLastCalledWith(true);
    expect(label['setVisible']).toHaveBeenLastCalledWith(true);
    expect(scene.add.graphics).toHaveBeenCalledTimes(1);
    expect(scene.add.text).toHaveBeenCalledTimes(1);
  });

  it('supports the supervisor as an initial destination without inventing a class number', () => {
    const { guide, camera, label } = create();
    guide.setTarget({ label: 'Supervisor', x: 700, y: 400 });
    guide.update({ x: 500, y: 400 }, camera);
    expect(label['setText']).toHaveBeenLastCalledWith('Supervisor');
    expect(label['setVisible']).toHaveBeenLastCalledWith(true);
  });

  it('hides during activities and proximity prompts, then resumes when free to explore', () => {
    const { guide, camera, arrow } = create();
    guide.setTarget({ lessonId: 'lesson-03', x: -500, y: 400 });
    guide.update({ x: 500, y: 400 }, camera);
    expect(arrow['setVisible']).toHaveBeenLastCalledWith(true);
    guide.update({ x: 500, y: 400 }, camera, true);
    expect(arrow['setVisible']).toHaveBeenLastCalledWith(false);
    guide.update({ x: 500, y: 400 }, camera);
    expect(arrow['setVisible']).toHaveBeenLastCalledWith(true);
  });

  it('keeps text upright and compensates for mobile zoom', () => {
    const { guide, camera, arrow, label } = create();
    camera.zoom = 0.65;
    guide.setTarget({ lessonId: 'lesson-09', x: 500, y: -500 });
    guide.update({ x: 500, y: 400 }, camera);
    expect(arrow['setRotation']).toHaveBeenLastCalledWith(-Math.PI / 2);
    expect(arrow['setScale']).toHaveBeenLastCalledWith(1 / 0.65);
    expect(label['setScale']).toHaveBeenLastCalledWith(1 / 0.65);
    expect(label['setText']).toHaveBeenLastCalledWith('C9');
  });

  it('hides when the destination appears and clears stale labels when the course ends', () => {
    const { guide, camera, arrow, label } = create();
    guide.setTarget({ lessonId: 'lesson-01', x: 500, y: 400 });
    guide.update({ x: 100, y: 400 }, camera);
    expect(arrow['setVisible']).toHaveBeenLastCalledWith(false);
    guide.setTarget(null);
    guide.update({ x: 500, y: 400 }, camera);
    expect(label['setText']).toHaveBeenLastCalledWith('');
    expect(label['setVisible']).toHaveBeenLastCalledWith(false);
    guide.destroy();
    expect(arrow['destroy']).toHaveBeenCalledTimes(1);
    expect(label['destroy']).toHaveBeenCalledTimes(1);
  });
});

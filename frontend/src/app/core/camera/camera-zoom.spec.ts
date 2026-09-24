import { screenToFixedCameraPoint } from './camera-zoom';

describe('screenToFixedCameraPoint', () => {
  it('keeps overlay positions unchanged at the default zoom', () => {
    expect(screenToFixedCameraPoint(80, 300, 900, 500, 1)).toEqual({
      x: 80,
      y: 300,
    });
  });

  it('compensates screen position for a zoomed-out camera', () => {
    const point = screenToFixedCameraPoint(80, 300, 900, 500, 0.85);

    expect((point.x - 450) * 0.85 + 450).toBeCloseTo(80);
    expect((point.y - 250) * 0.85 + 250).toBeCloseTo(300);
  });
});

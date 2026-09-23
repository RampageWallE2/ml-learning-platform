import { calculateMobileControlLayout } from './mobile-control-layout';

describe('calculateMobileControlLayout', () => {
  it('moves the controls farther from the bottom in landscape mode', () => {
    const layout = calculateMobileControlLayout(900, 450);

    expect(layout.controlsY).toBe(324);
    expect(450 - layout.controlsY).toBeGreaterThan(90);
  });

  it('keeps both controls symmetric on different screen widths', () => {
    const layout = calculateMobileControlLayout(1200, 500);

    expect(layout.joystickX).toBe(108);
    expect(layout.interactButtonX).toBe(1092);
  });

  it('keeps a safe but compact position in portrait mode', () => {
    const layout = calculateMobileControlLayout(390, 844);

    expect(layout.controlsY).toBeCloseTo(708.96);
    expect(layout.joystickX).toBe(80);
    expect(layout.interactButtonX).toBe(310);
  });

  it('keeps the controls inside a smaller visual viewport', () => {
    const layout = calculateMobileControlLayout(900, 500, {
      width: 700,
      height: 380,
      offsetLeft: 100,
      offsetTop: 20,
    });

    expect(layout.joystickX).toBe(180);
    expect(layout.interactButtonX).toBe(720);
    expect(layout.controlsY).toBe(280);
  });
});

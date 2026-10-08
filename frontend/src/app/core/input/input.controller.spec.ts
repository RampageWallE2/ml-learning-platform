import { calculateMobileControlLayout, MOBILE_JOYSTICK_HIT_SIZE } from './mobile-control-layout';

describe('calculateMobileControlLayout', () => {
  it('moves the controls farther from the bottom in landscape mode', () => {
    const layout = calculateMobileControlLayout(900, 450);

    expect(layout.controlsY).toBe(310);
    expect(450 - layout.controlsY).toBeGreaterThan(90);
  });

  it('keeps both controls symmetric on different screen widths', () => {
    const layout = calculateMobileControlLayout(1200, 500);

    expect(layout.joystickX).toBe(100);
    expect(layout.interactButtonX).toBe(1100);
  });

  it('keeps a safe but compact position in portrait mode', () => {
    const layout = calculateMobileControlLayout(390, 844);

    expect(layout.controlsY).toBe(704);
    expect(layout.joystickX).toBe(70);
    expect(layout.interactButtonX).toBe(320);
  });

  it('keeps the controls inside a smaller visual viewport', () => {
    const layout = calculateMobileControlLayout(900, 500, {
      width: 700,
      height: 380,
      offsetLeft: 100,
      offsetTop: 20,
    });

    expect(layout.joystickX).toBe(170);
    expect(layout.interactButtonX).toBe(730);
    expect(layout.controlsY).toBe(260);
  });

  it.each([[390, 650], [320, 480], [740, 340], [1200, 500]])(
    'leaves the joystick touch area above the bottom-left account button at %sx%s', (width, height) => {
      const layout = calculateMobileControlLayout(width, height);
      const accountTop = height - 20 - 44;
      expect(layout.controlsY + MOBILE_JOYSTICK_HIT_SIZE / 2).toBeLessThanOrEqual(accountTop - 12);
    },
  );
});

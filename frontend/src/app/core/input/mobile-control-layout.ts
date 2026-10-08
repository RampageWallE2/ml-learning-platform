export const MOBILE_JOYSTICK_HIT_SIZE = 128;
const SIDE_INSET_MIN = 70;
const SIDE_INSET_MAX = 100;
const CONTROL_MIN_Y = 80;
// Keep a generous touch zone above Cuenta, including the desktop/tablet inset.
const BOTTOM_INSET_MIN = 20 + 44 + 12 + MOBILE_JOYSTICK_HIT_SIZE / 2;
const BOTTOM_INSET_MAX = 180;

export type MobileControlLayout = Readonly<{
  joystickX: number;
  interactButtonX: number;
  controlsY: number;
}>;

export type MobileVisibleViewport = Readonly<{
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
}>;

export function calculateMobileControlLayout(
  width: number,
  height: number,
  visibleViewport?: MobileVisibleViewport,
): MobileControlLayout {
  const visibleWidth = clamp(visibleViewport?.width ?? width, 1, width);
  const visibleHeight = clamp(visibleViewport?.height ?? height, 1, height);
  const offsetLeft = clamp(
    visibleViewport?.offsetLeft ?? 0,
    0,
    Math.max(0, width - visibleWidth),
  );
  const offsetTop = clamp(
    visibleViewport?.offsetTop ?? 0,
    0,
    Math.max(0, height - visibleHeight),
  );
  const isLandscape = visibleWidth > visibleHeight;
  const sideInset = Math.min(
    clamp(visibleWidth * 0.09, SIDE_INSET_MIN, SIDE_INSET_MAX),
    visibleWidth / 2,
  );
  const bottomInset = clamp(visibleHeight * (isLandscape ? 0.28 : 0.16), BOTTOM_INSET_MIN, BOTTOM_INSET_MAX);

  return {
    joystickX: offsetLeft + sideInset,
    interactButtonX: offsetLeft + visibleWidth - sideInset,
    controlsY: Math.max(
      offsetTop + CONTROL_MIN_Y,
      offsetTop + visibleHeight - bottomInset,
    ),
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

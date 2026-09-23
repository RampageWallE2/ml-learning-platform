const SIDE_INSET_MIN = 80;
const SIDE_INSET_MAX = 110;
const LANDSCAPE_BOTTOM_MIN = 120;
const LANDSCAPE_BOTTOM_MAX = 150;
const PORTRAIT_BOTTOM_MIN = 100;
const PORTRAIT_BOTTOM_MAX = 140;
const CONTROL_MIN_Y = 80;

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
  const bottomInset = isLandscape
    ? clamp(visibleHeight * 0.28, LANDSCAPE_BOTTOM_MIN, LANDSCAPE_BOTTOM_MAX)
    : clamp(visibleHeight * 0.16, PORTRAIT_BOTTOM_MIN, PORTRAIT_BOTTOM_MAX);

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

export type PlayerDirection = 'down' | 'up' | 'left' | 'right';

/** Original sheet: 57 columns of 32 × 64; only its idle and walking rows are used. */
export const PLAYER_AVATAR = {
  texture: 'player-postman-3',
  path: 'assets/game/characters/character_postman_3.png',
  frameWidth: 32,
  frameHeight: 64,
  endFrame: 137,
  directions: {
    right: { idleStart: 57, idleEnd: 62, walkStart: 114, walkEnd: 119 },
    up: { idleStart: 63, idleEnd: 68, walkStart: 120, walkEnd: 125 },
    left: { idleStart: 69, idleEnd: 74, walkStart: 126, walkEnd: 131 },
    down: { idleStart: 75, idleEnd: 80, walkStart: 132, walkEnd: 137 },
  },
} as const;

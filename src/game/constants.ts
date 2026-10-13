export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 11;

/** Roles that are guaranteed to participate in a game (at least MIN_ACTIVE_ROLES of them). */
export const ACTIVE_ROLES = ['Seer', 'Guardian', 'Doctor'];
export const MIN_ACTIVE_ROLES = 2;

/**
 * Draw phases. The draw screen walks through:
 * naming -> dealing/fan -> reveal, then advances to the next player.
 */
export const DRAW_STEP = {
  NAME: 'name',
  FAN: 'fan',
  REVEAL: 'reveal',
  HANDOVER: 'handover',
} as const;

export type DrawStep = (typeof DRAW_STEP)[keyof typeof DRAW_STEP];

export const GAME_PHASE = {
  SETUP: 'setup',
  DRAW: 'draw',
  MODERATOR: 'moderator',
} as const;

export type GamePhase = (typeof GAME_PHASE)[keyof typeof GAME_PHASE];

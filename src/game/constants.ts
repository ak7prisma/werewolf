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
  NIGHT: 'night',
  DAY: 'day',
} as const;

export type GamePhase = (typeof GAME_PHASE)[keyof typeof GAME_PHASE];

/** Roles that the moderator calls one-by-one during the night. */
export const NIGHT_ROLE = {
  WEREWOLF: 'Werewolf',
  GUARDIAN: 'Guardian',
  SEER: 'Seer',
  DOCTOR: 'Doctor',
  ORPHAN: 'Orphan',
  DOPPELGANGER: 'Doppelganger',
} as const;

export type NightRole = (typeof NIGHT_ROLE)[keyof typeof NIGHT_ROLE];

/** Sub-stages of a single night. */
export const NIGHT_STAGE = {
  INTRO: 'intro',
  CALL: 'call',
  DAWN: 'dawn',
} as const;

export type NightStage = (typeof NIGHT_STAGE)[keyof typeof NIGHT_STAGE];

/** Sub-stages of a single day. */
export const DAY_STAGE = {
  DISCUSSION: 'discussion',
  VOTE: 'vote',
  RESULT: 'result',
} as const;

export type DayStage = (typeof DAY_STAGE)[keyof typeof DAY_STAGE];

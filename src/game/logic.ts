import { ROLE_NAMES } from '@/data/roles';
import { ACTIVE_ROLES, MIN_ACTIVE_ROLES } from './constants';

/** Fisher-Yates shuffle that returns a new array. */
export function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Guarantee at least `MIN_ACTIVE_ROLES` night-active roles are present in the
 * deck by swapping in a replacement for a non-active role.
 */
function enforceActiveRoles(deck) {
  const isActive = (role) => ACTIVE_ROLES.includes(role);
  let missing = MIN_ACTIVE_ROLES - deck.filter(isActive).length;

  while (missing > 0) {
    const outside = ACTIVE_ROLES.filter((role) => !deck.includes(role));
    if (outside.length === 0) break;

    const replaceIdx = deck.findIndex((role) => !isActive(role) && role !== 'Werewolf');
    if (replaceIdx === -1) break;

    deck[replaceIdx] = outside[Math.floor(Math.random() * outside.length)];
    missing -= 1;
  }

  return deck;
}

/**
 * Build the pool of role cards dealt for a game of `totalPlayers` players.
 * Randomness happens here (outside the reducer) so the reducer stays pure.
 */
export function createDeck(totalPlayers) {
  const deck = shuffle(ROLE_NAMES).slice(0, totalPlayers);
  return shuffle(enforceActiveRoles(deck));
}

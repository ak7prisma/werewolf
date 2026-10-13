import { getRole, getRoleNames } from '@/data/roles';
import { ACTIVE_ROLES, MIN_ACTIVE_ROLES, NIGHT_ROLE, type NightRole } from './constants';
import type { Player } from './reducer';

/** Fisher-Yates shuffle that returns a new array. */
export function shuffle<T>(list: readonly T[]): T[] {
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
function enforceActiveRoles(deck: string[]): string[] {
  const isActive = (role: string) => ACTIVE_ROLES.includes(role);
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
 * Guarantee exactly one Werewolf is present. Because every player draws from a
 * shuffled deck, this gives each of the `totalPlayers` positions an equal 1/N
 * chance of holding the Werewolf (instead of always landing on the last pick).
 */
function enforceWerewolf(deck: string[]): string[] {
  if (deck.includes('Werewolf')) return deck;

  const replaceIdx = deck.findIndex((role) => !ACTIVE_ROLES.includes(role));
  if (replaceIdx !== -1) deck[replaceIdx] = 'Werewolf';

  return deck;
}

/**
 * Build the pool of role cards dealt for a game of `totalPlayers` players.
 * Randomness happens here (outside the reducer) so the reducer stays pure.
 */
export function createDeck(totalPlayers: number): string[] {
  const deck = shuffle(getRoleNames()).slice(0, totalPlayers);
  return shuffle(enforceActiveRoles(enforceWerewolf(deck)));
}

/**
 * Build the order in which the moderator calls night roles. Every role that is
 * present among the living players is included exactly once; the order itself is
 * shuffled so it changes from night to night. The very first night is special:
 * only the Seer and the Orphan wake up (the Werewolf does not hunt yet).
 * Randomness happens here (outside the reducer) so the reducer stays pure.
 */
export function buildNightOrder(
  players: Player[],
  doctorCharges: number,
  round: number,
): NightRole[] {
  const hasAliveRole = (role: string) =>
    players.some((player) => player.alive && player.role === role);
  const orphan = players.find((player) => player.role === 'Orphan');
  const hasOrphan = Boolean(orphan?.alive && orphan.orphanFather === null);

  if (round <= 1) {
    const first: NightRole[] = [];
    if (hasAliveRole('Seer')) first.push(NIGHT_ROLE.SEER);
    if (hasOrphan) first.push(NIGHT_ROLE.ORPHAN);
    return shuffle(first);
  }

  const order: NightRole[] = [];
  const hasAliveTeam = (team: 'werewolf' | 'village') =>
    players.some((player) => player.alive && getRole(player.role)?.team === team);

  if (hasAliveTeam('werewolf')) order.push(NIGHT_ROLE.WEREWOLF);
  if (hasAliveRole('Guardian')) order.push(NIGHT_ROLE.GUARDIAN);
  if (hasAliveRole('Seer')) order.push(NIGHT_ROLE.SEER);
  if (hasAliveRole('Doctor') && doctorCharges > 0) order.push(NIGHT_ROLE.DOCTOR);
  if (hasOrphan) order.push(NIGHT_ROLE.ORPHAN);
  if (hasAliveRole('Doppelganger') && players.some((player) => !player.alive)) {
    order.push(NIGHT_ROLE.DOPPELGANGER);
  }

  return shuffle(order);
}

/** True when a role counts as a threat for the Seer (werewolf team or Lycan). */
export function isThreatRole(role: string): boolean {
  return getRole(role)?.team === 'werewolf' || role === 'Lycan';
}

export interface NightCandidateOptions {
  /** Guardian cannot protect the same player on two consecutive nights. */
  lastGuardTarget?: number | null;
  /** Whether the Guardian has spent their single self-protection. */
  guardianSelfUsed?: boolean;
}

/** Indices of players that may be picked during the given night role's call. */
export function nightCandidates(
  role: NightRole,
  players: Player[],
  options: NightCandidateOptions = {},
): number[] {
  const { lastGuardTarget = null, guardianSelfUsed = false } = options;
  return players.reduce<number[]>((acc, player, index) => {
    let ok = false;
    switch (role) {
      case NIGHT_ROLE.WEREWOLF:
        ok = player.alive && player.role !== 'Werewolf';
        break;
      case NIGHT_ROLE.GUARDIAN:
        ok =
          player.alive &&
          index !== lastGuardTarget &&
          !(guardianSelfUsed && player.role === 'Guardian');
        break;
      case NIGHT_ROLE.SEER:
        ok = player.alive && player.role !== 'Seer';
        break;
      case NIGHT_ROLE.DOCTOR:
        ok = !player.alive;
        break;
      case NIGHT_ROLE.ORPHAN:
        ok = player.alive && player.role !== 'Orphan';
        break;
      case NIGHT_ROLE.DOPPELGANGER:
        ok = !player.alive && player.role !== 'Doppelganger';
        break;
    }
    if (ok) acc.push(index);
    return acc;
  }, []);
}

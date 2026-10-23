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

/** Werewolf count grows by one at every multiple of 8 players (8, 16, 24, ...). */
export function werewolfCount(totalPlayers: number): number {
  return Math.max(1, Math.floor(totalPlayers / 8) + 1);
}

/**
 * Roles with an active night skill and special roles (Orphan, Doppelganger,
 * King, Fool) may only appear once. Werewolf is duplicated by design, while
 * other roles (Hunter, etc.) may repeat.
 */
export function isUniqueRole(role: string): boolean {
  return (
    role === 'Orphan' ||
    role === 'Doppelganger' ||
    role === 'King' ||
    role === 'Fool' ||
    getRole(role)?.category === 'active'
  );
}

/** Pick the single-copy roles that fit in the non-werewolf portion of the deck. */
function pickUniqueRoles(room: number, roleNames: string[]): string[] {
  const uniqueRoles = shuffle(roleNames.filter(isUniqueRole));
  if (room <= 0 || uniqueRoles.length === 0) return [];

  const activeRoles = uniqueRoles.filter((role) => ACTIVE_ROLES.includes(role));
  const otherUnique = uniqueRoles.filter((role) => !ACTIVE_ROLES.includes(role));
  const includeCount = Math.min(uniqueRoles.length, room);
  const activeCount = Math.min(
    activeRoles.length,
    includeCount,
    Math.max(MIN_ACTIVE_ROLES, includeCount - otherUnique.length),
  );

  const selected = activeRoles.slice(0, activeCount);
  selected.push(...otherUnique.slice(0, includeCount - selected.length));
  return selected;
}

/**
 * Build the pool of role cards dealt for a game of `totalPlayers` players.
 * Werewolves scale with player count, single-copy night roles appear once, and
 * every remaining slot is filled from duplicable roles. Randomness happens here
 * (outside the reducer) so the reducer stays pure.
 */
export function createDeck(totalPlayers: number): string[] {
  const roleNames = getRoleNames();
  const wolves = Math.min(totalPlayers, werewolfCount(totalPlayers));
  const deck = Array.from({ length: wolves }, () => 'Werewolf');

  const remainingUnique = totalPlayers - wolves;
  const uniquePicks = pickUniqueRoles(remainingUnique, roleNames);
  deck.push(...uniquePicks);

  const fillers = roleNames.filter((role) => role !== 'Werewolf' && !isUniqueRole(role));
  let remaining = totalPlayers - deck.length;
  while (remaining > 0) {
    const filler = fillers[Math.floor(Math.random() * fillers.length)];
    if (!filler) break;
    deck.push(filler);
    remaining -= 1;
  }

  return shuffle(deck);
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

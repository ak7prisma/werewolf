import {
  DAY_STAGE,
  DRAW_STEP,
  GAME_PHASE,
  NIGHT_STAGE,
  type DayStage,
  type DrawStep,
  type GamePhase,
  type NightRole,
  type NightStage,
} from './constants';

export interface Player {
  name: string;
  role: string;
  alive: boolean;
  hp: number;
  orphanFather: number | null;
  transformedFrom: string | null;
}

export type NotificationTone = 'success' | 'danger' | 'info' | 'warning';

/** How a player is being eliminated: village vote, or a werewolf attack. */
export type KillCause = 'vote' | 'werewolf';

export interface GameNotification {
  tone: NotificationTone;
  title: string;
  message: string;
}

export interface GameState {
  phase: GamePhase;
  totalPlayers: number;
  availableRoles: string[];
  players: Player[];
  currentPlayerIdx: number;
  currentRole: string | null;
  pendingName: string;
  drawStep: DrawStep;
  hasDoctor: boolean;
  doctorCharges: number;
  /** Index of a dead Hunter who still owes a shot. Blocks play until resolved. */
  pendingHunter: number | null;

  /** 1-based night/day counter. */
  round: number;
  nightStage: NightStage;
  nightOrder: NightRole[];
  nightIndex: number;
  /** Currently highlighted target on the player grid during a night call. */
  selection: number | null;
  wolfTarget: number | null;
  guardTarget: number | null;
  /** Player protected by the Guardian during the previous night (cannot repeat). */
  lastGuardTarget: number | null;
  /** Whether the Guardian has already used their one self-protection. */
  guardianSelfUsed: boolean;
  seerTarget: number | null;
  /** Werewolves are poisoned and will skip their next hunt. */
  wolfPoisoned: boolean;
  /** Werewolves skip the hunt during the night currently being played. */
  wolfSkipThisNight: boolean;

  dayStage: DayStage;
  /** Index eliminated during the latest day vote (null if nobody was voted out). */
  dayVictim: number | null;

  notification: GameNotification | null;
}

export type GameAction =
  | { type: 'SETUP_START'; payload: { totalPlayers: number; roles: string[] } }
  | { type: 'DEAL'; payload: { name: string } }
  | { type: 'PICK'; payload: { index: number } }
  | { type: 'NEXT_PLAYER' }
  | { type: 'START_NIGHT'; payload: { order: NightRole[] } }
  | { type: 'NIGHT_BEGIN_CALL' }
  | { type: 'NIGHT_SELECT'; payload: { index: number } }
  | { type: 'NIGHT_CONFIRM' }
  | { type: 'NIGHT_SKIP' }
  | { type: 'NIGHT_TO_DAY' }
  | { type: 'DAY_BEGIN_VOTE' }
  | { type: 'DAY_SELECT'; payload: { index: number } }
  | { type: 'DAY_CONFIRM' }
  | { type: 'DAY_SKIP' }
  | { type: 'HUNTER_SHOOT'; payload: { targetIndex: number } }
  | { type: 'DOPPELGANGER_COPY'; payload: { targetIndex: number } }
  | { type: 'DISMISS_NOTIFICATION' }
  | { type: 'RESET' };

export const initialGameState: GameState = {
  phase: GAME_PHASE.SETUP,
  totalPlayers: 0,
  availableRoles: [],
  players: [],
  currentPlayerIdx: 0,
  currentRole: null,
  pendingName: '',
  drawStep: DRAW_STEP.NAME,
  hasDoctor: false,
  doctorCharges: 0,
  pendingHunter: null,

  round: 0,
  nightStage: NIGHT_STAGE.INTRO,
  nightOrder: [],
  nightIndex: 0,
  selection: null,
  wolfTarget: null,
  guardTarget: null,
  lastGuardTarget: null,
  guardianSelfUsed: false,
  seerTarget: null,
  wolfPoisoned: false,
  wolfSkipThisNight: false,

  dayStage: DAY_STAGE.DISCUSSION,
  dayVictim: null,

  notification: null,
};

function clonePlayers(players: Player[]): Player[] {
  return players.map((player) => ({ ...player }));
}

interface DeathResult {
  notification: GameNotification | null;
  /** True when the werewolves ate a Disease and are now poisoned. */
  poisoned: boolean;
  pendingHunter: number | null;
}

/**
 * Apply a single elimination to a *mutable* cloned player list. Handles Cursed
 * transformation, Strong Villager's extra life, Orphan awakening, Disease poison
 * and the Hunter's pending shot.
 */
function applyDeath(
  players: Player[],
  index: number,
  cause: KillCause,
  currentPendingHunter: number | null,
): DeathResult {
  const target = players[index];
  if (!target || !target.alive) {
    return { notification: null, poisoned: false, pendingHunter: currentPendingHunter };
  }

  if (cause === 'werewolf' && target.role === 'Cursed') {
    const oldWolves = players.filter((player) => player.role === 'Werewolf' && player.alive);
    oldWolves.forEach((wolf) => {
      wolf.alive = false;
    });

    target.role = 'Werewolf';
    target.transformedFrom = 'Cursed';
    target.hp = 1;
    target.alive = true;

    const names = oldWolves.map((wolf) => wolf.name);
    const message =
      names.length === 0
        ? `${target.name} (Cursed) berubah menjadi Werewolf!`
        : names.length === 1
          ? `${target.name} (Cursed) menjadi Werewolf baru, dan ${names[0]} (Werewolf lama) langsung tewas!`
          : `${target.name} (Cursed) menjadi Werewolf baru, dan seluruh Werewolf lama (${names.join(', ')}) langsung tewas!`;

    return {
      notification: { tone: 'danger', title: 'Kutukan Menyebar!', message },
      poisoned: false,
      pendingHunter: currentPendingHunter,
    };
  }

  if (target.role === 'Strong Villager' && target.hp > 1) {
    target.hp -= 1;
    return {
      notification: {
        tone: 'success',
        title: 'Bangkit Lagi!',
        message: `Strong Villager punya 2 nyawa — ${target.name} bangkit! Sisa ${target.hp} nyawa.`,
      },
      poisoned: false,
      pendingHunter: currentPendingHunter,
    };
  }

  const diedRole = target.role;
  target.alive = false;

  let notification: GameNotification | null = null;
  players.forEach((player) => {
    if (player.role === 'Orphan' && player.orphanFather === index) {
      player.role = 'Werewolf';
      player.transformedFrom = 'Orphan';
      player.hp = 1;
      player.alive = true;
      notification = {
        tone: 'danger',
        title: 'Transformasi!',
        message: `${player.name} kehilangan bapak angkatnya, bangkit dari kematian, dan berubah menjadi WEREWOLF!`,
      };
    }
  });

  return {
    notification,
    poisoned: cause === 'werewolf' && diedRole === 'Disease',
    pendingHunter: diedRole === 'Hunter' ? index : currentPendingHunter,
  };
}

/** Move to the next night section, or resolve the night when none remain. */
function advanceNight(state: GameState): GameState {
  const nextIndex = state.nightIndex + 1;
  if (nextIndex < state.nightOrder.length) {
    return { ...state, nightIndex: nextIndex, selection: null };
  }
  return resolveDawn(state);
}

/** Apply the accumulated night actions (werewolf kill vs. guardian protection). */
function resolveDawn(state: GameState): GameState {
  const players = clonePlayers(state.players);
  let notification: GameNotification | null = null;
  let pendingHunter = state.pendingHunter;
  let wolfPoisoned = state.wolfPoisoned;

  if (state.wolfSkipThisNight) {
    notification = {
      tone: 'info',
      title: 'Malam Tanpa Mangsa',
      message: 'Werewolf masih keracunan dan tidak berburu malam ini.',
    };
  } else if (state.wolfTarget !== null) {
    const target = state.wolfTarget;
    if (state.guardTarget === target) {
      const name = players[target]?.name ?? 'target';
      notification = {
        tone: 'success',
        title: 'Dilindungi!',
        message: `Guardian melindungi ${name} — serangan Werewolf gagal!`,
      };
    } else {
      const result = applyDeath(players, target, 'werewolf', pendingHunter);
      notification = result.notification ?? {
        tone: 'danger',
        title: 'Korban Malam',
        message: `${players[target]?.name ?? 'Seseorang'} tewas dimangsa Werewolf semalam.`,
      };
      pendingHunter = result.pendingHunter;
      if (result.poisoned) wolfPoisoned = true;
    }
  }

  return {
    ...state,
    players,
    notification,
    pendingHunter,
    wolfPoisoned,
    nightStage: NIGHT_STAGE.DAWN,
    selection: null,
  };
}

/**
 * Pure reducer for the whole game. Any randomness (deck shuffling, night order)
 * is performed by the caller and passed in through the action payload.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SETUP_START': {
      const { totalPlayers, roles } = action.payload;
      const hasDoctor = roles.includes('Doctor');
      return {
        ...initialGameState,
        phase: GAME_PHASE.DRAW,
        totalPlayers,
        availableRoles: roles,
        hasDoctor,
        doctorCharges: hasDoctor ? 1 : 0,
      };
    }

    case 'DEAL': {
      return { ...state, pendingName: action.payload.name, drawStep: DRAW_STEP.FAN };
    }

    case 'PICK': {
      const { index } = action.payload;
      if (index < 0 || index >= state.availableRoles.length) return state;

      const availableRoles = [...state.availableRoles];
      const currentRole = availableRoles[index];
      availableRoles.splice(index, 1);

      const player = {
        name: state.pendingName,
        role: currentRole,
        alive: true,
        hp: currentRole === 'Strong Villager' ? 2 : 1,
        orphanFather: null,
        transformedFrom: null,
      };

      return {
        ...state,
        availableRoles,
        currentRole,
        players: [...state.players, player],
        drawStep: DRAW_STEP.REVEAL,
      };
    }

    case 'NEXT_PLAYER': {
      const nextIdx = state.currentPlayerIdx + 1;
      if (nextIdx < state.totalPlayers) {
        return {
          ...state,
          currentPlayerIdx: nextIdx,
          pendingName: '',
          drawStep: DRAW_STEP.NAME,
        };
      }
      return { ...state, currentRole: null, drawStep: DRAW_STEP.HANDOVER };
    }

    case 'START_NIGHT': {
      const round = state.phase === GAME_PHASE.DRAW ? 1 : state.round + 1;
      return {
        ...state,
        phase: GAME_PHASE.NIGHT,
        round,
        nightStage: NIGHT_STAGE.INTRO,
        nightOrder: action.payload.order,
        nightIndex: 0,
        selection: null,
        wolfTarget: null,
        guardTarget: null,
        seerTarget: null,
        wolfSkipThisNight: state.wolfPoisoned,
        wolfPoisoned: false,
        dayStage: DAY_STAGE.DISCUSSION,
        dayVictim: null,
        notification: null,
      };
    }

    case 'NIGHT_BEGIN_CALL': {
      if (state.nightStage !== NIGHT_STAGE.INTRO) return state;
      if (state.nightOrder.length === 0) {
        return resolveDawn({ ...state, selection: null });
      }
      return { ...state, nightStage: NIGHT_STAGE.CALL, selection: null };
    }

    case 'NIGHT_SELECT': {
      if (state.nightStage !== NIGHT_STAGE.CALL) return state;
      return { ...state, selection: action.payload.index };
    }

    case 'NIGHT_SKIP': {
      if (state.nightStage !== NIGHT_STAGE.CALL) return state;
      return advanceNight({ ...state, selection: null });
    }

    case 'NIGHT_CONFIRM': {
      if (state.nightStage !== NIGHT_STAGE.CALL) return state;
      const role = state.nightOrder[state.nightIndex];
      const selection = state.selection;
      if (role === undefined || selection === null) return state;

      if (role === 'Werewolf') {
        if (state.wolfSkipThisNight) return state;
        return advanceNight({ ...state, wolfTarget: selection });
      }

      if (role === 'Seer') {
        return advanceNight({ ...state, seerTarget: selection });
      }

      if (role === 'Guardian') {
        const guardianIdx = state.players.findIndex((player) => player.role === 'Guardian');
        return advanceNight({
          ...state,
          guardTarget: selection,
          lastGuardTarget: selection,
          guardianSelfUsed: state.guardianSelfUsed || selection === guardianIdx,
        });
      }

      if (role === 'Doctor') {
        const players = clonePlayers(state.players);
        const target = players[selection];
        if (!target || target.alive || state.doctorCharges <= 0) return state;
        target.alive = true;
        target.hp = target.role === 'Strong Villager' ? 2 : 1;
        return advanceNight({ ...state, players, doctorCharges: state.doctorCharges - 1 });
      }

      if (role === 'Orphan') {
        const players = clonePlayers(state.players);
        const orphanIdx = players.findIndex((player) => player.role === 'Orphan');
        if (orphanIdx === -1 || selection === orphanIdx) return state;
        if (!players[selection]?.alive) return state;
        players[orphanIdx].orphanFather = selection;
        return advanceNight({ ...state, players });
      }

      if (role === 'Doppelganger') {
        const players = clonePlayers(state.players);
        const doppelgangerIdx = players.findIndex((player) => player.role === 'Doppelganger');
        const target = players[selection];
        if (doppelgangerIdx === -1 || selection === doppelgangerIdx) return state;
        if (!target || target.alive) return state;
        const doppelganger = players[doppelgangerIdx];
        doppelganger.role = target.role;
        doppelganger.transformedFrom = 'Doppelganger';
        if (doppelganger.alive) {
          doppelganger.hp = target.role === 'Strong Villager' ? 2 : 1;
          doppelganger.orphanFather = null;
        }
        return advanceNight({
          ...state,
          players,
          notification: {
            tone: 'info',
            title: 'Peran Diambil!',
            message: `${doppelganger.name} (Doppelganger) kini menyamar sebagai ${target.role}, mengambil peran almarhum ${target.name}.`,
          },
        });
      }

      return advanceNight(state);
    }

    case 'NIGHT_TO_DAY': {
      return {
        ...state,
        phase: GAME_PHASE.DAY,
        dayStage: DAY_STAGE.DISCUSSION,
        dayVictim: null,
        selection: null,
      };
    }

    case 'DAY_BEGIN_VOTE': {
      if (state.dayStage !== DAY_STAGE.DISCUSSION) return state;
      return { ...state, dayStage: DAY_STAGE.VOTE, selection: null, notification: null };
    }

    case 'DAY_SELECT': {
      if (state.dayStage !== DAY_STAGE.VOTE) return state;
      return { ...state, selection: action.payload.index };
    }

    case 'DAY_SKIP': {
      if (state.dayStage !== DAY_STAGE.VOTE) return state;
      return { ...state, dayStage: DAY_STAGE.RESULT, dayVictim: null, selection: null };
    }

    case 'DAY_CONFIRM': {
      if (state.dayStage !== DAY_STAGE.VOTE || state.selection === null) return state;
      const index = state.selection;
      const players = clonePlayers(state.players);
      const result = applyDeath(players, index, 'vote', state.pendingHunter);
      return {
        ...state,
        players,
        notification: result.notification,
        pendingHunter: result.pendingHunter,
        dayStage: DAY_STAGE.RESULT,
        dayVictim: index,
        selection: null,
      };
    }

    case 'HUNTER_SHOOT': {
      const { targetIndex } = action.payload;
      if (state.pendingHunter === null) return state;

      const players = clonePlayers(state.players);
      const target = players[targetIndex];
      if (!target || !target.alive || targetIndex === state.pendingHunter) return state;

      const hunter = players[state.pendingHunter];
      const hunterName = hunter ? hunter.name : 'Hunter';
      const result = applyDeath(players, targetIndex, 'vote', state.pendingHunter);
      const notification =
        result.notification ??
        ({
          tone: 'danger',
          title: 'Tembakan Hunter!',
          message: `${hunterName} (Hunter) menembak ${target.name} sebelum tewas — ${target.name} ikut mati!`,
        } as GameNotification);

      return { ...state, players, pendingHunter: null, notification };
    }

    case 'DOPPELGANGER_COPY': {
      const { targetIndex } = action.payload;
      const players = clonePlayers(state.players);
      const doppelgangerIdx = players.findIndex((player) => player.role === 'Doppelganger');
      const target = players[targetIndex];

      if (doppelgangerIdx === -1 || targetIndex === doppelgangerIdx) return state;
      if (!target || target.alive) return state;

      const doppelganger = players[doppelgangerIdx];
      doppelganger.role = target.role;
      doppelganger.transformedFrom = 'Doppelganger';
      if (doppelganger.alive) {
        doppelganger.hp = target.role === 'Strong Villager' ? 2 : 1;
        doppelganger.orphanFather = null;
      }

      return {
        ...state,
        players,
        notification: {
          tone: 'info',
          title: 'Peran Diambil!',
          message: `${doppelganger.name} (Doppelganger) kini menyamar sebagai ${target.role}, mengambil peran almarhum ${target.name}.`,
        },
      };
    }

    case 'DISMISS_NOTIFICATION':
      return { ...state, notification: null };

    case 'RESET':
      return { ...initialGameState };

    default:
      return state;
  }
}

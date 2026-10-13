import { DRAW_STEP, GAME_PHASE, type DrawStep, type GamePhase } from './constants';

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
  werewolfSpotted: boolean;
  hasDoctor: boolean;
  doctorCharges: number;
  notification: GameNotification | null;
}

export type GameAction =
  | { type: 'SETUP_START'; payload: { totalPlayers: number; roles: string[] } }
  | { type: 'DEAL'; payload: { name: string } }
  | { type: 'PICK'; payload: { index: number } }
  | { type: 'NEXT_PLAYER' }
  | { type: 'START_MODERATOR' }
  | { type: 'KILL'; payload: { index: number; cause: KillCause } }
  | { type: 'DOCTOR_REVIVE'; payload: { index: number } }
  | { type: 'SET_ORPHAN_FATHER'; payload: { fatherIndex: number } }
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
  werewolfSpotted: false,
  hasDoctor: false,
  doctorCharges: 0,
  notification: null,
};

function clonePlayers(players: Player[]): Player[] {
  return players.map((player) => ({ ...player }));
}

/**
 * Pure reducer for the whole game. Any randomness (deck shuffling) is performed
 * by the caller and passed in through the action payload.
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
      const isLastPlayer = state.currentPlayerIdx === state.totalPlayers - 1;
      let werewolfSpotted = state.werewolfSpotted;
      let currentRole: string;

      if (isLastPlayer && !werewolfSpotted) {
        const werewolfIdx = availableRoles.indexOf('Werewolf');
        if (werewolfIdx > -1 && werewolfIdx !== index) {
          [availableRoles[werewolfIdx], availableRoles[index]] = [
            availableRoles[index],
            availableRoles[werewolfIdx],
          ];
        }
        currentRole = 'Werewolf';
        werewolfSpotted = true;
      } else {
        currentRole = availableRoles[index];
        if (currentRole === 'Werewolf') werewolfSpotted = true;
      }

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
        werewolfSpotted,
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

    case 'START_MODERATOR': {
      return { ...state, phase: GAME_PHASE.MODERATOR };
    }

    case 'KILL': {
      const { index, cause } = action.payload;
      const players = clonePlayers(state.players);
      const target = players[index];
      if (!target || !target.alive) return state;

      if (cause === 'werewolf' && target.role === 'Cursed') {
        const oldWolfIdx = players.findIndex(
          (player) => player.role === 'Werewolf' && player.alive,
        );

        target.role = 'Werewolf';
        target.transformedFrom = 'Cursed';
        target.hp = 1;
        target.alive = true;

        const oldWolf = oldWolfIdx === -1 ? null : players[oldWolfIdx];
        if (oldWolf) oldWolf.alive = false;

        return {
          ...state,
          players,
          notification: {
            tone: 'danger',
            title: 'Kutukan Menyebar!',
            message: oldWolf
              ? `${target.name} (Cursed) menjadi Werewolf baru, dan ${oldWolf.name} (Werewolf lama) langsung tewas!`
              : `${target.name} (Cursed) berubah menjadi Werewolf!`,
          },
        };
      }

      if (target.role === 'Strong Villager' && target.hp > 1) {
        target.hp -= 1;
        return {
          ...state,
          players,
          notification: {
            tone: 'success',
            title: 'Bangkit Lagi!',
            message: `Strong Villager punya 2 nyawa — ${target.name} bangkit! Sisa ${target.hp} nyawa. Bunuh sekali lagi untuk eliminasi.`,
          },
        };
      }

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

      return { ...state, players, notification };
    }

    case 'DOCTOR_REVIVE': {
      const { index } = action.payload;
      if (state.doctorCharges <= 0) return state;

      const players = clonePlayers(state.players);
      const target = players[index];
      if (!target || target.alive) return state;

      target.alive = true;
      target.hp = target.role === 'Strong Villager' ? 2 : 1;

      return { ...state, players, doctorCharges: state.doctorCharges - 1 };
    }

    case 'SET_ORPHAN_FATHER': {
      const { fatherIndex } = action.payload;
      const players = clonePlayers(state.players);
      const orphanIdx = players.findIndex((player) => player.role === 'Orphan');

      if (orphanIdx === -1 || fatherIndex == null) return state;
      if (fatherIndex === orphanIdx) return state;
      if (!players[fatherIndex]?.alive) return state;

      players[orphanIdx].orphanFather = fatherIndex;
      return { ...state, players };
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

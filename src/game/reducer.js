import { DRAW_STEP, GAME_PHASE } from './constants';

export const initialGameState = {
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

function clonePlayers(players) {
  return players.map((player) => ({ ...player }));
}

/**
 * Pure reducer for the whole game. Any randomness (deck shuffling) is performed
 * by the caller and passed in through the action payload.
 */
export function gameReducer(state, action) {
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
      let currentRole;

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
          currentRole: null,
          pendingName: '',
          drawStep: DRAW_STEP.NAME,
        };
      }
      return { ...state, phase: GAME_PHASE.MODERATOR, currentRole: null };
    }

    case 'KILL': {
      const { index } = action.payload;
      const players = clonePlayers(state.players);
      const target = players[index];
      if (!target || !target.alive) return state;

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

      let notification = null;
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

    case 'DISMISS_NOTIFICATION':
      return { ...state, notification: null };

    case 'RESET':
      return { ...initialGameState };

    default:
      return state;
  }
}

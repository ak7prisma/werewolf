import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';

import { GameContext, type StartResult, type Winner } from './GameContext';
import { gameReducer, initialGameState, type GameAction, type GameState } from './reducer';
import { buildNightOrder, createDeck } from './logic';
import {
  GAME_PHASE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NIGHT_STAGE,
  type NightRole,
} from './constants';
import { getRole } from '@/data/roles';
import { useAudio } from '@/audio/AudioPlayerContext';

/** Actions that change the game in a way the moderator may want to undo. */
const CHECKPOINT_ACTIONS: ReadonlySet<GameAction['type']> = new Set([
  'START_NIGHT',
  'NIGHT_CONFIRM',
  'NIGHT_SKIP',
  'NIGHT_TO_DAY',
  'DAY_BEGIN_VOTE',
  'DAY_CONFIRM',
  'DAY_SKIP',
  'HUNTER_SHOOT',
  'DOPPELGANGER_COPY',
]);

type HistoryAction = GameAction | { type: 'RETRY' };

interface GameHistory {
  past: GameState[];
  present: GameState;
}

/**
 * Wraps the pure game reducer with an undo stack so the moderator can step back
 * after a misclick. Only "meaningful" actions are checkpointed; pure selection
 * changes are not.
 */
function historyReducer(state: GameHistory, action: HistoryAction): GameHistory {
  if (action.type === 'RETRY') {
    if (state.past.length === 0) return state;
    const present = state.past[state.past.length - 1];
    return { past: state.past.slice(0, -1), present };
  }

  const present = gameReducer(state.present, action);
  if (present === state.present) return state;
  if (action.type === 'RESET') return { past: [], present };
  if (CHECKPOINT_ACTIONS.has(action.type)) {
    return { past: [...state.past, state.present], present };
  }
  return { past: state.past, present };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [history, dispatch] = useReducer(historyReducer, {
    past: [],
    present: initialGameState,
  });
  const state = history.present;
  const canRetry = history.past.length > 0;
  const { playVillageWinSfx, playWerewolfWinSfx } = useAudio();

  const startGame = useCallback((rawTotal: string): StartResult => {
    const totalPlayers = Number.parseInt(rawTotal, 10);
    if (Number.isNaN(totalPlayers) || totalPlayers < MIN_PLAYERS || totalPlayers > MAX_PLAYERS) {
      return {
        ok: false,
        error: `Jumlah pemain harus antara ${MIN_PLAYERS} sampai ${MAX_PLAYERS}!`,
      };
    }
    dispatch({
      type: 'SETUP_START',
      payload: { totalPlayers, roles: createDeck(totalPlayers) },
    });
    return { ok: true };
  }, []);

  const dealCards = useCallback((name: string): StartResult => {
    const trimmed = (name ?? '').trim();
    if (!trimmed) {
      return { ok: false, error: 'Ketik namamu dulu sebelum mengambil kartu!' };
    }
    dispatch({ type: 'DEAL', payload: { name: trimmed } });
    return { ok: true };
  }, []);

  const pickCard = useCallback(
    (index: number) => dispatch({ type: 'PICK', payload: { index } }),
    [],
  );
  const nextPlayer = useCallback(() => dispatch({ type: 'NEXT_PLAYER' }), []);

  const startNight = useCallback(() => {
    const round = state.phase === GAME_PHASE.DRAW ? 1 : state.round + 1;
    const order = buildNightOrder(state.players, state.doctorCharges, round);
    dispatch({ type: 'START_NIGHT', payload: { order } });
  }, [state.players, state.doctorCharges, state.phase, state.round]);

  const nightBeginCall = useCallback(() => dispatch({ type: 'NIGHT_BEGIN_CALL' }), []);
  const nightSelect = useCallback(
    (index: number) => dispatch({ type: 'NIGHT_SELECT', payload: { index } }),
    [],
  );
  const nightConfirm = useCallback(() => dispatch({ type: 'NIGHT_CONFIRM' }), []);
  const nightSkip = useCallback(() => dispatch({ type: 'NIGHT_SKIP' }), []);
  const nightToDay = useCallback(() => dispatch({ type: 'NIGHT_TO_DAY' }), []);
  const clearSelection = useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []);

  const dayBeginVote = useCallback(() => dispatch({ type: 'DAY_BEGIN_VOTE' }), []);
  const daySelect = useCallback(
    (index: number) => dispatch({ type: 'DAY_SELECT', payload: { index } }),
    [],
  );
  const dayConfirm = useCallback(() => dispatch({ type: 'DAY_CONFIRM' }), []);
  const daySkip = useCallback(() => dispatch({ type: 'DAY_SKIP' }), []);

  const hunterSelect = useCallback(
    (index: number) => dispatch({ type: 'HUNTER_SELECT', payload: { index } }),
    [],
  );
  const shootWithHunter = useCallback(
    (targetIndex: number) => dispatch({ type: 'HUNTER_SHOOT', payload: { targetIndex } }),
    [],
  );
  const copyRoleWithDoppelganger = useCallback(
    (targetIndex: number) => dispatch({ type: 'DOPPELGANGER_COPY', payload: { targetIndex } }),
    [],
  );
  const dismissNotification = useCallback(() => dispatch({ type: 'DISMISS_NOTIFICATION' }), []);
  const resetGame = useCallback(() => dispatch({ type: 'RESET' }), []);
  const retry = useCallback(() => dispatch({ type: 'RETRY' }), []);

  const derived = useMemo(() => {
    const king = state.players.find((player) => player.role === 'King' && player.alive) ?? null;

    const doppelgangerIndex = state.players.findIndex((player) => player.role === 'Doppelganger');
    const doppelganger = doppelgangerIndex === -1 ? null : state.players[doppelgangerIndex];
    const canCopyRole =
      doppelgangerIndex !== -1 &&
      state.players.some((player, index) => !player.alive && index !== doppelgangerIndex);

    const currentNightRole: NightRole | null =
      state.phase === GAME_PHASE.NIGHT && state.nightStage === NIGHT_STAGE.CALL
        ? (state.nightOrder[state.nightIndex] ?? null)
        : null;

    const alivePlayers = state.players.filter((player) => player.alive);
    const aliveWolves = alivePlayers.filter(
      (player) => getRole(player.role)?.team === 'werewolf',
    ).length;
    const aliveVillage = alivePlayers.length - aliveWolves;

    let winner: Winner | null = null;
    if (
      (state.phase === GAME_PHASE.NIGHT || state.phase === GAME_PHASE.DAY) &&
      state.players.length > 0 &&
      state.pendingHunter === null
    ) {
      if (aliveWolves === 0) winner = 'village';
      else if (aliveWolves >= aliveVillage) winner = 'werewolf';
    }

    return { king, doppelgangerIndex, doppelganger, canCopyRole, currentNightRole, winner };
  }, [state.players, state.phase, state.nightStage, state.nightOrder, state.nightIndex, state.pendingHunter]);

  const playedWinnerRef = useRef<Winner | null>(null);

  useEffect(() => {
    const winner = derived.winner;
    if (winner === playedWinnerRef.current) return;
    if (winner === 'village') playVillageWinSfx();
    else if (winner === 'werewolf') playWerewolfWinSfx();
    playedWinnerRef.current = winner;
  }, [derived.winner, playVillageWinSfx, playWerewolfWinSfx]);

  const value = useMemo(
    () => ({
      state,
      ...derived,
      canRetry,
      startGame,
      dealCards,
      pickCard,
      nextPlayer,
      startNight,
      nightBeginCall,
      nightSelect,
      nightConfirm,
      nightSkip,
      nightToDay,
      clearSelection,
      dayBeginVote,
      daySelect,
      dayConfirm,
      daySkip,
      hunterSelect,
      shootWithHunter,
      copyRoleWithDoppelganger,
      dismissNotification,
      resetGame,
      retry,
    }),
    [
      state,
      derived,
      canRetry,
      startGame,
      dealCards,
      pickCard,
      nextPlayer,
      startNight,
      nightBeginCall,
      nightSelect,
      nightConfirm,
      nightSkip,
      nightToDay,
      clearSelection,
      dayBeginVote,
      daySelect,
      dayConfirm,
      daySkip,
      hunterSelect,
      shootWithHunter,
      copyRoleWithDoppelganger,
      dismissNotification,
      resetGame,
      retry,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

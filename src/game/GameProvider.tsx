import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';

import { GameContext, type StartResult, type Winner } from './GameContext';
import { gameReducer, initialGameState } from './reducer';
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

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
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

  const dayBeginVote = useCallback(() => dispatch({ type: 'DAY_BEGIN_VOTE' }), []);
  const daySelect = useCallback(
    (index: number) => dispatch({ type: 'DAY_SELECT', payload: { index } }),
    [],
  );
  const dayConfirm = useCallback(() => dispatch({ type: 'DAY_CONFIRM' }), []);
  const daySkip = useCallback(() => dispatch({ type: 'DAY_SKIP' }), []);

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
      dayBeginVote,
      daySelect,
      dayConfirm,
      daySkip,
      shootWithHunter,
      copyRoleWithDoppelganger,
      dismissNotification,
      resetGame,
    }),
    [
      state,
      derived,
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
      dayBeginVote,
      daySelect,
      dayConfirm,
      daySkip,
      shootWithHunter,
      copyRoleWithDoppelganger,
      dismissNotification,
      resetGame,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

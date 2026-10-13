import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';

import { GameContext, type StartResult, type Winner } from './GameContext';
import { gameReducer, initialGameState, type KillCause } from './reducer';
import { createDeck } from './logic';
import { GAME_PHASE, MAX_PLAYERS, MIN_PLAYERS } from './constants';
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
  const startModerator = useCallback(() => dispatch({ type: 'START_MODERATOR' }), []);
  const killPlayer = useCallback(
    (index: number, cause: KillCause) => dispatch({ type: 'KILL', payload: { index, cause } }),
    [],
  );
  const reviveWithDoctor = useCallback(
    (index: number) => dispatch({ type: 'DOCTOR_REVIVE', payload: { index } }),
    [],
  );
  const setOrphanFather = useCallback(
    (fatherIndex: number) => dispatch({ type: 'SET_ORPHAN_FATHER', payload: { fatherIndex } }),
    [],
  );
  const copyRoleWithDoppelganger = useCallback(
    (targetIndex: number) => dispatch({ type: 'DOPPELGANGER_COPY', payload: { targetIndex } }),
    [],
  );
  const dismissNotification = useCallback(() => dispatch({ type: 'DISMISS_NOTIFICATION' }), []);
  const resetGame = useCallback(() => dispatch({ type: 'RESET' }), []);

  const derived = useMemo(() => {
    const orphanIndex = state.players.findIndex((player) => player.role === 'Orphan');
    const orphan = orphanIndex === -1 ? null : state.players[orphanIndex];
    const orphanFatherPending =
      orphan !== null && orphan.orphanFather === null && orphan.alive;
    const king = state.players.find((player) => player.role === 'King' && player.alive) ?? null;
    const canRevive = state.hasDoctor && state.doctorCharges > 0;

    const doppelgangerIndex = state.players.findIndex((player) => player.role === 'Doppelganger');
    const doppelganger = doppelgangerIndex === -1 ? null : state.players[doppelgangerIndex];
    const canCopyRole =
      doppelgangerIndex !== -1 &&
      state.players.some((player, index) => !player.alive && index !== doppelgangerIndex);

    const alivePlayers = state.players.filter((player) => player.alive);
    const aliveWolves = alivePlayers.filter(
      (player) => getRole(player.role)?.team === 'werewolf',
    ).length;
    const aliveVillage = alivePlayers.length - aliveWolves;

    let winner: Winner | null = null;
    if (state.phase === GAME_PHASE.MODERATOR && state.players.length > 0) {
      if (aliveWolves === 0) winner = 'village';
      else if (aliveWolves >= aliveVillage) winner = 'werewolf';
    }

    return {
      orphanIndex,
      orphan,
      orphanFatherPending,
      king,
      canRevive,
      doppelgangerIndex,
      doppelganger,
      canCopyRole,
      winner,
    };
  }, [state.players, state.hasDoctor, state.doctorCharges, state.phase]);

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
      startModerator,
      killPlayer,
      reviveWithDoctor,
      setOrphanFather,
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
      startModerator,
      killPlayer,
      reviveWithDoctor,
      setOrphanFather,
      copyRoleWithDoppelganger,
      dismissNotification,
      resetGame,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

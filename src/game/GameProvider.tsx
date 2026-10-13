import { useCallback, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';

import { GameContext, type StartResult } from './GameContext';
import { gameReducer, initialGameState } from './reducer';
import { createDeck } from './logic';
import { MAX_PLAYERS, MIN_PLAYERS } from './constants';

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

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
    (index: number) => dispatch({ type: 'KILL', payload: { index } }),
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
  const dismissNotification = useCallback(() => dispatch({ type: 'DISMISS_NOTIFICATION' }), []);
  const resetGame = useCallback(() => dispatch({ type: 'RESET' }), []);

  const derived = useMemo(() => {
    const orphanIndex = state.players.findIndex((player) => player.role === 'Orphan');
    const orphan = orphanIndex === -1 ? null : state.players[orphanIndex];
    const orphanFatherPending =
      orphan !== null && orphan.orphanFather === null && orphan.alive;
    const king = state.players.find((player) => player.role === 'King' && player.alive) ?? null;
    const canRevive = state.hasDoctor && state.doctorCharges > 0;

    return { orphanIndex, orphan, orphanFatherPending, king, canRevive };
  }, [state.players, state.hasDoctor, state.doctorCharges]);

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
      dismissNotification,
      resetGame,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

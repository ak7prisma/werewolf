import { createContext, useContext } from 'react';

import type { GameState, KillCause, Player } from './reducer';

export interface StartResult {
  ok: boolean;
  error?: string;
}

export type Winner = 'village' | 'werewolf';

export interface GameContextValue {
  state: GameState;
  orphanIndex: number;
  orphan: Player | null;
  orphanFatherPending: boolean;
  king: Player | null;
  canRevive: boolean;
  doppelgangerIndex: number;
  doppelganger: Player | null;
  canCopyRole: boolean;
  winner: Winner | null;
  startGame: (rawTotal: string) => StartResult;
  dealCards: (name: string) => StartResult;
  pickCard: (index: number) => void;
  nextPlayer: () => void;
  startModerator: () => void;
  killPlayer: (index: number, cause: KillCause) => void;
  reviveWithDoctor: (index: number) => void;
  setOrphanFather: (fatherIndex: number) => void;
  copyRoleWithDoppelganger: (targetIndex: number) => void;
  dismissNotification: () => void;
  resetGame: () => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a <GameProvider>');
  }
  return context;
}

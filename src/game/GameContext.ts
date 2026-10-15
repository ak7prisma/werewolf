import { createContext, useContext } from 'react';

import type { GameState, Player } from './reducer';
import type { NightRole } from './constants';

export interface StartResult {
  ok: boolean;
  error?: string;
}

export type Winner = 'village' | 'werewolf' | 'fool';

export interface GameContextValue {
  state: GameState;
  king: Player | null;
  doppelgangerIndex: number;
  doppelganger: Player | null;
  canCopyRole: boolean;
  /** Role the moderator is currently calling, or null outside a night call. */
  currentNightRole: NightRole | null;
  winner: Winner | null;
  /** Whether there is a previous action that can be undone. */
  canRetry: boolean;
  startGame: (rawTotal: string) => StartResult;
  dealCards: (name: string) => StartResult;
  pickCard: (index: number) => void;
  nextPlayer: () => void;
  startNight: () => void;
  nightBeginCall: () => void;
  nightSelect: (index: number) => void;
  nightConfirm: () => void;
  nightSkip: () => void;
  nightToDay: () => void;
  clearSelection: () => void;
  dayBeginVote: () => void;
  daySelect: (index: number) => void;
  dayConfirm: () => void;
  daySkip: () => void;
  hunterSelect: (index: number) => void;
  shootWithHunter: (targetIndex: number) => void;
  copyRoleWithDoppelganger: (targetIndex: number) => void;
  dismissNotification: () => void;
  resetGame: () => void;
  /** Undo the last meaningful action (offline moderator only). */
  retry: () => void;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a <GameProvider>');
  }
  return context;
}

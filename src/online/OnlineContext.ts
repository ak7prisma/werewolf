import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

import type { GameView, Room, RoomPlayer } from './onlineTypes';

export type OnlineStatus = 'unconfigured' | 'loading' | 'ready' | 'error';

export interface OnlineContextValue {
  status: OnlineStatus;
  error: string | null;
  user: User | null;
  displayName: string;
  room: Room | null;
  players: RoomPlayer[];
  myRole: string | null;
  game: GameView | null;
  isHost: boolean;
  createRoom: (name: string) => Promise<void>;
  joinRoom: (code: string, name: string) => Promise<void>;
  setReady: (ready: boolean) => Promise<void>;
  leaveRoom: () => Promise<void>;
  deleteRoom: () => Promise<void>;
  startGame: () => Promise<void>;
  reload: () => Promise<void>;
  submitNightAction: (targetSeat: number | null) => Promise<void>;
  submitVote: (targetSeat: number | null) => Promise<void>;
  submitDayReady: () => Promise<void>;
  submitKingVote: (targetSeat: number) => Promise<void>;
  submitHunterShot: (targetSeat: number) => Promise<void>;
  playAgain: () => Promise<void>;
}

export const OnlineContext = createContext<OnlineContextValue | null>(null);

export function useOnline(): OnlineContextValue {
  const context = useContext(OnlineContext);
  if (!context) {
    throw new Error('useOnline must be used within an <OnlineProvider>');
  }
  return context;
}

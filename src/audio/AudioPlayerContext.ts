import { createContext, useContext } from 'react';

export interface AudioApi {
  playCardSfx: () => void;
  playVillageWinSfx: () => void;
  playWerewolfWinSfx: () => void;
  muted: boolean;
  toggleMuted: () => void;
}

export const AudioPlayerContext = createContext<AudioApi | null>(null);

export function useAudio(): AudioApi {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudio must be used within an <AudioProvider>');
  }
  return context;
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { AudioPlayerContext, type AudioApi } from './AudioPlayerContext';
import { AudioEngine } from './engine';

export function AudioProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(() => new AudioEngine());
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const unlock = () => {
      void engine.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [engine]);

  useEffect(() => {
    engine.setMuted(muted);
  }, [engine, muted]);

  useEffect(() => {
    return () => engine.dispose();
  }, [engine]);

  const playCardSfx = useCallback(() => engine.playCard(), [engine]);
  const playVillageWinSfx = useCallback(() => engine.playWin('village'), [engine]);
  const playWerewolfWinSfx = useCallback(() => engine.playWin('werewolf'), [engine]);
  const toggleMuted = useCallback(() => setMuted((value) => !value), []);

  const value = useMemo<AudioApi>(
    () => ({
      playCardSfx,
      playVillageWinSfx,
      playWerewolfWinSfx,
      muted,
      toggleMuted,
    }),
    [playCardSfx, playVillageWinSfx, playWerewolfWinSfx, muted, toggleMuted],
  );

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

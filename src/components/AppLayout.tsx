import { Outlet } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';

import { NavTabs } from '@/components/NavTabs';
import { useAudio } from '@/audio/AudioPlayerContext';

export function AppLayout() {
  const { muted, toggleMuted } = useAudio();

  return (
    <div className="flex min-h-screen items-start justify-center px-3.5 py-5 md:items-center md:py-10">
      <main className="w-full max-w-[480px] rounded-[20px] bg-card p-6 pb-8 text-center neo-border neo-shadow-lg md:max-w-[520px]">
        <NavTabs />
        <Outlet />
      </main>

      <button
        type="button"
        aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
        aria-pressed={muted}
        onClick={toggleMuted}
        className="fixed right-4 bottom-4 z-50 grid size-11 place-items-center rounded-full bg-secondary text-secondary-foreground neo-border neo-shadow transition hover:bg-info hover:text-info-foreground"
      >
        {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>
    </div>
  );
}

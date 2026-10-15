import { Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SectionTitle, Subtitle } from '@/components/SectionTitle';
import { useOnline } from '@/online/OnlineContext';
import { CreateJoinForm } from '@/online/CreateJoinForm';
import { RoomLobby } from '@/online/RoomLobby';
import { GameBoard } from '@/online/GameBoard';

export function OnlinePage() {
  return <OnlineView />;
}

function OnlineView() {
  const { status, error, room } = useOnline();

  if (status === 'unconfigured') {
    return (
      <section className="flex flex-col items-center">
        <SectionTitle>
          Main Online{' '}
          <span className="align-middle rounded-full bg-accent px-2 py-0.5 text-xs font-black tracking-wider text-accent-foreground uppercase">
            Beta
          </span>
        </SectionTitle>
        <Subtitle>Bermain Werewolf bersama teman di perangkat masing-masing.</Subtitle>
        <p className="max-w-md text-center text-sm font-semibold text-muted-foreground">
          Sistem membagikan peran, menjalankan fase malam &amp; siang, menghitung voting, dan
          menentukan pemenang secara otomatis - tanpa moderator. Buat room, bagikan kode
          5&nbsp;karakter ke teman, lalu mulai saat semua pemain (minimal&nbsp;4) sudah siap.
        </p>
      </section>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <section className="flex flex-col items-center">
        <SectionTitle>Koneksi Bermasalah</SectionTitle>
        <Subtitle>{error ?? 'Gagal menyiapkan sesi online.'}</Subtitle>
        <Button className="mt-2" onClick={() => window.location.reload()}>
          <RefreshCw />
          Coba Lagi
        </Button>
      </section>
    );
  }

  return room ? (room.status === 'lobby' ? <RoomLobby /> : <GameBoard />) : <CreateJoinForm />;
}

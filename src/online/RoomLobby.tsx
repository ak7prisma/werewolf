import { useState } from 'react';
import { Check, Copy, Crown, LogOut, Play, ShieldCheck, UserCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle, Subtitle } from '@/components/SectionTitle';
import { useModal } from '@/components/ModalContext';
import { useOnline } from '@/online/OnlineContext';

export function RoomLobby() {
  const { room, players, user, isHost, setReady, leaveRoom, startGame } = useOnline();
  const { alert, confirm } = useModal();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const me = players.find((player) => player.user_id === user?.id) ?? null;
  const guests = players.filter((player) => !player.is_host);
  const allReady = guests.every((player) => player.is_ready);
  const canStart = players.length >= room.min_players && allReady;

  async function copyCode() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  async function withBusy(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (err) {
      await alert({
        title: 'Gagal',
        description: err instanceof Error ? err.message : String(err),
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    const ok = await confirm({
      title: 'Keluar Room?',
      description: isHost ? 'Kamu host — room akan dibubarkan.' : 'Kamu akan keluar dari lobby.',
      tone: 'warning',
    });
    if (ok) await withBusy(leaveRoom);
  }

  return (
    <section className="flex flex-col items-center">
      <SectionTitle>Lobby</SectionTitle>
      <Subtitle>Bagikan kode ini ke temanmu.</Subtitle>

      <button
        type="button"
        onClick={copyCode}
        className="mb-4 inline-flex items-center gap-3 rounded-xl bg-secondary px-5 py-3 text-2xl font-black tracking-[0.4em] text-secondary-foreground neo-border neo-shadow transition hover:bg-info hover:text-info-foreground"
      >
        {room.code}
        {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
      </button>

      <div className="w-full">
        <div className="mb-2 flex items-center justify-between text-xs font-black tracking-wide text-muted-foreground uppercase">
          <span>Pemain</span>
          <span>
            {players.length}/{room.max_players} · min {room.min_players}
          </span>
        </div>

        <ul className="flex w-full flex-col gap-2">
          {players.map((player) => (
            <li key={player.id}>
              <Card
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: player.user_id === user?.id ? '#1f1f33' : undefined }}
              >
                <span className="flex items-center gap-2 truncate">
                  {player.is_host ? (
                    <Crown className="size-4 shrink-0 text-accent" />
                  ) : (
                    <UserCheck className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <strong className="truncate text-sm font-black">
                    {player.display_name}
                    {player.user_id === user?.id ? ' (kamu)' : ''}
                  </strong>
                </span>
                {player.is_host ? (
                  <Badge variant="primary">Host</Badge>
                ) : player.is_ready ? (
                  <Badge variant="success">
                    <ShieldCheck className="size-3" /> Siap
                  </Badge>
                ) : (
                  <Badge variant="muted">Menunggu</Badge>
                )}
              </Card>
            </li>
          ))}
        </ul>

        {isHost ? (
          <Button
            block
            className="mt-4"
            disabled={busy || !canStart}
            onClick={() => withBusy(startGame)}
          >
            <Play />
            {canStart ? 'Mulai Game' : 'Menunggu semua siap…'}
          </Button>
        ) : (
          <Button
            block
            variant={me?.is_ready ? 'outline' : 'success'}
            className="mt-4"
            disabled={busy}
            onClick={() => withBusy(() => setReady(!me?.is_ready))}
          >
            <Check />
            {me?.is_ready ? 'Batal Siap' : 'Siap'}
          </Button>
        )}
      </div>

      <Button variant="ghost" size="sm" className="mt-4" disabled={busy} onClick={handleLeave}>
        <LogOut />
        Keluar
      </Button>
    </section>
  );
}

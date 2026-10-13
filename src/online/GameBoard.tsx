import { useEffect, useRef, useState } from 'react';
import { Crosshair, Crown, LogOut, Moon, RotateCcw, Skull, Sun, Vote } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle, Subtitle } from '@/components/SectionTitle';
import { useModal } from '@/components/ModalContext';
import { useOnline } from '@/online/OnlineContext';
import { getRole } from '@/data/roles';
import { cn } from '@/lib/utils';
import type { GamePlayerView } from '@/online/onlineTypes';

function useCountdown(deadline: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  if (!deadline) return 0;
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
}

function phaseLabel(phase: string, stage: string | null, round: number): string {
  if (phase === 'finished') return 'Permainan Selesai';
  if (phase === 'night') {
    if (stage === 'dawn') return `Fajar · Malam ke-${round}`;
    if (stage === 'hunter') return 'Pemburu Membidik';
    return `Malam ke-${round}`;
  }
  if (stage === 'vote') return `Voting · Siang ke-${round}`;
  if (stage === 'king') return `Keputusan Raja · Siang ke-${round}`;
  if (stage === 'result') return `Hasil · Siang ke-${round}`;
  return `Siang ke-${round}`;
}

type ActionMode = 'night' | 'vote' | 'king' | 'hunter';

function nightPrompt(call: string): string {
  switch (call) {
    case 'Werewolf':
      return 'Pilih pemain yang ingin dimangsa malam ini.';
    case 'Seer':
      return 'Terawang satu pemain: apakah dia Werewolf atau bukan.';
    case 'Guardian':
      return 'Lindungi satu pemain dari serangan Werewolf.';
    case 'Doctor':
      return 'Pilih pemain yang sudah mati untuk dihidupkan kembali.';
    case 'Orphan':
      return 'Pilih satu pemain sebagai bapak angkatmu.';
    case 'Doppelganger':
      return 'Pilih pemain mati untuk kamu tiru perannya.';
    default:
      return 'Pilih targetmu.';
  }
}

function actionInfo(mode: ActionMode, call: string | null) {
  switch (mode) {
    case 'night':
      return {
        title: `Giliranmu${call ? ` · ${call}` : ''}`,
        description: nightPrompt(call ?? ''),
        confirmLabel: 'Pilih',
        icon: <Moon className="size-4" />,
      };
    case 'vote':
      return {
        title: 'Voting',
        description: 'Klik kartu pemain yang ingin kamu gantung, lalu tekan Vote.',
        confirmLabel: 'Vote',
        icon: <Vote className="size-4" />,
      };
    case 'king':
      return {
        title: 'Keputusan Raja',
        description: 'Voting seri! Klik kandidat yang ingin dieliminasi.',
        confirmLabel: 'Eliminasi',
        icon: <Crown className="size-4" />,
      };
    case 'hunter':
      return {
        title: 'Tembakan Terakhir',
        description: 'Kamu Hunter yang gugur. Klik satu pemain untuk ditembak.',
        confirmLabel: 'Tembak',
        icon: <Crosshair className="size-4" />,
      };
  }
}

export function GameBoard() {
  const {
    game,
    isHost,
    leaveRoom,
    submitNightAction,
    submitVote,
    submitKingVote,
    submitHunterShot,
    playAgain,
  } = useOnline();
  const { alert } = useModal();
  const [busy, setBusy] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const remaining = useCountdown(game?.room.deadline ?? null);
  const notified = useRef(false);
  const reportShown = useRef<number | null>(null);

  const you = game?.you ?? null;
  const myRoll = you?.role ? getRole(you.role) : null;

  useEffect(() => {
    if (!game || game.room.phase !== 'finished') {
      notified.current = false;
      return;
    }
    if (notified.current) return;
    notified.current = true;
    const werewolfWon = game.winner === 'werewolf';
    void alert({
      title: werewolfWon ? 'Werewolf Menang!' : 'Warga Desa Menang!',
      description: werewolfWon
        ? 'Kegelapan menelan desa. Tekan "Main Lagi" untuk mengulang.'
        : 'Semua Werewolf berhasil dihabisi. Tekan "Main Lagi" untuk mengulang.',
      tone: werewolfWon ? 'danger' : 'success',
    });
  }, [game, alert]);

  // Pop up "berita pagi" sekali tiap siang — tanpa menyebut alasan.
  useEffect(() => {
    if (!game || game.room.phase !== 'day') return;
    if (reportShown.current === game.room.round) return;
    reportShown.current = game.room.round;
    const lines = game.dayReport ?? [];
    void alert({
      title: 'Berita Pagi Ini',
      description: (lines.length ? lines : ['Semalam sunyi, tidak ada yang tewas.']).join('\n'),
      tone: 'info',
    });
  }, [game, alert]);

  if (!game || !you) {
    return (
      <section className="flex flex-col items-center">
        <SectionTitle>Memuat Permainan…</SectionTitle>
      </section>
    );
  }

  const players = game.players ?? [];
  const allies = you.allies ?? [];
  const finished = game.room.phase === 'finished';

  const alivePlayers = players.filter((player) => player.alive);
  const candidates = players.filter((player) => (game.candidates ?? []).includes(player.seat));
  const kingTargets = players.filter((player) => (game.kingCandidates ?? []).includes(player.seat));
  const voteTargets = alivePlayers;
  const huntTargets = alivePlayers.filter((player) => player.seat !== you.seat);

  const myTurn = !finished && you.alive && you.isYourTurn && game.call !== null;
  const actionMode: ActionMode | null = finished
    ? null
    : you.awaitingHunter
      ? 'hunter'
      : you.isKing
        ? 'king'
        : myTurn && game.call
          ? 'night'
          : you.canVote
            ? 'vote'
            : null;

  const targets =
    actionMode === 'night'
      ? candidates
      : actionMode === 'vote'
        ? voteTargets
        : actionMode === 'king'
          ? kingTargets
          : actionMode === 'hunter'
            ? huntTargets
            : [];
  const targetSeats = new Set(targets.map((player) => player.seat));
  const selected = selectedSeat !== null && targetSeats.has(selectedSeat) ? selectedSeat : null;
  const canSkip = actionMode === 'night' || actionMode === 'vote';

  async function act(action: () => Promise<void>) {
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

  async function confirmAction() {
    if (selected === null || actionMode === null) return;
    if (actionMode === 'night') await act(() => submitNightAction(selected));
    else if (actionMode === 'vote') await act(() => submitVote(selected));
    else if (actionMode === 'king') await act(() => submitKingVote(selected));
    else if (actionMode === 'hunter') await act(() => submitHunterShot(selected));
    setSelectedSeat(null);
  }

  async function skipAction() {
    if (actionMode === 'night') await act(() => submitNightAction(null));
    else if (actionMode === 'vote') await act(() => submitVote(null));
    setSelectedSeat(null);
  }

  const info = actionMode ? actionInfo(actionMode, game.call) : null;

  return (
    <section className="flex w-full flex-col items-center">
      <SectionTitle>{phaseLabel(game.room.phase, game.room.stage, game.room.round)}</SectionTitle>
      <Subtitle>
        Kode room <strong className="text-foreground">{game.room.code}</strong>
        {!finished && game.room.deadline ? ` · ${remaining}s` : ''}
      </Subtitle>

      {finished && (
        <Card className="mb-4 w-full rounded-2xl px-4 py-5 text-center neo-shadow">
          <p className="text-xs font-black tracking-widest text-muted-foreground uppercase">
            Pemenang
          </p>
          <strong className="mt-1 block text-2xl font-black tracking-wide uppercase">
            {game.winner === 'werewolf' ? 'Werewolf' : 'Warga Desa'}
          </strong>
          <p className="mt-2 text-sm font-semibold text-[#c5c5d5]">
            {game.winner === 'werewolf'
              ? 'Kegelapan menelan desa. Werewolf menang!'
              : 'Desa bersorak. Semua Werewolf berhasil dihabisi!'}
          </p>
        </Card>
      )}

      {myRoll?.name === 'Seer' && you.seer && !finished && (
        <Card className="mb-4 w-full rounded-2xl px-4 py-5 text-center neo-shadow">
          <p className="text-xs font-black tracking-widest text-muted-foreground uppercase">
            Hasil Terawang
          </p>
          <strong className="mt-1 block text-sm font-bold text-foreground">
            {nameOf(players, you.seer.target_seat)}
          </strong>
          <div
            className={`mx-auto mt-3 flex size-20 items-center justify-center rounded-2xl text-4xl font-black uppercase neo-border neo-shadow ${
              you.seer.is_threat
                ? 'bg-primary text-primary-foreground'
                : 'bg-success text-success-foreground'
            }`}
          >
            {you.seer.is_threat ? 'W' : 'V'}
          </div>
          <p className="mt-3 text-xs font-semibold text-[#c5c5d5]">
            {you.seer.is_threat ? 'Werewolf (musuh!)' : 'Bukan Werewolf (aman)'}
          </p>
        </Card>
      )}

      {!finished && info && (
        <Card className="mb-4 w-full rounded-2xl px-4 py-4 neo-shadow">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-accent">{info.icon}</span>
            <strong className="text-sm font-black tracking-wide uppercase">{info.title}</strong>
          </div>
          <p className="mb-3 text-xs font-semibold text-muted-foreground">{info.description}</p>
          {targets.length === 0 && (
            <p className="mb-3 text-xs font-semibold text-muted-foreground">
              Tidak ada target tersedia.
            </p>
          )}
          <div className="flex gap-2">
            <Button block disabled={busy || selected === null} onClick={confirmAction}>
              {info.confirmLabel}
            </Button>
            {canSkip && (
              <Button variant="outline" disabled={busy} onClick={skipAction}>
                Lewati
              </Button>
            )}
          </div>
        </Card>
      )}

      {!finished && !info && (
        <Card className="mb-4 w-full rounded-2xl px-4 py-4 text-center neo-shadow">
          <p className="text-sm font-semibold text-muted-foreground">Menunggu pemain lain…</p>
        </Card>
      )}

      {myRoll && (
        <Card className="mb-4 w-full rounded-2xl px-4 py-4 neo-shadow">
          <div className="flex items-center gap-3">
            <myRoll.icon className="size-10 shrink-0 text-accent" />
            <div className="min-w-0">
              <strong className="block text-lg font-black tracking-wide uppercase">
                {myRoll.name}
              </strong>
              <p className="text-xs font-semibold text-[#c5c5d5]">{myRoll.description}</p>
            </div>
          </div>
          {allies.length > 0 && (
            <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold">
              Rekan Werewolf:{' '}
              <strong>{allies.map((seat) => nameOf(players, seat)).join(', ')}</strong>
            </p>
          )}
        </Card>
      )}

      <p className="mb-2 self-start text-xs font-black tracking-wide text-muted-foreground uppercase">
        Pemain
      </p>
      <ul className="flex w-full flex-col gap-2">
        {players.map((player) => {
          const isTarget = targetSeats.has(player.seat);
          const isSelected = selected === player.seat;
          const dimmed = actionMode !== null && !isTarget;
          return (
            <li key={player.seat}>
              <Card
                role={isTarget ? 'button' : undefined}
                onClick={isTarget ? () => setSelectedSeat(player.seat) : undefined}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition',
                  isTarget && 'cursor-pointer hover:-translate-y-0.5 neo-border',
                  isSelected && 'bg-accent text-accent-foreground',
                  dimmed && 'opacity-40',
                )}
                style={{
                  backgroundColor:
                    !isSelected && player.seat === you.seat ? '#1f1f33' : undefined,
                }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {player.alive ? (
                    <Sun className="size-4 shrink-0 text-success" />
                  ) : (
                    <Skull className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <strong
                    className={`truncate text-sm font-black ${player.alive ? '' : 'line-through opacity-60'}`}
                  >
                    {player.name}
                    {player.seat === you.seat ? ' (kamu)' : ''}
                  </strong>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {isSelected && <Badge variant="primary">Dipilih</Badge>}
                  {finished && player.hp > 1 && (
                    <Badge variant="success">{player.hp} nyawa</Badge>
                  )}
                  {player.transformedFrom && (
                    <Badge variant="danger">{player.transformedFrom}</Badge>
                  )}
                  {player.role ? (
                    <Badge variant="primary">{player.role}</Badge>
                  ) : (
                    <Badge variant={player.alive ? 'muted' : 'danger'}>
                      {player.alive ? 'Hidup' : 'Tewas'}
                    </Badge>
                  )}
                </span>
              </Card>
            </li>
          );
        })}
      </ul>

      {finished && (
        <div className="mt-4 flex w-full gap-2">
          {isHost ? (
            <>
              <Button block disabled={busy} onClick={() => act(playAgain)}>
                <RotateCcw />
                Main Lagi
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => act(leaveRoom)}>
                Bubarkan
              </Button>
            </>
          ) : (
            <Button block variant="outline" disabled={busy} onClick={() => act(leaveRoom)}>
              <LogOut />
              Keluar
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function nameOf(players: GamePlayerView[], seat: number | null): string {
  if (seat === null) return '—';
  return players.find((player) => player.seat === seat)?.name ?? `Kursi ${seat}`;
}

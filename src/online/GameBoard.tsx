import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Crown, Crosshair, LogOut, Moon, RotateCcw, Skull, Sun, Vote } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle, Subtitle } from '@/components/SectionTitle';
import { useModal } from '@/components/ModalContext';
import { useOnline } from '@/online/OnlineContext';
import { getRole } from '@/data/roles';
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
  const remaining = useCountdown(game?.room.deadline ?? null);
  const notified = useRef(false);

  const you = game?.you ?? null;
  const myRoll = you?.role ? getRole(you.role) : null;

  useEffect(() => {
    if (game?.room.phase === 'finished') {
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
    } else if (game) {
      notified.current = false;
    }
  }, [game, alert]);

  const alivePlayers = useMemo(
    () => (game?.players ?? []).filter((player) => player.alive),
    [game],
  );

  const candidates = useMemo(() => {
    if (!game || !you) return [];
    const seats = game.candidates ?? [];
    return game.players.filter((player) => seats.includes(player.seat));
  }, [game, you]);

  const voteTargets = alivePlayers;
  const huntTargets = alivePlayers.filter((player) => player.seat !== you?.seat);
  const kingTargets = useMemo(() => {
    if (!game || !you) return [];
    const seats = game.kingCandidates ?? [];
    return game.players.filter((player) => seats.includes(player.seat));
  }, [game, you]);

  if (!game || !you) {
    return (
      <section className="flex flex-col items-center">
        <SectionTitle>Memuat Permainan…</SectionTitle>
      </section>
    );
  }

  const finished = game.room.phase === 'finished';
  const myTurn = !finished && you.alive && you.isYourTurn && game.call !== null;

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
            {nameOf(game.players, you.seer.target_seat)}
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

      <ActionPanel
        busy={busy}
        finished={finished}
        myTurn={myTurn}
        call={game.call}
        you={you}
        candidates={candidates}
        voteTargets={voteTargets}
        huntTargets={huntTargets}
        kingTargets={kingTargets}
        act={act}
        submitNightAction={submitNightAction}
        submitVote={submitVote}
        submitKingVote={submitKingVote}
        submitHunterShot={submitHunterShot}
      />

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
          {you.allies.length > 0 && (
            <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold">
              Rekan Werewolf:{' '}
              <strong>{you.allies.map((seat) => nameOf(game.players, seat)).join(', ')}</strong>
            </p>
          )}
        </Card>
      )}

      <p className="mb-2 self-start text-xs font-black tracking-wide text-muted-foreground uppercase">
        Pemain
      </p>
      <ul className="flex w-full flex-col gap-2">
        {game.players.map((player) => (
          <li key={player.seat}>
            <Card
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: player.seat === you.seat ? '#1f1f33' : undefined }}
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
                {player.hp > 1 && <Badge variant="success">{player.hp} nyawa</Badge>}
                {player.transformedFrom && <Badge variant="danger">{player.transformedFrom}</Badge>}
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
        ))}
      </ul>

      {game.events.length > 0 && (
        <div className="mt-5 w-full">
          <p className="mb-2 text-xs font-black tracking-wide text-muted-foreground uppercase">
            Log
          </p>
          <Card className="rounded-xl px-3 py-2.5">
            <ul className="flex flex-col gap-1.5">
              {game.events.map((event, index) => (
                <li key={index} className="text-xs font-semibold text-[#c5c5d5]">
                  {event.message}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

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

interface ActionPanelProps {
  busy: boolean;
  finished: boolean;
  myTurn: boolean;
  call: string | null;
  you: { seat: number; canVote: boolean; awaitingHunter: boolean; isKing: boolean };
  candidates: GamePlayerView[];
  voteTargets: GamePlayerView[];
  huntTargets: GamePlayerView[];
  kingTargets: GamePlayerView[];
  act: (action: () => Promise<void>) => Promise<void>;
  submitNightAction: (targetSeat: number | null) => Promise<void>;
  submitVote: (targetSeat: number | null) => Promise<void>;
  submitKingVote: (targetSeat: number) => Promise<void>;
  submitHunterShot: (targetSeat: number) => Promise<void>;
}

function ActionPanel({
  busy,
  finished,
  myTurn,
  call,
  you,
  candidates,
  voteTargets,
  huntTargets,
  kingTargets,
  act,
  submitNightAction,
  submitVote,
  submitKingVote,
  submitHunterShot,
}: ActionPanelProps) {
  if (finished) return null;

  if (you.isKing) {
    return (
      <TargetPicker
        busy={busy}
        title="Keputusan Raja"
        description="Voting seri! Pilih satu kandidat untuk dieliminasi."
        icon={<Crown className="size-4" />}
        targets={kingTargets}
        confirmLabel="Eliminasi"
        onConfirm={(seat) => act(() => submitKingVote(seat))}
      />
    );
  }

  if (you.awaitingHunter) {
    return (
      <TargetPicker
        busy={busy}
        title="Tembakan Terakhir"
        description="Kamu Hunter yang gugur. Pilih satu pemain untuk ditembak!"
        icon={<Crosshair className="size-4" />}
        targets={huntTargets}
        confirmLabel="Tembak"
        onConfirm={(seat) => act(() => submitHunterShot(seat))}
      />
    );
  }

  if (myTurn && call) {
    return (
      <TargetPicker
        busy={busy}
        title={`Giliran ${call}`}
        description="Pilih targetmu, atau lewati."
        icon={<Moon className="size-4" />}
        targets={candidates}
        confirmLabel="Pilih"
        allowSkip
        onConfirm={(seat) => act(() => submitNightAction(seat))}
        onSkip={() => act(() => submitNightAction(null))}
      />
    );
  }

  if (you.canVote) {
    return (
      <TargetPicker
        busy={busy}
        title="Voting"
        description="Pilih siapa yang ingin kamu gantung."
        icon={<Vote className="size-4" />}
        targets={voteTargets}
        confirmLabel="Vote"
        allowSkip
        onConfirm={(seat) => act(() => submitVote(seat))}
        onSkip={() => act(() => submitVote(null))}
      />
    );
  }

  return (
    <Card className="mb-4 w-full rounded-2xl px-4 py-4 text-center neo-shadow">
      <p className="text-sm font-semibold text-muted-foreground">
        Menunggu pemain lain…
      </p>
    </Card>
  );
}

interface TargetPickerProps {
  busy: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  targets: GamePlayerView[];
  confirmLabel: string;
  allowSkip?: boolean;
  onConfirm: (seat: number) => void;
  onSkip?: () => void;
}

function TargetPicker({
  busy,
  title,
  description,
  icon,
  targets,
  confirmLabel,
  allowSkip,
  onConfirm,
  onSkip,
}: TargetPickerProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedValid = selected !== null && targets.some((player) => player.seat === selected);

  return (
    <Card className="mb-4 w-full rounded-2xl px-4 py-4 neo-shadow">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-accent">{icon}</span>
        <strong className="text-sm font-black tracking-wide uppercase">{title}</strong>
      </div>
      <p className="mb-3 text-xs font-semibold text-muted-foreground">{description}</p>

      {targets.length === 0 ? (
        <p className="text-xs font-semibold text-muted-foreground">Tidak ada target tersedia.</p>
      ) : (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {targets.map((player) => {
            const active = selected === player.seat;
            return (
              <button
                key={player.seat}
                type="button"
                disabled={busy}
                onClick={() => setSelected(player.seat)}
                className={`rounded-xl px-3 py-2 text-left text-sm font-bold transition neo-border ${
                  active ? 'bg-accent text-accent-foreground' : 'bg-secondary'
                }`}
              >
                {player.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          block
          disabled={busy || !selectedValid}
          onClick={() => selectedValid && selected !== null && onConfirm(selected)}
        >
          {confirmLabel}
        </Button>
        {allowSkip && onSkip && (
          <Button variant="outline" disabled={busy} onClick={onSkip}>
            Lewati
          </Button>
        )}
      </div>
    </Card>
  );
}

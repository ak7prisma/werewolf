import { useEffect, useState } from 'react';
import { ArrowRight, Gavel, Moon, SkipForward, Sun, Timer, Vote } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useGame } from '@/game/GameContext';
import { useModal, type ModalOptions } from '@/components/ModalContext';
import { DAY_STAGE, DISCUSSION_SECONDS } from '@/game/constants';

/** Countdown that fires `onElapsed` once the discussion window runs out. */
function DiscussionTimer({ onElapsed }: { onElapsed: () => void }) {
  const [remaining, setRemaining] = useState(DISCUSSION_SECONDS);

  useEffect(() => {
    const deadline = Date.now() + DISCUSSION_SECONDS * 1000;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        window.clearInterval(id);
        onElapsed();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [onElapsed]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-center gap-1.5 text-sm font-black tracking-wide uppercase">
        <Timer className="size-4 text-accent" />
        Diskusi {minutes}:{seconds.toString().padStart(2, '0')}
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-secondary neo-border-2">
        <div
          className="h-full bg-accent transition-[width] duration-300 ease-linear"
          style={{ width: `${(remaining / DISCUSSION_SECONDS) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function DayDialog() {
  const { state, dayBeginVote, dayConfirm, daySkip, startNight } = useGame();
  const { confirm } = useModal();
  const notification = state.notification;
  const selectedPlayer = state.selection !== null ? state.players[state.selection] : null;

  async function ask(options: ModalOptions, action: () => void) {
    const ok = await confirm(options);
    if (ok) action();
  }

  return (
    <div className="sticky top-3 z-40 mb-3 w-full max-w-md">
      <div className="rounded-2xl bg-card p-4 text-center neo-border neo-shadow-lg">
        {state.dayStage === DAY_STAGE.DISCUSSION ? (
          <>
            <h2 className="flex items-center justify-center gap-2 text-lg font-black tracking-wide uppercase">
              <Sun className="size-5 text-accent" />
              Siang {state.round}
            </h2>
            <p className="mt-1 mb-3 text-sm font-semibold text-muted-foreground">
              Semua pemain berdiskusi mencari Werewolf. Otomatis lanjut ke voting setelah waktu
              diskusi habis.
            </p>
            <DiscussionTimer key={state.round} onElapsed={dayBeginVote} />
            <Button
              block
              onClick={() =>
                ask(
                  {
                    title: 'Mulai Voting?',
                    description: 'Diskusi selesai. Warga akan memilih siapa yang dieliminasi.',
                    confirmText: 'Mulai',
                  },
                  dayBeginVote,
                )
              }
            >
              <Gavel />
              Mulai Voting Sekarang
            </Button>
          </>
        ) : null}

        {state.dayStage === DAY_STAGE.VOTE ? (
          <>
            <h2 className="text-lg font-black tracking-wide uppercase">Voting Warga</h2>
            <p className="mt-1 mb-3 text-sm font-semibold text-muted-foreground">
              Klik kartu pemain di papan yang paling banyak dipilih, lalu tekan Vote.
            </p>
            {selectedPlayer ? (
              <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-black tracking-wide text-accent-foreground uppercase neo-border-2">
                Terpilih: {selectedPlayer.name}
              </div>
            ) : (
              <div className="mb-3 rounded-xl bg-secondary px-3 py-2 text-sm font-black tracking-wide text-muted-foreground uppercase neo-border-2">
                Belum ada kartu dipilih
              </div>
            )}
            {state.round === 1 ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  block
                  onClick={() =>
                    ask(
                      {
                        title: 'Lewati Voting?',
                        description: 'Tidak ada yang dieliminasi hari ini.',
                        confirmText: 'Lewati',
                        tone: 'warning',
                      },
                      daySkip,
                    )
                  }
                >
                  <SkipForward />
                  Lewati
                </Button>
                <Button
                  block
                  disabled={state.selection === null}
                  onClick={() =>
                    ask(
                      {
                        title: 'Kunci Suara?',
                        description: `${selectedPlayer?.name ?? 'Pemain terpilih'} akan dieliminasi lewat voting?`,
                        confirmText: 'Vote',
                        tone: 'danger',
                      },
                      dayConfirm,
                    )
                  }
                >
                  <Vote />
                  Vote
                </Button>
              </div>
            ) : (
              <Button
                block
                disabled={state.selection === null}
                onClick={() =>
                  ask(
                    {
                      title: 'Kunci Suara?',
                      description: `${selectedPlayer?.name ?? 'Pemain terpilih'} akan dieliminasi lewat voting?`,
                      confirmText: 'Vote',
                      tone: 'danger',
                    },
                    dayConfirm,
                  )
                }
              >
                <Vote />
                Vote
              </Button>
            )}
          </>
        ) : null}

        {state.dayStage === DAY_STAGE.RESULT ? (
          <>
            <h2 className="flex items-center justify-center gap-2 text-lg font-black tracking-wide uppercase">
              <Moon className="size-5 text-info" />
              Hasil Voting - Siang {state.round}
            </h2>
            <p className="mt-1 mb-3 text-sm font-semibold text-muted-foreground">
              {state.dayVictim !== null
                ? `${state.players[state.dayVictim]?.name ?? 'Seseorang'} tereliminasi lewat voting.`
                : 'Tidak ada yang dieliminasi hari ini.'}
            </p>
            {notification ? (
              <Alert variant={notification.tone} className="mb-3 text-center">
                <b className="block">{notification.title}</b>
                {notification.message}
              </Alert>
            ) : null}
            <Button
              block
              onClick={() =>
                ask(
                  {
                    title: 'Lanjut ke Malam?',
                    description: 'Siang berakhir, semua pemain menutup mata.',
                    confirmText: 'Lanjut',
                  },
                  startNight,
                )
              }
            >
              <Moon />
              Lanjut ke Malam
              <ArrowRight />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

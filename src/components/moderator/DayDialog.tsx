import { ArrowRight, Gavel, Moon, SkipForward, Sun, Vote } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useGame } from '@/game/GameContext';
import { DAY_STAGE } from '@/game/constants';

export function DayDialog() {
  const { state, dayBeginVote, dayConfirm, daySkip, startNight } = useGame();
  const notification = state.notification;

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
              Semua pemain berdiskusi mencari Werewolf. Setelah selesai, mulai voting.
            </p>
            <Button block onClick={dayBeginVote}>
              <Gavel />
              Mulai Voting
            </Button>
          </>
        ) : null}

        {state.dayStage === DAY_STAGE.VOTE ? (
          <>
            <h2 className="text-lg font-black tracking-wide uppercase">Voting Warga</h2>
            <p className="mt-1 mb-3 text-sm font-semibold text-muted-foreground">
              Klik kartu pemain di papan yang paling banyak dipilih, lalu tekan Vote.
            </p>
            {state.round === 1 ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" block onClick={daySkip}>
                  <SkipForward />
                  Lewati
                </Button>
                <Button block disabled={state.selection === null} onClick={dayConfirm}>
                  <Vote />
                  Vote
                </Button>
              </div>
            ) : (
              <Button block disabled={state.selection === null} onClick={dayConfirm}>
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
              Hasil Voting — Siang {state.round}
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
            <Button block onClick={startNight}>
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

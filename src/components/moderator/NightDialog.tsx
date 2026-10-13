import { ArrowRight, Check, Crosshair, Moon, SkipForward, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useGame } from '@/game/GameContext';
import { NIGHT_STAGE, type NightRole } from '@/game/constants';
import { isThreatRole, nightCandidates } from '@/game/logic';

const ROLE_PROMPT: Record<NightRole, { title: string; hint: string }> = {
  Werewolf: {
    title: 'Panggil Werewolf',
    hint: 'Klik kartu pemain di papan yang ingin dimangsa, lalu tekan Bunuh.',
  },
  Guardian: {
    title: 'Panggil Guardian',
    hint: 'Wajib pilih — klik kartu di papan. Tidak boleh orang yang sama dua malam berturut-turut; melindungi diri sendiri hanya 1x seumur game.',
  },
  Seer: {
    title: 'Panggil Seer',
    hint: 'Klik kartu pemain di papan untuk diterawang, lalu lanjut.',
  },
  Doctor: {
    title: 'Panggil Doctor',
    hint: 'Klik kartu pemain mati di papan untuk dihidupkan, atau lewati.',
  },
  Orphan: {
    title: 'Panggil Orphan',
    hint: 'Wajib pilih — klik kartu pemain di papan sebagai bapak angkat.',
  },
  Doppelganger: {
    title: 'Panggil Doppelganger',
    hint: 'Klik kartu pemain mati di papan untuk diambil perannya, atau lewati.',
  },
};

export function NightDialog() {
  const { state, currentNightRole, nightBeginCall, nightConfirm, nightSkip, nightToDay } = useGame();

  const role = currentNightRole;
  const notification = state.notification;
  const selectedPlayer = state.selection !== null ? state.players[state.selection] : null;
  const hasCandidates = role
    ? nightCandidates(role, state.players, {
        lastGuardTarget: state.lastGuardTarget,
        guardianSelfUsed: state.guardianSelfUsed,
      }).length > 0
    : false;

  return (
    <div className="sticky top-3 z-40 mb-3 w-full max-w-md">
      <div className="rounded-2xl bg-card p-4 text-center neo-border neo-shadow-lg">
        {state.nightStage === NIGHT_STAGE.INTRO ? (
          <>
            <h2 className="flex items-center justify-center gap-2 text-lg font-black tracking-wide uppercase">
              <Moon className="size-5 text-info" />
              Malam {state.round}
            </h2>
            <p className="mt-1 mb-3 text-sm font-semibold text-muted-foreground">
              Semua pemain menutup mata. Moderator memanggil role satu per satu.
            </p>
            <Button block onClick={nightBeginCall}>
              <Moon />
              Mulai Memanggil Role
            </Button>
          </>
        ) : null}

        {state.nightStage === NIGHT_STAGE.CALL && role ? (
          <>
            <h2 className="text-lg font-black tracking-wide uppercase">{ROLE_PROMPT[role].title}</h2>
            <p className="mt-1 mb-3 text-sm font-semibold text-muted-foreground">
              {ROLE_PROMPT[role].hint}
            </p>

            {role === 'Werewolf' && state.wolfSkipThisNight ? (
              <Alert variant="warning" className="mb-3 inline-flex items-center justify-center gap-2 text-center">
                <TriangleAlert className="size-4 shrink-0" />
                Werewolf keracunan — tidak berburu malam ini.
              </Alert>
            ) : null}

            {role === 'Seer' && selectedPlayer ? (
              <div
                className={cn(
                  'mb-3 rounded-xl px-3 py-3 text-sm font-black tracking-wide uppercase neo-border',
                  isThreatRole(selectedPlayer.role)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-success text-success-foreground',
                )}
              >
                {isThreatRole(selectedPlayer.role)
                  ? `MERAH — ${selectedPlayer.name} adalah ancaman!`
                  : `AMAN — ${selectedPlayer.name} bukan ancaman.`}
              </div>
            ) : null}

            {role === 'Werewolf' ? (
              state.wolfSkipThisNight ? (
                <Button variant="secondary" block onClick={nightSkip}>
                  <SkipForward />
                  Lanjut (keracunan)
                </Button>
              ) : (
                <Button block disabled={state.selection === null} onClick={nightConfirm}>
                  <Crosshair />
                  Bunuh
                </Button>
              )
            ) : role === 'Seer' ? (
              <Button block disabled={state.selection === null} onClick={nightConfirm}>
                <Check />
                Lanjut
              </Button>
            ) : role === 'Guardian' ? (
              hasCandidates ? null : (
                <Button variant="secondary" block onClick={nightSkip}>
                  <SkipForward />
                  Lanjut
                </Button>
              )
            ) : role === 'Orphan' ? null : (
              <Button variant="secondary" block onClick={nightSkip}>
                <SkipForward />
                Lewati
              </Button>
            )}
          </>
        ) : null}

        {state.nightStage === NIGHT_STAGE.DAWN ? (
          <>
            <h2 className="flex items-center justify-center gap-2 text-lg font-black tracking-wide uppercase">
              <ArrowRight className="size-5 text-accent" />
              Fajar — Malam {state.round}
            </h2>
            <p className="mt-1 mb-3 text-sm font-semibold text-muted-foreground">
              Semua pemain membuka mata.
            </p>
            {notification ? (
              <Alert variant={notification.tone} className="mb-3 text-center">
                <b className="block">{notification.title}</b>
                {notification.message}
              </Alert>
            ) : (
              <Alert variant="muted" className="mb-3 text-center">
                Malam ini berlalu tanpa korban.
              </Alert>
            )}
            <Button block onClick={nightToDay}>
              <ArrowRight />
              Lanjut ke Siang
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Skull, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { SectionTitle } from '@/components/SectionTitle';
import { PlayerItem } from './PlayerItem';
import { NightDialog } from './NightDialog';
import { DayDialog } from './DayDialog';
import { HunterShotDialog } from './HunterShotDialog';
import { DoctorStatus } from './DoctorStatus';
import { KingZone } from './KingZone';
import { useGame } from '@/game/GameContext';
import { useModal } from '@/components/ModalContext';
import { DAY_STAGE, GAME_PHASE, NIGHT_STAGE } from '@/game/constants';
import { isThreatRole, nightCandidates } from '@/game/logic';

export function ModeratorBoard() {
  const {
    state,
    winner,
    king,
    currentNightRole,
    nightSelect,
    nightConfirm,
    daySelect,
    shootWithHunter,
    resetGame,
  } = useGame();
  const { confirm } = useModal();

  const isNightCall =
    state.phase === GAME_PHASE.NIGHT &&
    state.nightStage === NIGHT_STAGE.CALL &&
    currentNightRole !== null;
  const isVote = state.phase === GAME_PHASE.DAY && state.dayStage === DAY_STAGE.VOTE;
  const selecting = isNightCall || isVote;

  const [flash, setFlash] = useState<number | null>(null);
  const flashTimer = useRef<number | null>(null);

  const flashCard = useCallback((index: number) => {
    setFlash(index);
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 550);
  }, []);

  useEffect(
    () => () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    },
    [],
  );

  const candidateSet = useMemo(() => {
    if (isNightCall && currentNightRole) {
      if (currentNightRole === 'Werewolf' && state.wolfSkipThisNight) {
        return new Set<number>();
      }
      return new Set(
        nightCandidates(currentNightRole, state.players, {
          lastGuardTarget: state.lastGuardTarget,
          guardianSelfUsed: state.guardianSelfUsed,
        }),
      );
    }
    if (isVote) {
      const alive = state.players
        .map((player, index) => (player.alive ? index : -1))
        .filter((index) => index >= 0);
      return new Set(alive);
    }
    return new Set<number>();
  }, [
    isNightCall,
    currentNightRole,
    isVote,
    state.players,
    state.wolfSkipThisNight,
    state.lastGuardTarget,
    state.guardianSelfUsed,
  ]);

  function handleSelect(index: number) {
    if (!candidateSet.has(index)) return;
    flashCard(index);
    if (isNightCall && currentNightRole) {
      nightSelect(index);
      if (currentNightRole !== 'Werewolf' && currentNightRole !== 'Seer') {
        nightConfirm();
      }
    } else if (isVote) {
      daySelect(index);
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: 'Mulai Ulang?',
      description: 'Yakin ingin mereset permainan? Semua peran akan diacak ulang.',
      confirmText: 'Reset',
      cancelText: 'Batal',
      tone: 'danger',
    });
    if (ok) resetGame();
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center"
    >
      <SectionTitle>Papan Moderator</SectionTitle>

      {!winner && state.phase === GAME_PHASE.NIGHT ? <NightDialog /> : null}
      {!winner && state.phase === GAME_PHASE.DAY ? <DayDialog /> : null}

      {winner ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className={
            winner === 'werewolf'
              ? 'mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-sm font-black tracking-wide text-primary-foreground uppercase neo-border neo-shadow-lg'
              : 'mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-success px-4 py-4 text-sm font-black tracking-wide text-success-foreground uppercase neo-border neo-shadow-lg'
          }
        >
          {winner === 'werewolf' ? (
            <>
              <Skull className="size-6" />
              Werewolf Menang!
            </>
          ) : (
            <>
              <Trophy className="size-6" />
              Warga Menang!
            </>
          )}
        </motion.div>
      ) : null}

      <div className="w-full">
        {state.hasDoctor ? <DoctorStatus charges={state.doctorCharges} /> : null}

        {state.wolfPoisoned ? (
          <Alert variant="danger" className="mb-2 text-center">
            Werewolf keracunan! Serangan malam berikutnya akan gagal.
          </Alert>
        ) : null}

        <div className="mt-2 mb-1.5 grid grid-cols-2 gap-2.5">
          {state.players.map((player, index) => (
            <PlayerItem
              key={`${player.name}-${index}`}
              player={player}
              index={index}
              isOrphanFather={state.players.some(
                (candidate) => candidate.role === 'Orphan' && candidate.orphanFather === index,
              )}
              orphanFatherName={
                player.role === 'Orphan' && player.orphanFather !== null
                  ? state.players[player.orphanFather]?.name
                  : null
              }
              selectable={selecting && candidateSet.has(index)}
              selected={selecting && state.selection === index}
              dimmed={selecting && !candidateSet.has(index)}
              highlighted={flash === index}
              reveal={
                isNightCall && currentNightRole === 'Seer' && state.selection === index
                  ? isThreatRole(player.role)
                    ? 'threat'
                    : 'safe'
                  : null
              }
              onSelect={handleSelect}
            />
          ))}
        </div>

        {king ? <KingZone kingName={king.name} /> : null}
      </div>

      <Button variant="secondary" block className="mt-4" onClick={handleReset}>
        <RotateCcw />
        Mulai Permainan Baru
      </Button>

      {state.pendingHunter !== null ? (
        <HunterShotDialog
          hunterIndex={state.pendingHunter}
          hunterName={state.players[state.pendingHunter]?.name ?? 'Hunter'}
          players={state.players}
          onConfirm={shootWithHunter}
        />
      ) : null}
    </motion.section>
  );
}

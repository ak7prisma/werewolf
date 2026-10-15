import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Skull, Trophy, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { PlayerItem } from './PlayerItem';
import { NightDialog } from './NightDialog';
import { DayDialog } from './DayDialog';
import { HunterShotDialog } from './HunterShotDialog';
import { useGame } from '@/game/GameContext';
import { useModal, type ModalOptions } from '@/components/ModalContext';
import { DAY_STAGE, GAME_PHASE, NIGHT_STAGE, type NightRole } from '@/game/constants';
import { isThreatRole, nightCandidates } from '@/game/logic';

/** Konfirmasi sebelum aksi malam yang langsung mengunci target. */
const NIGHT_TARGET_CONFIRM: Partial<Record<NightRole, (name: string) => ModalOptions>> = {
  Guardian: (name) => ({
    title: 'Lindungi Pemain?',
    description: `Lindungi ${name} dari serangan Werewolf malam ini?`,
    confirmText: 'Lindungi',
    tone: 'success',
  }),
  Doctor: (name) => ({
    title: 'Hidupkan Pemain?',
    description: `Hidupkan kembali ${name}? Tindakan ini memakai 1 charge Dokter.`,
    confirmText: 'Hidupkan',
    tone: 'warning',
  }),
  Orphan: (name) => ({
    title: 'Pilih Bapak Angkat?',
    description: `Jadikan ${name} sebagai bapak angkat Orphan?`,
    confirmText: 'Pilih',
  }),
  Doppelganger: (name) => ({
    title: 'Ambil Peran?',
    description: `Doppelganger menyamar sebagai peran ${name}?`,
    confirmText: 'Ambil',
  }),
};

export function ModeratorBoard() {
  const {
    state,
    winner,
    currentNightRole,
    nightSelect,
    nightConfirm,
    daySelect,
    clearSelection,
    hunterSelect,
    shootWithHunter,
    resetGame,
    retry,
    canRetry,
  } = useGame();
  const { confirm } = useModal();

  const isNightCall =
    state.phase === GAME_PHASE.NIGHT &&
    state.nightStage === NIGHT_STAGE.CALL &&
    currentNightRole !== null;
  const isVote = state.phase === GAME_PHASE.DAY && state.dayStage === DAY_STAGE.VOTE;
  const isHunter = state.pendingHunter !== null;
  const selecting = isNightCall || isVote || isHunter;

  const [flash, setFlash] = useState<number | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [prevWinner, setPrevWinner] = useState(winner);
  const flashTimer = useRef<number | null>(null);

  if (winner !== prevWinner) {
    setPrevWinner(winner);
    setResultOpen(winner !== null);
  }

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
    if (state.pendingHunter !== null) {
      const alive = state.players
        .map((player, index) => (player.alive && index !== state.pendingHunter ? index : -1))
        .filter((index) => index >= 0);
      return new Set(alive);
    }
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
    state.pendingHunter,
    state.players,
    state.wolfSkipThisNight,
    state.lastGuardTarget,
    state.guardianSelfUsed,
  ]);

  async function handleSelect(index: number) {
    if (!candidateSet.has(index)) return;
    flashCard(index);

    // Pilih target tembakan Hunter langsung dari kartu.
    if (state.pendingHunter !== null) {
      hunterSelect(index);
      return;
    }

    const role = currentNightRole;
    if (isNightCall && role) {
      // Sorot kartu dulu agar terlihat jelas sedang dipilih.
      nightSelect(index);

      // Werewolf & Seer hanya menyorot target; konfirmasinya ada di tombol dialog.
      if (role === 'Werewolf' || role === 'Seer') return;

      const buildConfirm = NIGHT_TARGET_CONFIRM[role];
      if (buildConfirm) {
        const name = state.players[index]?.name ?? 'pemain';
        const ok = await confirm(buildConfirm(name));
        if (!ok) {
          clearSelection();
          return;
        }
      }
      nightConfirm();
      return;
    }

    if (isVote) daySelect(index);
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
      {!winner && state.pendingHunter !== null ? (
        <HunterShotDialog
          hunterName={state.players[state.pendingHunter]?.name ?? 'Hunter'}
          selectedName={
            state.selection !== null && candidateSet.has(state.selection)
              ? (state.players[state.selection]?.name ?? null)
              : null
          }
          onConfirm={() => {
            if (state.selection !== null) shootWithHunter(state.selection);
          }}
        />
      ) : null}

      {!winner && state.pendingHunter === null && state.phase === GAME_PHASE.NIGHT ? (
        <NightDialog />
      ) : null}
      {!winner && state.pendingHunter === null && state.phase === GAME_PHASE.DAY ? (
        <DayDialog />
      ) : null}

      <div className="w-full">
        <div className="mt-2 mb-1.5 grid grid-cols-2 gap-2.5">
          {state.players.map((player, index) => (
            <PlayerItem
              key={`${player.name}-${index}`}
              player={player}
              index={index}
              doctorCharges={state.doctorCharges}
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
      </div>

      <Button variant="accent" block className="mt-4" onClick={retry} disabled={!canRetry}>
        <Undo2 />
        Retry
      </Button>
      <Button variant="secondary" block className="mt-2.5" onClick={handleReset}>
        <RotateCcw />
        Mulai Permainan Baru
      </Button>

      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader className="items-center">
            <span
              className={cn(
                'grid size-16 place-items-center rounded-2xl neo-border-2',
                winner === 'werewolf'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-success text-success-foreground',
              )}
            >
              {winner === 'werewolf' ? <Skull className="size-8" /> : <Trophy className="size-8" />}
            </span>
            <DialogTitle className="mt-1 text-2xl">
              {winner === 'werewolf' ? 'Werewolf Menang!' : 'Warga Menang!'}
            </DialogTitle>
            <DialogDescription>
              {winner === 'werewolf'
                ? 'Para Werewolf berhasil menghabisi warga desa.'
                : 'Semua Werewolf berhasil dieliminasi.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" block onClick={handleReset}>
              <RotateCcw />
              Mulai Permainan Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.section>
  );
}

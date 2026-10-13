import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Skull, TriangleAlert, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { SectionTitle } from '@/components/SectionTitle';
import { PlayerItem } from './PlayerItem';
import { OrphanZone } from './OrphanZone';
import { DoppelgangerZone } from './DoppelgangerZone';
import { DoctorStatus } from './DoctorStatus';
import { KingZone } from './KingZone';
import { useGame } from '@/game/GameContext';
import { useModal } from '@/components/ModalContext';
import type { GameNotification } from '@/game/reducer';

export function ModeratorBoard() {
  const {
    state,
    killPlayer,
    reviveWithDoctor,
    setOrphanFather,
    resetGame,
    orphan,
    orphanFatherPending,
    king,
    canRevive,
    doppelganger,
    doppelgangerIndex,
    canCopyRole,
    copyRoleWithDoppelganger,
    winner,
    dismissNotification,
  } = useGame();
  const { confirm, alert } = useModal();

  const orphanZoneRef = useRef<HTMLDivElement | null>(null);
  const warnedRef = useRef(false);
  const handledNotificationRef = useRef<GameNotification | null>(null);
  const [highlight, setHighlight] = useState(false);

  const focusOrphanZone = useCallback(() => {
    orphanZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlight(true);
    setTimeout(() => setHighlight(false), 4000);
  }, []);

  const warnOrphanFather = useCallback(async () => {
    if (!orphan) return;
    await alert({
      title: 'Wajib Pilih Bapak Angkat',
      description: `${orphan.name} (Orphan) belum memilih bapak angkat! Pilih dulu sebelum melanjutkan permainan atau membunuh pemain.`,
      confirmText: 'Pilih Sekarang',
      tone: 'warning',
    });
    focusOrphanZone();
  }, [alert, orphan, focusOrphanZone]);

  useEffect(() => {
    if (!warnedRef.current && orphanFatherPending) {
      warnedRef.current = true;
      warnOrphanFather();
    }
  }, [orphanFatherPending, warnOrphanFather]);

  useEffect(() => {
    const notification = state.notification;
    if (!notification || handledNotificationRef.current === notification) return;
    handledNotificationRef.current = notification;
    alert({ title: notification.title, description: notification.message, tone: notification.tone });
    dismissNotification();
  }, [state.notification, alert, dismissNotification]);

  async function handleVote(index: number) {
    if (orphanFatherPending) {
      await warnOrphanFather();
      return;
    }
    const player = state.players[index];
    const strongNote =
      player.role === 'Strong Villager' && player.hp > 1
        ? ` ${player.name} masih punya ${player.hp} nyawa.`
        : '';
    const ok = await confirm({
      title: 'Eliminasi lewat Vote?',
      description: `${player.name} akan dieliminasi lewat hasil voting warga.${strongNote}`,
      confirmText: 'Eliminasi',
      cancelText: 'Batal',
      tone: 'warning',
    });
    if (ok) killPlayer(index, 'vote');
  }

  async function handleKill(index: number) {
    if (orphanFatherPending) {
      await warnOrphanFather();
      return;
    }
    const player = state.players[index];
    const cursedNote =
      player.role === 'Cursed'
        ? ' Cursed yang digigit Werewolf akan berubah menjadi Werewolf baru, dan seluruh Werewolf lama tewas!'
        : '';
    const strongNote =
      player.role === 'Strong Villager' && player.hp > 1
        ? ` ${player.name} masih punya ${player.hp} nyawa.`
        : '';
    const ok = await confirm({
      title: 'Bunuh oleh Werewolf?',
      description: `${player.name} akan dimangsa Werewolf.${strongNote}${cursedNote}`,
      confirmText: 'Bunuh',
      cancelText: 'Batal',
      tone: 'danger',
    });
    if (ok) killPlayer(index, 'werewolf');
  }

  async function handleRevive(index: number) {
    const player = state.players[index];
    const ok = await confirm({
      title: 'Hidupkan dengan Doctor?',
      description: `${player.name} akan dihidupkan menggunakan 1-satunya kesempatan Doctor.`,
      confirmText: 'Hidupkan',
      cancelText: 'Batal',
      tone: 'success',
    });
    if (ok) reviveWithDoctor(index);
  }

  async function handleSetOrphanFather(fatherIndex: number) {
    if (!orphan) return;
    const ok = await confirm({
      title: 'Tetapkan Bapak Angkat?',
      description: `${orphan.name} akan menjadikan ${state.players[fatherIndex].name} sebagai bapak angkat.`,
      confirmText: 'Tetapkan',
      cancelText: 'Batal',
      tone: 'info',
    });
    if (ok) setOrphanFather(fatherIndex);
  }

  async function handleCopyRole(targetIndex: number) {
    if (!doppelganger) return;
    const target = state.players[targetIndex];
    const ok = await confirm({
      title: 'Ambil Role Orang Mati?',
      description: `${doppelganger.name} (Doppelganger) akan mengambil peran ${target.role} milik ${target.name}. Tindakan ini hanya bisa dilakukan sekali.`,
      confirmText: 'Ambil Role',
      cancelText: 'Batal',
      tone: 'info',
    });
    if (ok) copyRoleWithDoppelganger(targetIndex);
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

  const orphanZone = orphan !== null && orphan.orphanFather === null ? orphan : null;
  const doppelgangerZone = canCopyRole && doppelganger !== null ? doppelganger : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center"
    >
      <SectionTitle>Papan Moderator</SectionTitle>
      <Alert variant="warning" className="mb-4 inline-flex items-center gap-2 text-center">
        <TriangleAlert className="size-4" />
        Rahasia! Hanya moderator yang boleh melihat halaman ini.
      </Alert>

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

        {orphanZone ? (
          <div ref={orphanZoneRef}>
            <OrphanZone
              orphanIndex={state.players.indexOf(orphanZone)}
              orphanName={orphanZone.name}
              players={state.players}
              highlight={highlight}
              onConfirm={handleSetOrphanFather}
            />
          </div>
        ) : null}

        {doppelgangerZone ? (
          <DoppelgangerZone
            doppelgangerIndex={doppelgangerIndex}
            doppelgangerName={doppelgangerZone.name}
            players={state.players}
            onConfirm={handleCopyRole}
          />
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
              canRevive={canRevive}
              onVote={handleVote}
              onKill={handleKill}
              onRevive={handleRevive}
            />
          ))}
        </div>

        {king ? <KingZone kingName={king.name} /> : null}
      </div>

      <Button variant="secondary" block className="mt-4" onClick={handleReset}>
        <RotateCcw />
        Mulai Permainan Baru
      </Button>
    </motion.section>
  );
}

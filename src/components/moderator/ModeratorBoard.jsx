import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { SectionTitle } from '@/components/SectionTitle';
import { PlayerItem } from './PlayerItem';
import { OrphanZone } from './OrphanZone';
import { DoctorStatus } from './DoctorStatus';
import { KingZone } from './KingZone';
import { useGame } from '@/game/GameContext';
import { useModal } from '@/components/ModalContext';

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
    dismissNotification,
  } = useGame();
  const { confirm, alert } = useModal();

  const orphanZoneRef = useRef(null);
  const warnedRef = useRef(false);
  const handledNotificationRef = useRef(null);
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

  async function handleKill(index) {
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
      title: 'Bunuh Pemain?',
      description: `${player.name} akan dibunuh.${strongNote}`,
      confirmText: 'Bunuh',
      cancelText: 'Batal',
      tone: 'danger',
    });
    if (ok) killPlayer(index);
  }

  async function handleRevive(index) {
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

  async function handleSetOrphanFather(fatherIndex) {
    const ok = await confirm({
      title: 'Tetapkan Bapak Angkat?',
      description: `${orphan.name} akan menjadikan ${state.players[fatherIndex].name} sebagai bapak angkat.`,
      confirmText: 'Tetapkan',
      cancelText: 'Batal',
      tone: 'info',
    });
    if (ok) setOrphanFather(fatherIndex);
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

  const showOrphanZone = orphan !== null && orphan.orphanFather === null;

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

      <div className="w-full">
        {state.hasDoctor ? <DoctorStatus charges={state.doctorCharges} /> : null}

        {showOrphanZone ? (
          <div ref={orphanZoneRef}>
            <OrphanZone
              orphanIndex={state.players.indexOf(orphan)}
              orphanName={orphan.name}
              players={state.players}
              highlight={highlight}
              onConfirm={handleSetOrphanFather}
            />
          </div>
        ) : null}

        <div className="mt-2 mb-1.5 flex flex-col gap-2.5">
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

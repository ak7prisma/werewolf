import { AnimatePresence, motion } from 'framer-motion';
import { Smartphone, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { SectionTitle } from '@/components/SectionTitle';
import { NameStep } from './NameStep';
import { CardFan } from './CardFan';
import { RoleRevealCard } from './RoleRevealCard';
import { useGame } from '@/game/GameContext';
import { useModal } from '@/components/ModalContext';
import { DRAW_STEP } from '@/game/constants';

const transition = { duration: 0.25 };

export function DrawStep() {
  const { state, dealCards, pickCard, nextPlayer, startModerator } = useGame();
  const { alert } = useModal();

  async function handleDeal(name: string) {
    const result = dealCards(name);
    if (!result.ok) {
      await alert({ title: 'Nama Kosong', description: result.error, tone: 'warning' });
    }
  }

  return (
    <AnimatePresence mode="wait">
      {state.drawStep === DRAW_STEP.NAME ? (
        <motion.section
          key="name"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={transition}
        >
          <NameStep
            playerNumber={state.currentPlayerIdx + 1}
            totalPlayers={state.totalPlayers}
            onDeal={handleDeal}
          />
        </motion.section>
      ) : null}

      {state.drawStep === DRAW_STEP.FAN ? (
        <motion.section
          key="fan"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={transition}
        >
          <SectionTitle>
            Pemain ke-{state.currentPlayerIdx + 1} dari {state.totalPlayers}
          </SectionTitle>
          <CardFan
            roles={state.availableRoles}
            onPick={pickCard}
            shuffle={state.currentPlayerIdx === 0}
          />
        </motion.section>
      ) : null}

      {state.drawStep === DRAW_STEP.REVEAL ? (
        <motion.section
          key="reveal"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={transition}
          className="flex flex-col items-center"
        >
          <Alert variant="warning" className="mb-4 inline-flex items-center gap-2 text-center">
            <TriangleAlert className="size-4" />
            Jangan sampai orang lain melihat!
          </Alert>
          <RoleRevealCard role={state.currentRole} />
          <Button block className="mt-1" onClick={nextPlayer}>
            Simpan &amp; Lanjut
          </Button>
        </motion.section>
      ) : null}

      {state.drawStep === DRAW_STEP.HANDOVER ? (
        <motion.section
          key="handover"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={transition}
          className="flex flex-col items-center"
        >
          <SectionTitle>Semua Peran Dibagikan</SectionTitle>
          <Alert variant="info" className="mb-4 inline-flex items-center gap-2 text-center">
            <Smartphone className="size-4" />
            Serahkan HP ke moderator sekarang. Jangan biarkan pemain lain melihat peran mereka!
          </Alert>
          <Button block className="mt-1" onClick={startModerator}>
            Lanjut ke Papan Moderator
          </Button>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}

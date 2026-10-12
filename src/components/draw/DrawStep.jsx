import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Shuffle, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { SectionTitle, Subtitle } from '@/components/SectionTitle';
import { CardFan } from './CardFan';
import { RoleRevealCard } from './RoleRevealCard';
import { useGame } from '@/game/GameContext';
import { useModal } from '@/components/ModalContext';
import { DRAW_STEP } from '@/game/constants';

const transition = { duration: 0.25 };

export function DrawStep() {
  const { state, dealCards, pickCard, nextPlayer } = useGame();
  const { alert } = useModal();
  const [name, setName] = useState('');

  const isLastPlayer = state.currentPlayerIdx === state.totalPlayers - 1;

  function resolveRole(index) {
    if (isLastPlayer && !state.werewolfSpotted) return 'Werewolf';
    return state.availableRoles[index];
  }

  async function handleDeal() {
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
          className="flex flex-col items-center"
        >
          <SectionTitle>
            Pemain ke-{state.currentPlayerIdx + 1} dari {state.totalPlayers}
          </SectionTitle>
          <Subtitle>Ketik namamu dulu, lalu kocok dan pilih kartu peran.</Subtitle>
          <Input
            type="text"
            placeholder="Nama kamu"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleDeal()}
          />
          <Button block className="mt-4" onClick={handleDeal}>
            <Shuffle />
            Kocok &amp; Sebar Kartu
          </Button>
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
            resolveRole={resolveRole}
            onPick={pickCard}
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
    </AnimatePresence>
  );
}

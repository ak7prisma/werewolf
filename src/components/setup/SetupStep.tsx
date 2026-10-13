import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shuffle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionTitle, Subtitle } from '@/components/SectionTitle';
import { useGame } from '@/game/GameContext';
import { useModal } from '@/components/ModalContext';
import { MAX_PLAYERS, MIN_PLAYERS } from '@/game/constants';

export function SetupStep() {
  const { startGame } = useGame();
  const { alert } = useModal();
  const [total, setTotal] = useState('');

  async function handleStart() {
    const result = startGame(total);
    if (!result.ok) {
      await alert({ title: 'Jumlah Pemain', description: result.error, tone: 'warning' });
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center"
    >
      <SectionTitle>Siapkan Permainan</SectionTitle>
      <Subtitle>
        Minimal {MIN_PLAYERS}, maksimal {MAX_PLAYERS} pemain. Minimal 2 role aktif malam (Seer,
        Guardian, Doctor) dijamin ikut bermain.
      </Subtitle>

      <Input
        type="number"
        inputMode="numeric"
        min={MIN_PLAYERS}
        max={MAX_PLAYERS}
        placeholder={`Jumlah pemain (${MIN_PLAYERS}-${MAX_PLAYERS})`}
        value={total}
        onWheel={(event) => event.currentTarget.blur()}
        onChange={(event) => setTotal(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && handleStart()}
        className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <Button block className="mt-4" onClick={handleStart}>
        <Shuffle />
        Kocok &amp; Bagikan Peran
      </Button>
    </motion.section>
  );
}

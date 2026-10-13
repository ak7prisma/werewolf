import { AnimatePresence } from 'framer-motion';

import { SetupStep } from '@/components/setup/SetupStep';
import { DrawStep } from '@/components/draw/DrawStep';
import { ModeratorBoard } from '@/components/moderator/ModeratorBoard';
import { useGame } from '@/game/GameContext';
import { GAME_PHASE } from '@/game/constants';

export function GamePage() {
  const { state } = useGame();

  return (
    <AnimatePresence mode="wait">
      {state.phase === GAME_PHASE.SETUP ? <SetupStep key="setup" /> : null}
      {state.phase === GAME_PHASE.DRAW ? <DrawStep key="draw" /> : null}
      {state.phase === GAME_PHASE.MODERATOR ? <ModeratorBoard key="moderator" /> : null}
    </AnimatePresence>
  );
}

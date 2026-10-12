import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { DealCard } from './DealCard';

const SHUFFLE_DURATION = 1600;
const REVEAL_DELAY = 900;
const SPACING = 30;

export function CardFan({ roles, resolveRole, onPick }) {
  const [shuffling, setShuffling] = useState(true);
  const [spread, setSpread] = useState(false);
  const [picked, setPicked] = useState(null);
  const [label, setLabel] = useState('Mengocok kartu…');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShuffling(false);
      setSpread(true);
      setLabel('Kartu siap!');
    }, SHUFFLE_DURATION);
    return () => clearTimeout(timer);
  }, []);

  const count = roles.length;

  function handleSelect(index) {
    if (picked !== null || shuffling) return;
    setPicked(index);
    setShuffling(false);
    setTimeout(() => onPick(index), REVEAL_DELAY);
  }

  return (
    <>
      <p className="mb-3.5 text-sm font-semibold text-muted-foreground">{label}</p>
      <motion.div
        className="relative mx-0 my-3.5 h-[180px] w-full"
        animate={
          shuffling
            ? { x: [-8, 7, -5, 8, -4, -8], y: [3, -4, -6, 4, 3, 3], rotate: [-4, 3, -3, 5, -6, -4] }
            : { x: 0, y: 0, rotate: 0 }
        }
        transition={shuffling ? { duration: 0.45, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
      >
        {roles.map((role, index) => {
          const offset = index - (count - 1) / 2;
          const isPicked = picked === index;
          return (
            <DealCard
              key={`${role}-${index}`}
              role={isPicked ? resolveRole(index) : role}
              spread={spread && !shuffling}
              x={offset * SPACING}
              y={-Math.abs(offset) * 7}
              rotate={offset * 5}
              delay={index * 0.035}
              flipped={isPicked}
              faded={picked !== null && !isPicked}
              disabled={picked !== null || shuffling}
              zIndex={isPicked ? 40 : 5}
              onSelect={() => handleSelect(index)}
            />
          );
        })}
      </motion.div>
      <p
        className={
          spread && picked === null
            ? 'mt-1.5 text-sm font-black text-accent'
            : 'invisible mt-1.5 text-sm font-black text-accent'
        }
      >
        Pilih satu kartu di atas - itu peranmu!
      </p>
    </>
  );
}

import { useEffect, useState } from 'react';

import { DealCard } from './DealCard';

const SHUFFLE_DURATION = 2600;
const RIFLE_INTERVAL = 320;
const REVEAL_DELAY = 900;
const SPACING = 30;

interface CardFanProps {
  roles: string[];
  resolveRole: (index: number) => string;
  onPick: (index: number) => void;
  shuffle?: boolean;
}

export function CardFan({ roles, resolveRole, onPick, shuffle = false }: CardFanProps) {
  const [shuffling, setShuffling] = useState(shuffle);
  const [split, setSplit] = useState(false);
  const [spread, setSpread] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [label, setLabel] = useState(shuffle ? 'Mengocok kartu…' : 'Kartu siap!');

  useEffect(() => {
    const delay = shuffle ? SHUFFLE_DURATION : 150;
    const timer = setTimeout(() => {
      setShuffling(false);
      setSpread(true);
      if (shuffle) setLabel('Kartu siap!');
    }, delay);
    return () => clearTimeout(timer);
  }, [shuffle]);

  useEffect(() => {
    if (!shuffling) return undefined;
    const id = setInterval(() => setSplit((value) => !value), RIFLE_INTERVAL);
    return () => clearInterval(id);
  }, [shuffling]);

  const count = roles.length;

  function handleSelect(index: number) {
    if (picked !== null || shuffling) return;
    setPicked(index);
    setShuffling(false);
    setTimeout(() => onPick(index), REVEAL_DELAY);
  }

  return (
    <>
      <p className="mb-3.5 text-sm font-semibold text-muted-foreground">{label}</p>
      <div className="relative mx-0 my-3.5 h-[180px] w-full">
        {roles.map((role, index) => {
          const offset = index - (count - 1) / 2;
          const isPicked = picked === index;

          // Riffle shuffle: odd/even cards form two piles that split apart and
          // fall back together, staggered by index so it looks like a real shuffle.
          const side = index % 2 === 0 ? -1 : 1;
          const pileX = split ? side * 36 : 0;
          const pileY = split ? -12 - (index % 3) * 3 : 0;
          const pileRotate = split ? side * 16 : 0;

          return (
            <DealCard
              key={`${role}-${index}`}
              role={isPicked ? resolveRole(index) : role}
              spread={spread && !shuffling}
              x={offset * SPACING}
              y={-Math.abs(offset) * 7}
              rotate={offset * 5}
              stackX={offset * 1.6}
              stackY={offset * -1.1}
              stackRotate={offset * 1.2}
              shuffling={shuffling}
              pileX={pileX}
              pileY={pileY}
              pileRotate={pileRotate}
              delay={index * 0.03}
              flipped={isPicked}
              faded={picked !== null && !isPicked}
              disabled={picked !== null || shuffling}
              zIndex={isPicked ? 40 : 5}
              onSelect={() => handleSelect(index)}
            />
          );
        })}
      </div>
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

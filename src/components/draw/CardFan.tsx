import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { DealCard } from './DealCard';
import { useAudio } from '@/audio/AudioPlayerContext';

const SHUFFLE_DURATION = 2600;
const RIFLE_INTERVAL = 320;
const REVEAL_DELAY = 900;
const MAX_PER_ROW = 10;
const CARD_WIDTH = 56;
const MAX_SPACING = 30;
const MIN_SPACING = 10;
const ROW_GAP = 100;
const ARC = 7;
const ROTATION = 5;

interface CardFanProps {
  roles: string[];
  onPick: (index: number) => void;
  shuffle?: boolean;
}

export function CardFan({ roles, onPick, shuffle = false }: CardFanProps) {
  const [shuffling, setShuffling] = useState(shuffle);
  const [split, setSplit] = useState(false);
  const [spread, setSpread] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [label, setLabel] = useState(shuffle ? 'Mengocok kartu…' : 'Kartu siap!');
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { playCardSfx } = useAudio();

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const update = () => setContainerWidth(element.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
  const rows = Math.max(1, Math.ceil(count / MAX_PER_ROW));
  const widestRow = Math.min(count, MAX_PER_ROW);
  const spacing =
    widestRow > 1
      ? Math.max(
          MIN_SPACING,
          Math.min(MAX_SPACING, ((containerWidth || 320) - CARD_WIDTH) / (widestRow - 1)),
        )
      : MAX_SPACING;
  const containerHeight = (rows - 1) * ROW_GAP + 170;

  function handleSelect(index: number) {
    if (picked !== null || shuffling) return;
    playCardSfx();
    setPicked(index);
    setShuffling(false);
    setTimeout(() => onPick(index), REVEAL_DELAY);
  }

  return (
    <>
      <p className="mb-3.5 text-sm font-semibold text-muted-foreground">{label}</p>
      <div
        ref={containerRef}
        className="relative mx-0 my-3.5 w-full"
        style={{ height: containerHeight }}
      >
        {roles.map((role, index) => {
          const row = Math.floor(index / MAX_PER_ROW);
          const rowStart = row * MAX_PER_ROW;
          const rowCount = Math.min(MAX_PER_ROW, count - rowStart);
          const column = index - rowStart;
          const offset = column - (rowCount - 1) / 2;
          const rowY = (row - (rows - 1) / 2) * ROW_GAP;
          const stackOffset = index - (count - 1) / 2;
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
              role={role}
              spread={spread && !shuffling}
              x={offset * spacing}
              y={rowY - Math.abs(offset) * ARC}
              rotate={offset * ROTATION}
              stackX={stackOffset * 1.2}
              stackY={stackOffset * -0.8}
              stackRotate={stackOffset * 0.8}
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

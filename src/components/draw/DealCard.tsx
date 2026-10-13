import { PawPrint } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Transition } from 'framer-motion';

import { getRole } from '@/data/roles';
import { cn } from '@/lib/utils';

interface DealCardProps {
  role: string | null;
  spread: boolean;
  x: number;
  y: number;
  rotate: number;
  stackX?: number;
  stackY?: number;
  stackRotate?: number;
  shuffling?: boolean;
  pileX?: number;
  pileY?: number;
  pileRotate?: number;
  delay: number;
  flipped: boolean;
  faded: boolean;
  disabled: boolean;
  zIndex: number;
  onSelect: () => void;
}

export function DealCard({
  role,
  spread,
  x,
  y,
  rotate,
  stackX = 0,
  stackY = 0,
  stackRotate = 0,
  shuffling = false,
  pileX = 0,
  pileY = 0,
  pileRotate = 0,
  delay,
  flipped,
  faded,
  disabled,
  zIndex,
  onSelect,
}: DealCardProps) {
  const roleData = role ? getRole(role) : null;
  const RoleIcon = roleData?.icon;

  const target = flipped
    ? { x: 0, y: 0, rotate: 0, scale: 1.18 }
    : spread
      ? { x, y, rotate, scale: 1 }
      : shuffling
        ? { x: pileX, y: pileY, rotate: pileRotate, scale: 1 }
        : { x: stackX, y: stackY, rotate: stackRotate, scale: 1 };

  const transition: Transition = flipped
    ? { duration: 0.4, ease: 'easeOut' }
    : spread
      ? { delay, duration: 0.55, ease: [0.2, 0.8, 0.25, 1] }
      : shuffling
        ? { delay, duration: 0.32, ease: 'easeInOut' }
        : { duration: 0.4, ease: 'easeOut' };

  return (
    <motion.button
      type="button"
      aria-label={flipped && role ? `Kartu peran ${role}` : 'Ambil kartu'}
      disabled={disabled}
      onClick={onSelect}
      style={{ marginLeft: -28, marginTop: -42, perspective: 600, zIndex }}
      className={cn(
        'absolute top-1/2 left-1/2 h-21 w-14 outline-none',
        !disabled && 'cursor-pointer',
      )}
      initial={false}
      animate={{
        ...target,
        opacity: faded ? 0.25 : 1,
        filter: faded ? 'grayscale(0.6)' : 'grayscale(0)',
      }}
      transition={transition}
      whileHover={!disabled && !flipped ? { y: y - 14 } : undefined}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.25, 0.6, 0.2, 1] }}
      >
        <div
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-[10px] bg-accent text-accent-foreground neo-border-2 shadow-[3px_3px_0_rgba(0,0,0,0.9)]"
        >
          {RoleIcon ? <RoleIcon className="size-6" /> : null}
          <span className="px-0.5 text-center text-[8px] leading-tight font-black uppercase tracking-wide">
            {role}
          </span>
        </div>
        <div
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          className="absolute inset-0 grid place-items-center overflow-hidden rounded-[10px] bg-info neo-border-2 shadow-[3px_3px_0_rgba(0,0,0,0.9)]"
        >
          <PawPrint className="size-6 text-white/90 text-stroke" />
        </div>
      </motion.div>
    </motion.button>
  );
}

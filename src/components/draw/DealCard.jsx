import { PawPrint } from 'lucide-react';
import { motion } from 'framer-motion';

import { getRole } from '@/data/roles';
import { cn } from '@/lib/utils';

export function DealCard({
  role,
  spread,
  x,
  y,
  rotate,
  stackX = 0,
  stackY = 0,
  stackRotate = 0,
  delay,
  flipped,
  faded,
  disabled,
  zIndex,
  onSelect,
}) {
  const roleData = role ? getRole(role) : null;
  const RoleIcon = roleData?.icon;

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
        x: flipped ? 0 : spread ? x : stackX,
        y: flipped ? 0 : spread ? y : stackY,
        rotate: flipped ? 0 : spread ? rotate : stackRotate,
        scale: flipped ? 1.18 : 1,
        opacity: faded ? 0.25 : 1,
        filter: faded ? 'grayscale(0.6)' : 'grayscale(0)',
      }}
      transition={
        spread && !flipped
          ? { delay, duration: 0.55, ease: [0.2, 0.8, 0.25, 1] }
          : { duration: 0.4, ease: 'easeOut' }
      }
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

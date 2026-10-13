import { Heart } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { getRole } from '@/data/roles';
import { cn } from '@/lib/utils';
import type { Player } from '@/game/reducer';

interface PlayerItemProps {
  player: Player;
  index: number;
  isOrphanFather: boolean;
  orphanFatherName?: string | null;
  selectable?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  highlighted?: boolean;
  reveal?: 'threat' | 'safe' | null;
  onSelect?: (index: number) => void;
}

export function PlayerItem({
  player,
  index,
  isOrphanFather,
  orphanFatherName,
  selectable = false,
  selected = false,
  dimmed = false,
  highlighted = false,
  reveal = null,
  onSelect,
}: PlayerItemProps) {
  const roleData = getRole(player.role);
  if (!roleData) return null;
  const RoleIcon = roleData.icon;
  const isEvil = roleData.team === 'werewolf';
  const interactive = selectable && onSelect !== undefined;

  const className = cn(
    'flex h-full flex-col items-center gap-2 rounded-2xl px-3 py-3 text-center neo-border transition focus-visible:outline-none',
    !player.alive && 'bg-[#17171f] opacity-60 neo-shadow-sm',
    player.alive && isEvil && 'bg-[#1f1020] neo-shadow-primary',
    player.alive && !isEvil && 'bg-secondary neo-shadow',
    dimmed && !highlighted && 'opacity-40 grayscale',
    interactive && 'cursor-pointer',
    interactive && !selected && 'hover:-translate-y-0.5 hover:ring-4 hover:ring-accent/70',
    interactive && 'active:scale-[0.97] focus-visible:ring-4 focus-visible:ring-accent',
    selected && !reveal && 'ring-4 ring-accent',
    highlighted && 'scale-105 ring-4 ring-accent',
    reveal === 'threat' && 'bg-[#3a0d13] ring-4 ring-primary neo-shadow-primary',
    reveal === 'safe' && 'ring-4 ring-success',
  );

  const content = (
    <>
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-xl neo-border-2',
          !player.alive && 'bg-[#26263a] text-[#777]',
          player.alive && isEvil && 'bg-primary text-primary-foreground',
          player.alive && !isEvil && 'bg-info text-info-foreground',
        )}
      >
        <RoleIcon className="size-6" />
      </span>

      <strong
        className={cn(
          'text-sm leading-tight font-black',
          player.alive ? 'text-foreground' : 'text-[#777] line-through',
        )}
      >
        {player.name}
      </strong>

      <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
        <Badge variant={isEvil ? 'danger' : 'default'}>{player.role}</Badge>
        {player.hp > 1 ? (
          <Badge variant="success" className="gap-0.5">
            {Array.from({ length: player.hp }, (_, i) => (
              <Heart key={i} className="size-3 fill-current" />
            ))}
          </Badge>
        ) : null}
        {player.transformedFrom ? (
          <Badge variant="primary">eks {player.transformedFrom}</Badge>
        ) : null}
        {isOrphanFather ? <Badge variant="success">Bapak Angkat</Badge> : null}
        {orphanFatherName ? <Badge variant="danger">Bapak: {orphanFatherName}</Badge> : null}
        {reveal === 'threat' ? <Badge variant="danger">ANCAMAN</Badge> : null}
        {reveal === 'safe' ? <Badge variant="success">AMAN</Badge> : null}
      </div>
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={() => onSelect?.(index)} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

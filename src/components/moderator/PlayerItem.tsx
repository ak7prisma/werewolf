import { Heart, Skull, Stethoscope, Vote } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRole } from '@/data/roles';
import { cn } from '@/lib/utils';
import type { Player } from '@/game/reducer';

interface PlayerItemProps {
  player: Player;
  index: number;
  isOrphanFather: boolean;
  orphanFatherName?: string | null;
  canRevive: boolean;
  onVote: (index: number) => void;
  onKill: (index: number) => void;
  onRevive: (index: number) => void;
}

export function PlayerItem({
  player,
  index,
  isOrphanFather,
  orphanFatherName,
  canRevive,
  onVote,
  onKill,
  onRevive,
}: PlayerItemProps) {
  const roleData = getRole(player.role);
  if (!roleData) return null;
  const RoleIcon = roleData.icon;
  const isEvil = roleData.team === 'werewolf';

  return (
    <div
      className={cn(
        'flex h-full flex-col items-center gap-2 rounded-2xl px-3 py-3 text-center neo-border',
        !player.alive && 'bg-[#17171f] opacity-60 neo-shadow-sm',
        player.alive && isEvil && 'bg-[#1f1020] neo-shadow-primary',
        player.alive && !isEvil && 'bg-secondary neo-shadow',
      )}
    >
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
      </div>

      {player.alive ? (
        <div className="mt-auto grid w-full grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="secondary"
            block
            title="Eliminasi lewat voting warga"
            onClick={() => onVote(index)}
          >
            <Vote />
            Vote
          </Button>
          <Button
            size="sm"
            variant="default"
            block
            title="Bunuh oleh gigitan Werewolf"
            onClick={() => onKill(index)}
          >
            <Skull />
            Bunuh
          </Button>
        </div>
      ) : canRevive ? (
        <Button
          size="sm"
          variant="success"
          block
          className="mt-auto"
          onClick={() => onRevive(index)}
        >
          <Stethoscope />
          Hidupkan
        </Button>
      ) : (
        <Badge variant="muted" className="mt-auto whitespace-nowrap">
          Mati
        </Badge>
      )}
    </div>
  );
}

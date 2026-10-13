import { Heart, Skull, Stethoscope } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRole } from '@/data/roles';
import { cn } from '@/lib/utils';

export function PlayerItem({
  player,
  index,
  isOrphanFather,
  orphanFatherName,
  canRevive,
  onKill,
  onRevive,
}) {
  const roleData = getRole(player.role);
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
        <Button size="sm" variant="default" block className="mt-auto" onClick={() => onKill(index)}>
          <Skull />
          Bunuh
        </Button>
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

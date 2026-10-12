import { Skull, Stethoscope } from 'lucide-react';

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

  return (
    <div
      className={cn(
        'flex h-full flex-col items-center gap-2 rounded-2xl px-3 py-3 text-center neo-border',
        player.alive ? 'bg-secondary neo-shadow' : 'bg-[#17171f] opacity-60 neo-shadow-sm',
      )}
    >
      <span
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-xl neo-border-2',
          player.alive ? 'bg-info text-white' : 'bg-[#26263a] text-[#777]',
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
        <Badge variant="default">{player.role}</Badge>
        {player.hp > 1 ? (
          <Badge variant="primary">{'❤️'.repeat(player.hp)}</Badge>
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

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
        'flex items-center justify-between gap-2.5 rounded-[14px] bg-secondary px-3.5 py-3 text-left neo-border',
        player.alive ? 'neo-shadow' : 'bg-[#17171f] opacity-60 neo-shadow-sm',
      )}
    >
      <div className="flex-1 text-center">
        <strong
          className={cn(
            'text-base font-black',
            player.alive ? 'text-foreground' : 'text-[#777] line-through',
          )}
        >
          {player.name}
        </strong>
        <br />
        <div className={cn('mt-1 flex flex-wrap items-center justify-center gap-1.5')}>
          <Badge variant="default">
            <RoleIcon className="size-3" />
            {player.role}
          </Badge>
          {player.hp > 1 ? (
            <Badge variant="primary">{'❤️'.repeat(player.hp)}</Badge>
          ) : null}
          {player.transformedFrom ? (
            <Badge variant="primary">eks {player.transformedFrom}</Badge>
          ) : null}
          {isOrphanFather ? <Badge variant="success">Bapak Angkat</Badge> : null}
          {orphanFatherName ? <Badge variant="danger">Bapak: {orphanFatherName}</Badge> : null}
        </div>
      </div>

      {player.alive ? (
        <Button size="sm" variant="default" className="shrink-0" onClick={() => onKill(index)}>
          <Skull />
          Bunuh
        </Button>
      ) : canRevive ? (
        <Button size="sm" variant="success" className="shrink-0" onClick={() => onRevive(index)}>
          <Stethoscope />
          Hidupkan
        </Button>
      ) : (
        <Badge variant="muted" className="shrink-0 whitespace-nowrap">
          Mati
        </Badge>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Crosshair, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Player } from '@/game/reducer';

interface HunterShotDialogProps {
  hunterName: string;
  hunterIndex: number;
  players: Player[];
  onConfirm: (targetIndex: number) => void;
}

export function HunterShotDialog({
  hunterName,
  hunterIndex,
  players,
  onConfirm,
}: HunterShotDialogProps) {
  const [targetIndex, setTargetIndex] = useState('');

  const candidates = players
    .map((player, index) => ({ player, index }))
    .filter(({ player, index }) => index !== hunterIndex && player.alive);

  return (
    <Dialog open>
      <DialogContent
        hideClose
        className="z-[60]"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogTitle className="flex items-center justify-center gap-2">
          <Crosshair className="size-5" />
          Tembakan Terakhir
        </DialogTitle>
        <DialogDescription>
          <b className="text-foreground">{hunterName}</b> (Hunter) tewas dan wajib menarik satu
          pemain ikut mati. Permainan tidak bisa dilanjutkan sebelum memilih.
        </DialogDescription>

        <Alert variant="warning" className="mt-1 inline-flex items-center justify-center gap-2 text-center">
          <TriangleAlert className="size-4 shrink-0" />
          Wajib pilih satu target
        </Alert>

        <Select value={targetIndex || undefined} onValueChange={setTargetIndex}>
          <SelectTrigger>
            <SelectValue placeholder="— Pilih pemain yang ditarik mati —" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map(({ player, index }) => (
              <SelectItem key={index} value={String(index)}>
                {player.name} ({player.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          block
          variant="default"
          disabled={targetIndex === ''}
          onClick={() => onConfirm(Number(targetIndex))}
        >
          <Crosshair />
          Tembak
        </Button>
      </DialogContent>
    </Dialog>
  );
}

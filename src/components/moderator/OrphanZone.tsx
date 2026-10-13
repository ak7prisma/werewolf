import { useState } from 'react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Player } from '@/game/reducer';

interface OrphanZoneProps {
  orphanIndex: number;
  orphanName: string;
  players: Player[];
  highlight: boolean;
  onConfirm: (fatherIndex: number) => void;
}

export function OrphanZone({
  orphanIndex,
  orphanName,
  players,
  highlight,
  onConfirm,
}: OrphanZoneProps) {
  const [fatherIndex, setFatherIndex] = useState('');

  const candidates = players
    .map((player, index) => ({ player, index }))
    .filter(({ player, index }) => index !== orphanIndex && player.alive);

  return (
    <motion.div
      animate={highlight ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={highlight ? { duration: 0.9, repeat: Infinity } : { duration: 0.2 }}
      className="mt-2"
    >
      <Card className={cn('text-center', highlight && 'neo-shadow-accent')}>
        <CardContent className="pt-4">
          <CardTitle className="mb-1">Wajib: Pilih Bapak Angkat</CardTitle>
          <p className="mb-3 text-[13.5px] font-semibold text-muted-foreground">
            Orphan <b className="text-foreground">{orphanName}</b> memilih bapak angkat. Jika bapak
            angkat mati, ia berubah menjadi Werewolf.
          </p>
          <Select value={fatherIndex || undefined} onValueChange={setFatherIndex}>
            <SelectTrigger>
              <SelectValue placeholder="— Pilih pemain —" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map(({ player, index }) => (
                <SelectItem key={index} value={String(index)}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            block
            className="mt-2"
            disabled={fatherIndex === ''}
            onClick={() => onConfirm(Number(fatherIndex))}
          >
            Tetapkan Bapak Angkat
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

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
import type { Player } from '@/game/reducer';

interface DoppelgangerZoneProps {
  doppelgangerIndex: number;
  doppelgangerName: string;
  players: Player[];
  onConfirm: (targetIndex: number) => void;
}

export function DoppelgangerZone({
  doppelgangerIndex,
  doppelgangerName,
  players,
  onConfirm,
}: DoppelgangerZoneProps) {
  const [targetIndex, setTargetIndex] = useState('');

  const candidates = players
    .map((player, index) => ({ player, index }))
    .filter(({ player, index }) => index !== doppelgangerIndex && !player.alive);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
      <Card className="text-center">
        <CardContent className="pt-4">
          <CardTitle className="mb-1">Doppelganger: Ambil Role Orang Mati</CardTitle>
          <p className="mb-3 text-[13.5px] font-semibold text-muted-foreground">
            <b className="text-foreground">{doppelgangerName}</b> (Doppelganger) bisa mengambil
            peran satu pemain yang sudah mati. Hanya bisa dilakukan sekali.
          </p>
          <Select value={targetIndex || undefined} onValueChange={setTargetIndex}>
            <SelectTrigger>
              <SelectValue placeholder="— Pilih pemain mati —" />
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
            className="mt-2"
            disabled={targetIndex === ''}
            onClick={() => onConfirm(Number(targetIndex))}
          >
            Ambil Role
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

import { useState } from 'react';
import { Shuffle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionTitle, Subtitle } from '@/components/SectionTitle';

export function NameStep({ playerNumber, totalPlayers, onDeal }) {
  const [name, setName] = useState('');

  function handleSubmit() {
    onDeal(name);
  }

  return (
    <div className="flex flex-col items-center">
      <SectionTitle>
        Pemain ke-{playerNumber} dari {totalPlayers}
      </SectionTitle>
      <Subtitle>Ketik namamu dulu, lalu kocok dan pilih kartu peran.</Subtitle>
      <Input
        type="text"
        placeholder="Nama kamu"
        value={name}
        autoFocus
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && handleSubmit()}
      />
      <Button block className="mt-4" onClick={handleSubmit}>
        <Shuffle />
        Kocok &amp; Sebar Kartu
      </Button>
    </div>
  );
}

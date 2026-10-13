import { useState } from 'react';
import { LogIn, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionTitle, Subtitle } from '@/components/SectionTitle';
import { useModal } from '@/components/ModalContext';
import { useOnline } from '@/online/OnlineContext';

export function CreateJoinForm() {
  const { createRoom, joinRoom } = useOnline();
  const { alert } = useModal();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    if (busy) return;
    if (!name.trim()) {
      await alert({ title: 'Nama', description: 'Isi namamu dulu.', tone: 'warning' });
      return;
    }
    setBusy(true);
    try {
      await action();
    } catch (err) {
      await alert({
        title: 'Gagal',
        description: err instanceof Error ? err.message : String(err),
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col items-center">
      <SectionTitle>
        Main Online{' '}
        <span className="align-middle rounded-full bg-accent px-2 py-0.5 text-xs font-black tracking-wider text-accent-foreground uppercase">
          Beta
        </span>
      </SectionTitle>
      <Subtitle>Buat room atau masuk pakai kode dari temanmu.</Subtitle>

      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Namamu"
        maxLength={16}
        autoComplete="off"
      />

      <Button
        block
        className="mt-3"
        disabled={busy}
        onClick={() => run(() => createRoom(name.trim()))}
      >
        <Plus />
        Buat Room
      </Button>

      <p className="my-4 text-xs font-black tracking-widest text-muted-foreground uppercase">
        atau
      </p>

      <Input
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="KODE ROOM"
        maxLength={5}
        autoComplete="off"
        className="tracking-[0.4em]"
      />
      <Button
        block
        variant="secondary"
        className="mt-3"
        disabled={busy || !code.trim()}
        onClick={() => run(() => joinRoom(code.trim(), name.trim()))}
      >
        <LogIn />
        Gabung Room
      </Button>
    </section>
  );
}

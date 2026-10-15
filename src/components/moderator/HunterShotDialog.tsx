import { Crosshair } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useModal } from '@/components/ModalContext';

interface HunterShotDialogProps {
  hunterName: string;
  selectedName: string | null;
  onConfirm: () => void;
}

export function HunterShotDialog({ hunterName, selectedName, onConfirm }: HunterShotDialogProps) {
  const { confirm } = useModal();

  async function handleShoot() {
    if (selectedName === null) return;
    const ok = await confirm({
      title: 'Tembak Pemain?',
      description: `Tembak ${selectedName}? Tindakan ini tidak bisa dibatalkan.`,
      confirmText: 'Tembak',
      tone: 'danger',
    });
    if (ok) onConfirm();
  }

  return (
    <div className="sticky top-3 z-40 mb-3 w-full max-w-md">
      <div className="rounded-2xl bg-card p-4 text-center neo-border neo-shadow-lg">
        <h2 className="flex items-center justify-center gap-2 text-lg font-black tracking-wide uppercase">
          <Crosshair className="size-5 text-accent" />
          Tembakan Terakhir
        </h2>
        <p className="mt-1 mb-3 text-sm font-semibold text-muted-foreground">
          <b className="text-foreground">{hunterName}</b> (Hunter) tewas dan wajib menembak satu
          pemain. Klik kartu pemain di papan sebagai target.
        </p>

        <Button block variant="default" disabled={selectedName === null} onClick={handleShoot}>
          <Crosshair />
          Tembak
        </Button>
      </div>
    </div>
  );
}

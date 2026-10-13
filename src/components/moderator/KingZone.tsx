import { Scale } from 'lucide-react';

import { Card, CardContent, CardTitle } from '@/components/ui/card';

export function KingZone({ kingName }: { kingName: string }) {
  return (
    <Card className="mt-2 text-center">
      <CardContent className="pt-4">
        <CardTitle className="mb-1 flex items-center justify-center gap-2">
          <Scale className="size-4 text-accent" />
          Keputusan Raja Saat Vote Seri
        </CardTitle>
        <p className="text-[13.5px] font-semibold text-muted-foreground">
          Jika vote warga seri, keputusan akhir ada di tangan Raja{' '}
          <b className="text-foreground">{kingName}</b>.
        </p>
      </CardContent>
    </Card>
  );
}

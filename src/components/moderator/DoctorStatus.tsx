import { Stethoscope } from 'lucide-react';

import { Alert } from '@/components/ui/alert';

export function DoctorStatus({ charges }: { charges: number }) {
  return (
    <Alert variant="warning" className="mb-2.5 inline-flex items-center gap-2 text-center">
      <Stethoscope className="size-4" />
      Sisa kesempatan Doctor: {charges}
    </Alert>
  );
}

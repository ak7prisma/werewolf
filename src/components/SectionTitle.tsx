import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface TitleProps {
  children: ReactNode;
  className?: string;
}

export function SectionTitle({ children, className }: TitleProps) {
  return (
    <h2
      className={cn(
        'mb-3.5 inline-block rounded-xl bg-primary px-4.5 py-2 text-[22px] font-black tracking-wide text-primary-foreground uppercase neo-border neo-shadow',
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Subtitle({ children, className }: TitleProps) {
  return (
    <p className={cn('mb-3.5 text-sm font-semibold text-muted-foreground', className)}>{children}</p>
  );
}

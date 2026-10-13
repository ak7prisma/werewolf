import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-auto w-full rounded-xl bg-input px-4 py-3.5 text-center text-base font-bold text-white neo-border neo-shadow',
        'placeholder:font-semibold placeholder:text-muted-foreground',
        'transition-[box-shadow,background-color] outline-none',
        'focus-visible:bg-[#1f1f33] focus-visible:shadow-[6px_6px_0_var(--ring)] focus-visible:ring-0',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };

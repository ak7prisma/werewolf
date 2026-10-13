import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-xl px-4 py-3 text-sm font-extrabold uppercase tracking-wide neo-border neo-shadow-sm',
  {
    variants: {
      variant: {
        info: 'bg-info text-info-foreground',
        warning: 'bg-accent text-accent-foreground',
        danger: 'bg-primary text-primary-foreground',
        success: 'bg-success text-success-foreground',
        muted: 'bg-secondary text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Alert, alertVariants };

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-black uppercase tracking-wider neo-border neo-shadow transition-[transform,box-shadow,background-color,color] duration-100 outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:ring-4 focus-visible:ring-ring/60",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-success hover:text-success-foreground',
        accent: 'bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground',
        success:
          'bg-success text-success-foreground hover:bg-accent hover:text-accent-foreground',
        info: 'bg-info text-info-foreground hover:bg-accent hover:text-accent-foreground',
        outline: 'bg-transparent text-foreground hover:bg-secondary',
        ghost: 'border-transparent bg-transparent shadow-none hover:bg-secondary',
      },
      size: {
        default: 'h-auto px-6 py-3.5 text-sm',
        sm: 'h-auto px-4 py-2 text-xs neo-border-2 neo-shadow-sm',
        lg: 'h-auto px-7 py-4 text-base',
        icon: 'size-11 p-0',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({ className, variant, size, block, asChild = false, ...props }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { ModalContext, type ModalContextValue, type ModalOptions, type ModalTone } from './ModalContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ModalMode = 'confirm' | 'alert';
type DialogState = ModalOptions & { mode: ModalMode };

const CONFIRM_VARIANTS: Record<ModalTone, 'default' | 'success' | 'info' | 'accent'> = {
  default: 'default',
  danger: 'default',
  success: 'success',
  info: 'info',
  warning: 'accent',
};

export function ModalProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const open = useCallback((options: ModalOptions, mode: ModalMode): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialog({ mode, ...options });
    });
  }, []);

  const confirm = useCallback((options: ModalOptions) => open(options, 'confirm'), [open]);
  const alert = useCallback((options: ModalOptions) => open(options, 'alert'), [open]);

  const settle = useCallback((result: boolean) => {
    setDialog(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  const value = useMemo<ModalContextValue>(
    () => ({ confirm, alert, isOpen: dialog !== null }),
    [confirm, alert, dialog],
  );

  return (
    <ModalContext.Provider value={value}>
      {children}
      <Dialog open={dialog !== null} onOpenChange={(isOpen) => !isOpen && settle(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog?.title}</DialogTitle>
            {dialog?.description ? (
              <DialogDescription asChild>
                <div>{dialog.description}</div>
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter>
            {dialog?.mode === 'confirm' ? (
              <Button variant="secondary" block onClick={() => settle(false)}>
                {dialog?.cancelText || 'Batal'}
              </Button>
            ) : null}
            <Button
              variant={dialog?.tone ? CONFIRM_VARIANTS[dialog.tone] : 'default'}
              block
              onClick={() => settle(true)}
            >
              {dialog?.confirmText || 'OK'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModalContext.Provider>
  );
}

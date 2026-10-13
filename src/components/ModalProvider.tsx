import { useCallback, useMemo, useRef, useState } from 'react';

import { ModalContext } from './ModalContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const CONFIRM_VARIANTS = {
  default: 'default',
  danger: 'default',
  success: 'success',
  info: 'info',
  warning: 'accent',
};

export function ModalProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const open = useCallback((options, mode) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({ mode, ...options });
    });
  }, []);

  const confirm = useCallback((options) => open(options, 'confirm'), [open]);
  const alert = useCallback((options) => open(options, 'alert'), [open]);

  const settle = useCallback((result) => {
    setDialog(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  const value = useMemo(
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
              variant={CONFIRM_VARIANTS[dialog?.tone] || 'default'}
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

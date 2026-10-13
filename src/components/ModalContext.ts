import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export type ModalTone = 'default' | 'danger' | 'success' | 'info' | 'warning';

export interface ModalOptions {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: ModalTone;
}

export interface ModalContextValue {
  confirm: (options: ModalOptions) => Promise<boolean>;
  alert: (options: ModalOptions) => Promise<boolean>;
  isOpen: boolean;
}

export const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal(): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a <ModalProvider>');
  }
  return context;
}

import { createContext, useContext } from 'react';

import type { RoleDefinition } from './roles';

export type RolesSource = 'loading' | 'supabase' | 'fallback';

export interface RolesContextValue {
  roles: RoleDefinition[];
  source: RolesSource;
  error: string | null;
}

export const RolesContext = createContext<RolesContextValue | null>(null);

export function useRoles(): RolesContextValue {
  const context = useContext(RolesContext);
  if (!context) {
    throw new Error('useRoles must be used within a <RolesProvider>');
  }
  return context;
}

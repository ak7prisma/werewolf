import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { RolesContext } from './RolesContext';
import type { RolesSource } from './RolesContext';
import { getCatalogRoles, hydrateRoles, resetRoles } from './roles';
import type { RoleDefinition } from './roles';
import { fetchRoles } from './rolesRepository';

/**
 * Hydrates the runtime role registry from Supabase on mount, keeping the
 * static catalogue visible in the meantime. If the fetch fails the static
 * catalogue stays active and `source` becomes `fallback`.
 */
export function RolesProvider({ children }: { children: ReactNode }) {
  const [roles, setRoles] = useState<RoleDefinition[]>(() => getCatalogRoles());
  const [source, setSource] = useState<RolesSource>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchRoles()
      .then((fetched) => {
        if (cancelled) return;
        hydrateRoles(fetched);
        setRoles(getCatalogRoles());
        setSource('supabase');
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        resetRoles();
        setRoles(getCatalogRoles());
        setSource('fallback');
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ roles, source, error }), [roles, source, error]);

  return <RolesContext.Provider value={value}>{children}</RolesContext.Provider>;
}

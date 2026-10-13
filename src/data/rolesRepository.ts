import { supabase } from '@/lib/supabase';
import { resolveRoleIcon } from './roleIcons';
import type { RoleCategory, RoleDefinition, RoleTeam } from './roles';

interface RoleRow {
  name: string;
  short: string;
  description: string;
  team: RoleTeam;
  category: RoleCategory;
  icon: string;
}

/** Load the role catalogue from Supabase, ordered for display. */
export async function fetchRoles(): Promise<RoleDefinition[]> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

  const { data, error } = await supabase
    .from('roles')
    .select('name, short, description, team, category, icon')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as RoleRow[]).map((row) => ({
    name: row.name,
    short: row.short,
    description: row.description,
    team: row.team,
    category: row.category,
    icon: resolveRoleIcon(row.icon),
  }));
}

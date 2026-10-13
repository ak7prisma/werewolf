import {
  GiBabyFace,
  GiBiceps,
  GiBlood,
  GiCrown,
  GiCrosshair,
  GiDominoMask,
  GiEyeOfHorus,
  GiHound,
  GiMedicalPack,
  GiShield,
  GiVomiting,
  GiWerewolf,
} from 'react-icons/gi';
import type { IconType } from 'react-icons';

/**
 * Supabase stores the icon as a plain string so the catalogue can be edited
 * without a redeploy. This registry maps that string to the bundled react-icons
 * component. Keep the keys in sync with the `icon` column values.
 */
const ROLE_ICONS: Record<string, IconType> = {
  GiBabyFace,
  GiBiceps,
  GiBlood,
  GiCrown,
  GiCrosshair,
  GiDominoMask,
  GiEyeOfHorus,
  GiHound,
  GiMedicalPack,
  GiShield,
  GiVomiting,
  GiWerewolf,
};

const FALLBACK_ICON = GiWerewolf;

/** Resolve a stored icon name to a component, falling back to a safe default. */
export function resolveRoleIcon(name: string | null | undefined): IconType {
  if (!name) return FALLBACK_ICON;
  return ROLE_ICONS[name] ?? FALLBACK_ICON;
}

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

export type RoleCategory = 'evil' | 'active' | 'variable' | 'normal';
export type RoleTeam = 'werewolf' | 'village';

export interface RoleDefinition {
  name: string;
  icon: IconType;
  short: string;
  description: string;
  team: RoleTeam;
  category: RoleCategory;
}

/**
 * Master catalogue of every role available in Wolf Night.
 * `icon` is a react-icons component, `short` is a terse label, `description` is
 * revealed to the player when they draw the card and `category` groups roles for
 * colour-coding in the catalogue:
 *   - evil     : tim Werewolf
 *   - active   : warga dengan skill aktif di malam hari
 *   - variable : bisa berubah menjadi baik atau jahat
 *   - normal   : warga tanpa skill aktif
 */
export const ROLES = {
  Werewolf: {
    name: 'Werewolf',
    icon: GiWerewolf,
    short: 'Serigala.',
    description:
      'Kamu serigala! Mangsalah warga setiap malam dan tutupi jejakmu dengan kebohongan yang meyakinkan.',
    team: 'werewolf',
    category: 'evil',
  },
  Seer: {
    name: 'Seer',
    icon: GiEyeOfHorus,
    short: 'Peramal.',
    description:
      'Kamu peramal. Terawang satu orang setiap malam untuk menguji apakah dia musuh atau kawan.',
    team: 'village',
    category: 'active',
  },
  Guardian: {
    name: 'Guardian',
    icon: GiShield,
    short: 'Pelindung.',
    description:
      'Kamu pelindung. Pilih satu pemain setiap malam untuk dijaga dari gigitan Werewolf.',
    team: 'village',
    category: 'active',
  },
  Hunter: {
    name: 'Hunter',
    icon: GiCrosshair,
    short: 'Pemburu.',
    description:
      'Kamu pemburu! Saat kamu mati, tarik pelatuk dan tembak satu pemain lain pilihanmu.',
    team: 'village',
    category: 'normal',
  },
  Lycan: {
    name: 'Lycan',
    icon: GiHound,
    short: 'Lycan.',
    description:
      'Kamu warga baik dengan darah terkutuk. Jika diperiksa Seer, kamu terbaca sebagai Werewolf!',
    team: 'village',
    category: 'normal',
  },
  Disease: {
    name: 'Disease',
    icon: GiVomiting,
    short: 'Beracun.',
    description:
      'Tubuhmu beracun. Jika kamu dimangsa Werewolf, mereka keracunan dan absen berburu malam berikutnya.',
    team: 'village',
    category: 'normal',
  },
  Cursed: {
    name: 'Cursed',
    icon: GiBlood,
    short: 'Terkutuk.',
    description:
      'Kamu terkutuk. Jika digigit Werewolf, kamu tidak mati - kamu justru menjadi Werewolf baru, dan seluruh Werewolf lama langsung tewas!',
    team: 'village',
    category: 'variable',
  },
  'Strong Villager': {
    name: 'Strong Villager',
    icon: GiBiceps,
    short: '2 nyawa.',
    description:
      'Kamu warga bertubuh kekar dengan 2 nyawa! Jika dibunuh Werewolf, kamu bangkit sekali lagi. Gunakan kesempatan itu dengan bijak.',
    team: 'village',
    category: 'normal',
  },
  Orphan: {
    name: 'Orphan',
    icon: GiBabyFace,
    short: 'Yatim piatu.',
    description:
      'Kamu yatim piatu. Pilih 1 pemain sebagai bapak angkatmu. Jika dia mati, kamu bangkit dan berubah menjadi Werewolf!',
    team: 'village',
    category: 'variable',
  },
  Doctor: {
    name: 'Doctor',
    icon: GiMedicalPack,
    short: 'Dokter.',
    description:
      'Kamu dokter desa. Kamu punya 1 kesempatan untuk menghidupkan kembali 1 pemain yang sudah mati. Pakai dengan bijak.',
    team: 'village',
    category: 'active',
  },
  King: {
    name: 'King',
    icon: GiCrown,
    short: 'Raja.',
    description:
      'Kamu raja desa. Saat vote warga seri, hak prerogatif ada padamu: tentukan satu kandidat terikat untuk dieliminasi.',
    team: 'village',
    category: 'normal',
  },
  Doppelganger: {
    name: 'Doppelganger',
    icon: GiDominoMask,
    short: 'Penyamar.',
    description: 'Penyamar. Pilih pemain yang sudah mati dan ambil perannya.',
    team: 'village',
    category: 'variable',
  },
} satisfies Record<string, RoleDefinition>;

export type RoleKey = keyof typeof ROLES;

/** Stable ordering used across the app. */
export const ROLE_NAMES = Object.keys(ROLES) as RoleKey[];

/** Roles rendered in the catalogue page. */
export const CATALOG_ROLES = ROLE_NAMES.map((key) => ROLES[key]);

export function getRole(name: string): RoleDefinition | undefined {
  return (ROLES as Record<string, RoleDefinition>)[name];
}

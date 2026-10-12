import {
  Baby,
  Copy,
  Crown,
  Crosshair,
  Eye,
  FlaskConical,
  Ghost,
  HeartPulse,
  Moon,
  PawPrint,
  Shield,
  Stethoscope,
} from 'lucide-react';

/**
 * Master catalogue of every role available in Wolf Night.
 * `icon` is a lucide-react component, `short` is used in the catalogue page and
 * `description` is revealed to the player when they draw the card.
 */
export const ROLES = {
  Werewolf: {
    name: 'Werewolf',
    icon: PawPrint,
    short: 'Serigala.',
    description:
      'Kamu serigala! Mangsalah warga setiap malam dan tutupi jejakmu dengan kebohongan yang meyakinkan.',
    team: 'werewolf',
  },
  Seer: {
    name: 'Seer',
    icon: Eye,
    short: 'Peramal.',
    description:
      'Kamu peramal. Terawang satu orang setiap malam untuk menguji apakah dia musuh atau kawan.',
    team: 'village',
    active: true,
  },
  Guardian: {
    name: 'Guardian',
    icon: Shield,
    short: 'Pelindung.',
    description:
      'Kamu pelindung. Pilih satu pemain setiap malam untuk dijaga dari gigitan Werewolf.',
    team: 'village',
    active: true,
  },
  Hunter: {
    name: 'Hunter',
    icon: Crosshair,
    short: 'Pemburu.',
    description:
      'Kamu pemburu! Saat kamu mati, tarik pelatuk dan tembak satu pemain lain pilihanmu.',
    team: 'village',
  },
  Lycan: {
    name: 'Lycan',
    icon: Moon,
    short: 'Lycan.',
    description:
      'Kamu warga baik dengan darah terkutuk. Jika diperiksa Seer, kamu terbaca sebagai Werewolf!',
    team: 'village',
  },
  Disease: {
    name: 'Disease',
    icon: FlaskConical,
    short: 'Beracun.',
    description:
      'Tubuhmu beracun. Jika kamu dimangsa Werewolf, mereka keracunan dan absen berburu malam berikutnya.',
    team: 'village',
  },
  Cursed: {
    name: 'Cursed',
    icon: Ghost,
    short: 'Terkutuk.',
    description:
      'Kamu terkutuk. Gigitan Werewolf tak membunuhmu - justru mengubahmu menjadi salah satu dari mereka.',
    team: 'village',
  },
  'Strong Villager': {
    name: 'Strong Villager',
    icon: HeartPulse,
    short: '2 nyawa.',
    description:
      'Kamu warga bertubuh kekar dengan 2 nyawa! Jika dibunuh Werewolf, kamu bangkit sekali lagi. Gunakan kesempatan itu dengan bijak.',
    team: 'village',
  },
  Orphan: {
    name: 'Orphan',
    icon: Baby,
    short: 'Yatim piatu.',
    description:
      'Kamu yatim piatu. Pilih 1 pemain sebagai bapak angkatmu. Jika dia mati, kamu bangkit dan berubah menjadi Werewolf!',
    team: 'village',
  },
  Doctor: {
    name: 'Doctor',
    icon: Stethoscope,
    short: 'Dokter.',
    description:
      'Kamu dokter desa. Kamu punya 1 kesempatan untuk menghidupkan kembali 1 pemain yang sudah mati. Pakai dengan bijak.',
    team: 'village',
    active: true,
  },
  King: {
    name: 'King',
    icon: Crown,
    short: 'Raja.',
    description:
      'Kamu raja desa. Saat vote warga seri, hak prerogatif ada padamu: tentukan satu kandidat terikat untuk dieliminasi.',
    team: 'village',
  },
  Doppelganger: {
    name: 'Doppelganger',
    icon: Copy,
    short: 'Penyamar.',
    description: 'Penyamar. Pilih pemain yang sudah mati dan ambil perannya.',
    team: 'village',
  },
};

/** Stable ordering used across the app. */
export const ROLE_NAMES = Object.keys(ROLES);

/** Roles rendered in the catalogue page. */
export const CATALOG_ROLES = ROLE_NAMES.map((key) => ROLES[key]);

export function getRole(name) {
  return ROLES[name];
}

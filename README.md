# Wolf Night — Werewolf Companion

Aplikasi pendamping permainan **Werewolf** untuk moderator dan pemain. Dulu berupa HTML/CSS/JS
vanilla, kini telah dimigrasikan ke **React + Vite** dengan struktur modular.

## Stack

- **React 19 + Vite** — build tool & dev server
- **Tailwind CSS v4** — styling (tema *dark neubrutalism*)
- **shadcn/ui** — komponen UI (Button, Input, Dialog, Select, Card, Badge, Alert)
- **lucide-react** — ikon
- **react-router-dom** — routing (`/` dan `/katalog`)
- **framer-motion** — animasi (kocok kartu, flip, transisi langkah)
- **Supabase** — katalog peran (nama, deskripsi, ikon) disimpan di database

## Supabase

Katalog kartu & keterangan peran dimuat dari tabel `public.roles`. Bila Supabase
tidak dikonfigurasi atau gagal diakses, app otomatis memakai katalog bawaan di
`src/data/roles.ts` (mode offline).

1. Jalankan `supabase/schema.sql` di SQL Editor project Supabase (membuat tabel
   `roles`, RLS read-only publik, dan seed 12 peran bawaan).
2. Salin `.env.example` menjadi `.env.local` dan isi:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

Catatan saat menambah/mengubah role:
- `name` wajib sama persis dengan identitas yang dikenali `src/game/reducer.ts`.
- `icon` harus salah satu kunci di `src/data/roleIcons.ts` (ikon react-icons).
- Daftar role di tabel ini menentukan kartu yang bisa dibagikan dan penentuan tim.


## Struktur

```
src/
├─ components/
│  ├─ ui/            # komponen shadcn
│  ├─ setup/         # langkah penyiapan permainan
│  ├─ draw/          # kocok & sebar kartu, reveal peran
│  ├─ moderator/     # papan moderator & zona khusus
│  ├─ AppLayout.jsx
│  ├─ NavTabs.jsx
│  └─ ModalProvider.jsx
├─ pages/            # GamePage, CardsPage, NotFoundPage
├─ game/             # state (reducer + context), konstanta, logika deck
├─ data/             # katalog peran (fallback + registry), ikon, repo Supabase, provider
│  ├─ roles.ts          # katalog statis / seed + registry runtime
│  ├─ roleIcons.ts      # peta nama ikon → react-icons
│  ├─ rolesRepository.ts# fetch peran dari Supabase
│  └─ RolesProvider.tsx # hydrate registry + status sumber data
└─ lib/              # utils + supabase client
```

## Skrip

```bash
npm install     # pasang dependensi
npm run dev     # jalankan dev server
npm run build   # build produksi ke dist/
npm run preview # pratinjau hasil build
npm run lint    # jalankan ESLint
```

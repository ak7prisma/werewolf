# Wolf Night — Werewolf Companion

Aplikasi pendamping permainan **Werewolf** untuk moderator dan pemain. Dulu berupa HTML/CSS/JS
vanilla, kini telah dimigrasikan ke **React + Vite** dengan struktur modular.

## Stack

- **React 19 + Vite** — build tool & dev server
- **Tailwind CSS v4** — styling (tema *dark neubrutalism*)
- **shadcn/ui** — komponen UI (Button, Input, Dialog, Select, Card, Badge, Alert)
- **lucide-react** — ikon
- **react-router-dom** — routing (`/`, `/online`, `/katalog`)
- **framer-motion** — animasi (kocok kartu, flip, transisi langkah)
- **Supabase** — katalog peran, auth anonim, room & lobby online realtime

## Supabase

### Katalog peran
Katalog kartu & keterangan peran dimuat dari tabel `public.roles`. Bila Supabase
tidak dikonfigurasi atau gagal diakses, app otomatis memakai katalog bawaan di
`src/data/roles.ts` (mode offline).

### Main online (room + lobby + engine otomatis)
Model **server-authoritative**: client tidak menulis langsung ke tabel, semua
mutasi lewat RPC `SECURITY DEFINER`. Role pemain disimpan di `player_roles` dan
hanya bisa dibaca oleh pemiliknya (RLS). Fase malam/siang dijalankan otomatis
oleh engine SQL (`game_tick`) — tanpa moderator.

Setup:
1. Jalankan berurutan di SQL Editor: `supabase/schema.sql` → `supabase/online.sql` → `supabase/engine.sql`.
2. Aktifkan **Authentication → Providers → Anonymous sign-ins** di dashboard.
3. Salin `.env.example` menjadi `.env.local` dan isi:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

Alur: buka tab **Online** → isi nama → **Buat Room** (dapat kode 5 karakter) atau
**Gabung Room** pakai kode → host menekan **Mulai Game** saat semua pemain siap.
Setelah mulai, tiap pemain melihat papan permainan: fase malam/siang, giliran
aksi (Werewolf/Guardian/Seer/Doctor/Orphan/Doppelganger), voting siang, dan
tembakan Hunter — semua dijalankan otomatis oleh engine tanpa moderator. Saat
selesai, pemenang langsung diberitahukan; host bisa menekan **Main Lagi** untuk
mengulang di room yang sama, atau **Bubarkan** (host) / **Keluar** untuk keluar
dan menghapus room.

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
├─ pages/            # GamePage (offline), OnlinePage, CardsPage, NotFoundPage
├─ game/             # state (reducer + context), konstanta, logika deck
├─ online/           # auth anonim, room & lobby online, papan permainan
│  ├─ onlineTypes.ts
│  ├─ onlineRepository.ts # panggil RPC + fetch state room/permainan
│  ├─ OnlineContext.ts    # context + useOnline
│  ├─ OnlineProvider.tsx  # sesi, realtime, heartbeat fase, aksi room/game
│  ├─ CreateJoinForm.tsx  # buat / gabung room
│  ├─ RoomLobby.tsx       # daftar pemain, siap, mulai
│  └─ GameBoard.tsx       # papan permainan online (aksi malam, vote, hunter)
├─ data/             # katalog peran (fallback + registry), ikon, repo Supabase, provider
│  ├─ roles.ts          # katalog statis / seed + registry runtime
│  ├─ roleIcons.ts      # peta nama ikon → react-icons
│  ├─ rolesRepository.ts# fetch peran dari Supabase
│  └─ RolesProvider.tsx # hydrate registry + status sumber data
└─ lib/              # utils + supabase client
```

## Skrip

```bash
npm install      # pasang dependensi
npm run dev      # jalankan dev server
npm run build    # build produksi ke dist/
npm run preview  # pratinjau hasil build
npm run lint     # jalankan ESLint
npm run test:sql # uji engine SQL via PGlite (tanpa Docker)
```

`supabase/` berisi skema dan engine:
- `schema.sql` — tabel katalog `roles` + seed.
- `online.sql` — profil, room, lobby, pembagian role, realtime.
- `engine.sql` — mesin fase malam/siang otomatis (`start_online_game`, `game_tick`, `submit_night_action`, `submit_vote`, `submit_king_vote`, `submit_hunter_shot`, `game_view`, `play_again`). Saat vote seri dan Raja masih hidup, permainan masuk tahap `king` agar Raja memutuskan siapa yang dieliminasi.
- `tests/engine.test.mjs` — uji integrasi engine memakai `@electric-sql/pglite`.

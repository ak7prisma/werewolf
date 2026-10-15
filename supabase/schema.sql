-- Wolf Night - Supabase base schema (katalog role)
-- Jalankan PALING DULU, sebelum online.sql dan engine.sql.
--
-- Tabel public.roles adalah sumber tunggal katalog role: dipakai halaman Katalog
-- (baca publik) sekaligus oleh engine sebagai daftar role aktif untuk dibagikan.
-- Nama role (`name`) WAJIB sama persis dengan string yang dikenali engine/reducer
-- (mis. 'Werewolf', 'Strong Villager') dan `icon` harus salah satu kunci di
-- src/data/roleIcons.ts.

create table if not exists public.roles (
  name        text primary key,
  short       text not null,
  description text not null,
  team        text not null check (team in ('werewolf', 'village', 'neutral')),
  category    text not null check (category in ('evil', 'active', 'variable', 'normal', 'neutral')),
  icon        text not null default 'GiWerewolf',
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Untuk database yang sudah ada: perluas constraint agar menerima role netral.
alter table public.roles drop constraint if exists roles_team_check;
alter table public.roles
  add constraint roles_team_check check (team in ('werewolf', 'village', 'neutral'));
alter table public.roles drop constraint if exists roles_category_check;
alter table public.roles
  add constraint roles_category_check check (category in ('evil', 'active', 'variable', 'normal', 'neutral'));

alter table public.roles enable row level security;

-- Katalog boleh dibaca siapa saja (termasuk anon), tidak boleh ditulis client.
drop policy if exists "public read roles" on public.roles;
create policy "public read roles"
  on public.roles for select
  using (true);

grant select on public.roles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed: bawaan yang sama dengan ROLES di src/data/roles.ts
-- ---------------------------------------------------------------------------

insert into public.roles (name, short, description, team, category, icon, sort_order) values
  ('Werewolf', 'Serigala.',
   'Kamu serigala! Mangsalah warga setiap malam dan tutupi jejakmu dengan kebohongan yang meyakinkan.',
   'werewolf', 'evil', 'GiWerewolf', 1),
  ('Seer', 'Peramal.',
   'Kamu peramal. Terawang satu orang setiap malam untuk menguji apakah dia musuh atau kawan.',
   'village', 'active', 'GiEyeOfHorus', 2),
  ('Guardian', 'Pelindung.',
   'Kamu pelindung. Pilih satu pemain setiap malam untuk dijaga dari gigitan Werewolf.',
   'village', 'active', 'GiShield', 3),
  ('Hunter', 'Pemburu.',
   'Kamu pemburu! Saat kamu mati, tarik pelatuk dan tembak satu pemain lain pilihanmu.',
   'village', 'normal', 'GiCrosshair', 4),
  ('Lycan', 'Lycan.',
   'Kamu warga baik dengan darah terkutuk. Jika diperiksa Seer, kamu terbaca sebagai Werewolf!',
   'village', 'normal', 'GiHound', 5),
  ('Disease', 'Beracun.',
   'Tubuhmu beracun. Jika kamu dimangsa Werewolf, mereka keracunan dan absen berburu malam berikutnya.',
   'village', 'normal', 'GiVomiting', 6),
  ('Cursed', 'Terkutuk.',
   'Kamu terkutuk. Jika digigit Werewolf, kamu tidak mati - kamu justru menjadi Werewolf baru, dan seluruh Werewolf lama langsung tewas!',
   'village', 'variable', 'GiBlood', 7),
  ('Strong Villager', '2 nyawa.',
   'Kamu warga bertubuh kekar dengan 2 nyawa! Jika dibunuh Werewolf, kamu bangkit sekali lagi. Gunakan kesempatan itu dengan bijak.',
   'village', 'normal', 'GiBiceps', 8),
  ('Orphan', 'Yatim piatu.',
   'Kamu yatim piatu. Pilih 1 pemain sebagai bapak angkatmu. Jika dia mati, kamu bangkit dan berubah menjadi Werewolf!',
   'village', 'variable', 'GiBabyFace', 9),
  ('Doctor', 'Dokter.',
   'Kamu dokter desa. Kamu punya 1 kesempatan untuk menghidupkan kembali 1 pemain yang sudah mati. Pakai dengan bijak.',
   'village', 'active', 'GiMedicalPack', 10),
  ('King', 'Raja.',
   'Kamu raja desa. Saat vote warga seri, hak prerogatif ada padamu: tentukan satu kandidat terikat untuk dieliminasi.',
   'village', 'normal', 'GiCrown', 11),
  ('Doppelganger', 'Penyamar.',
   'Penyamar. Pilih pemain yang sudah mati dan ambil perannya.',
   'village', 'variable', 'GiDominoMask', 12),
  ('Fool', 'Badut.',
   'Kamu si Badut netral, tidak berpihak pada siapa pun. Kamu menang seketika bila warga menghukummu lewat voting - biarkan mereka menyesal telah memilihmu!',
   'neutral', 'neutral', 'GiJesterHat', 13)
on conflict (name) do update set
  short       = excluded.short,
  description = excluded.description,
  team        = excluded.team,
  category    = excluded.category,
  icon        = excluded.icon,
  sort_order  = excluded.sort_order,
  updated_at  = now();

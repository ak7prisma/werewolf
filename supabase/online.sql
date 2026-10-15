-- Wolf Night - Supabase online schema (fase 1: room + lobby + pembagian role)
-- Jalankan setelah schema.sql (butuh tabel public.roles).
--
-- Model: server-authoritative. Client TIDAK menulis langsung ke tabel; semua
-- mutasi lewat RPC SECURITY DEFINER yang memvalidasi auth.uid(). Role pemain
-- disimpan terpisah dan hanya bisa dibaca oleh pemiliknya.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  host_id       uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  phase         text not null default 'lobby',
  stage         text,
  round         int  not null default 0,
  phase_ends_at timestamptz,
  min_players   int  not null default 4,
  max_players   int  not null default 11,
  role_pool     text[] not null default '{Seer,Guardian,Doctor}',
  winner        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.room_players (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  seat         int  not null default 0,
  display_name text not null,
  is_host      boolean not null default false,
  is_ready     boolean not null default false,
  alive        boolean not null default true,
  connected    boolean not null default true,
  joined_at    timestamptz not null default now(),
  unique (room_id, user_id)
);

-- Rahasia. Dibaca hanya oleh pemiliknya (RLS di bawah).
create table if not exists public.player_roles (
  room_id  uuid not null references public.rooms (id) on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  role     text not null,
  revealed boolean not null default false,
  primary key (room_id, user_id)
);

create index if not exists room_players_room_idx on public.room_players (room_id);
create index if not exists player_roles_room_idx on public.player_roles (room_id);

-- ---------------------------------------------------------------------------
-- Helper: keanggotaan room (SECURITY DEFINER agar tidak rekursi di RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.room_players
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.rooms        enable row level security;
alter table public.room_players enable row level security;
alter table public.player_roles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "read joined rooms" on public.rooms;
create policy "read joined rooms"
  on public.rooms for select
  using (host_id = auth.uid() or public.is_room_member(id));

drop policy if exists "read players in joined rooms" on public.room_players;
create policy "read players in joined rooms"
  on public.room_players for select
  using (public.is_room_member(room_id));

drop policy if exists "read own role" on public.player_roles;
create policy "read own role"
  on public.player_roles for select
  using (user_id = auth.uid());

-- Tidak ada policy INSERT/UPDATE/DELETE → semua tulis hanya lewat RPC definer.

-- ---------------------------------------------------------------------------
-- RPC: room lifecycle
-- ---------------------------------------------------------------------------

create or replace function public.generate_room_code()
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result   text;
  i        int;
begin
  loop
    result := '';
    for i in 1..5 loop
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where code = result);
  end loop;
  return result;
end;
$$;

create or replace function public.create_room(p_display_name text)
returns public.rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := trim(coalesce(p_display_name, ''));
  v_room public.rooms;
begin
  if v_uid is null then raise exception 'Sesi tidak ditemukan, coba muat ulang.'; end if;
  if v_name = '' then raise exception 'Nama pemain wajib diisi.'; end if;

  insert into public.profiles (id, display_name)
  values (v_uid, v_name)
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.rooms (code, host_id)
  values (public.generate_room_code(), v_uid)
  returning * into v_room;

  insert into public.room_players (room_id, user_id, seat, display_name, is_host, is_ready)
  values (v_room.id, v_uid, 0, v_name, true, true);

  return v_room;
end;
$$;

create or replace function public.join_room(p_code text, p_display_name text)
returns public.rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := trim(coalesce(p_display_name, ''));
  v_code text := upper(trim(coalesce(p_code, '')));
  v_room public.rooms;
  v_count int;
  v_seat  int;
begin
  if v_uid is null then raise exception 'Sesi tidak ditemukan, coba muat ulang.'; end if;
  if v_name = '' then raise exception 'Nama pemain wajib diisi.'; end if;
  if v_code = '' then raise exception 'Kode room wajib diisi.'; end if;

  insert into public.profiles (id, display_name)
  values (v_uid, v_name)
  on conflict (id) do update set display_name = excluded.display_name;

  select * into v_room from public.rooms where code = v_code for update;
  if not found then raise exception 'Room dengan kode % tidak ditemukan.', v_code; end if;
  if v_room.status <> 'lobby' then raise exception 'Room ini sudah mulai bermain.'; end if;

  if exists (select 1 from public.room_players where room_id = v_room.id and user_id = v_uid) then
    update public.room_players
      set display_name = v_name, connected = true
      where room_id = v_room.id and user_id = v_uid;
    return v_room;
  end if;

  select count(*) into v_count from public.room_players where room_id = v_room.id;
  if v_count >= v_room.max_players then raise exception 'Room sudah penuh.'; end if;

  select coalesce(max(seat), -1) + 1 into v_seat
    from public.room_players where room_id = v_room.id;

  insert into public.room_players (room_id, user_id, seat, display_name, is_host)
  values (v_room.id, v_uid, v_seat, v_name, false);

  return v_room;
end;
$$;

create or replace function public.set_ready(p_ready boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.room_players
    set is_ready = coalesce(p_ready, false)
    where user_id = auth.uid()
      and room_id in (select id from public.rooms where status = 'lobby');
end;
$$;

create or replace function public.leave_room()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_room public.rooms;
begin
  select r.* into v_room
    from public.rooms r
    join public.room_players rp on rp.room_id = r.id
    where rp.user_id = v_uid and r.status in ('lobby', 'playing', 'finished')
    limit 1;

  if not found then
    -- Tak ada room lobby/selesai: bersihkan keanggotaan yang tertinggal (mis. mid-game).
    delete from public.room_players
      where user_id = v_uid and room_id in (select id from public.rooms);
    return;
  end if;

  if v_room.host_id = v_uid then
    delete from public.rooms where id = v_room.id;  -- cascade ke players & state
  else
    delete from public.room_players where room_id = v_room.id and user_id = v_uid;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: bubarkan room (host saja, kapan saja termasuk saat bermain)
-- ---------------------------------------------------------------------------

create or replace function public.delete_room()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_room_id uuid;
begin
  select id into v_room_id
    from public.rooms
    where host_id = v_uid
    limit 1;

  if v_room_id is null then
    raise exception 'Hanya host yang dapat membubarkan room.';
  end if;

  delete from public.rooms where id = v_room_id;  -- cascade ke players & state
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: mulai game (kocok + bagi role di server)
-- ---------------------------------------------------------------------------

create or replace function public.start_game()
returns public.rooms
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_room      public.rooms;
  v_all       text[];
  v_deck      text[];
  v_active    text[];
  v_count     int;
  v_player    record;
  v_idx       int;
  v_candidate text;
  v_i         int := 0;
begin
  select * into v_room from public.rooms
    where host_id = v_uid and status = 'lobby'
    for update;
  if not found then raise exception 'Kamu bukan host room yang menunggu di lobby.'; end if;

  select count(*) into v_count from public.room_players where room_id = v_room.id;
  if v_count < v_room.min_players then
    raise exception 'Butuh minimal % pemain untuk memulai.', v_room.min_players;
  end if;

  if exists (
    select 1 from public.room_players
    where room_id = v_room.id and is_host = false and is_ready = false
  ) then
    raise exception 'Masih ada pemain yang belum siap.';
  end if;

  select array_agg(name order by sort_order) into v_all from public.roles where is_active;
  if v_all is null or array_length(v_all, 1) < v_count then
    raise exception 'Katalog role di database tidak cukup untuk % pemain.', v_count;
  end if;

  select array_agg(t.role order by random()) into v_deck
    from unnest(v_all) as t(role);
  v_deck := v_deck[1:v_count];

  v_active := coalesce(v_room.role_pool, '{}');

  -- Jamin minimal 2 role aktif malam.
  while (select count(*) from unnest(v_deck) as d(role) where d.role = any(v_active)) < 2 loop
    select i into v_idx from generate_subscripts(v_deck, 1) as i
      where v_deck[i] <> all(v_active) and v_deck[i] <> 'Werewolf'
      limit 1;
    exit when v_idx is null;

    select a.x into v_candidate from unnest(v_active) as a(x)
      where a.x <> all(v_deck)
      limit 1;
    exit when v_candidate is null;

    v_deck[v_idx] := v_candidate;
  end loop;

  -- Jamin ada tepat satu Werewolf.
  if not ('Werewolf' = any(v_deck)) then
    select i into v_idx from generate_subscripts(v_deck, 1) as i
      where v_deck[i] <> all(v_active)
      limit 1;
    if v_idx is not null then v_deck[v_idx] := 'Werewolf'; end if;
  end if;

  delete from public.player_roles where room_id = v_room.id;

  for v_player in
    select user_id from public.room_players where room_id = v_room.id order by seat
  loop
    v_i := v_i + 1;
    insert into public.player_roles (room_id, user_id, role)
    values (v_room.id, v_player.user_id, v_deck[v_i]);
  end loop;

  update public.rooms
    set status = 'playing', phase = 'reveal', stage = 'role', round = 1, updated_at = now()
    where id = v_room.id
    returning * into v_room;

  return v_room;
end;
$$;

grant execute on function public.create_room(text)      to anon, authenticated;
grant execute on function public.join_room(text, text)  to anon, authenticated;
grant execute on function public.set_ready(boolean)      to anon, authenticated;
grant execute on function public.leave_room()            to anon, authenticated;
grant execute on function public.delete_room()           to anon, authenticated;
grant execute on function public.start_game()            to anon, authenticated;
grant execute on function public.is_room_member(uuid)    to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast perubahan rooms & room_players
-- ---------------------------------------------------------------------------

-- Replica identity penuh agar event DELETE tetap membawa room_id (dibutuhkan
-- oleh filter realtime saat pemain keluar room).
alter table public.rooms        replica identity full;
alter table public.room_players replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.rooms;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.room_players;
  exception when duplicate_object then null;
  end;
end $$; 
-- Wolf Night - Supabase auto-bubarkan room (bersihkan aktivitas basi)
-- Jalankan setelah schema.sql, online.sql, dan engine.sql.
--
-- Room yang tidak ada aktivitas selama >= 30 menit dibubarkan otomatis, agar
-- room lama tidak "nyangkut" dan tidak lagi di-resume saat membuka menu Online.
--
-- Sumber aktivitas:
--   1. Setiap perubahan pada public.room_players (join/ready/mati/keluar)
--      ditandai lewat trigger `room_players_activity`.
--   2. Heartbeat client `touch_room()` selama pemain masih membuka room
--      (termasuk saat lobby pasif tanpa perubahan).
--   3. Aksi permainan (night/vote/hunter) menyentuh room_players & game_state.
--
-- Pembersihan berjalan dua lapis:
--   a. `cleanup_stale_rooms()` - dipanggil client tiap membuka menu Online.
--   b. pg_cron (bila ekstensi tersedia) - tiap 5 menit.

-- ---------------------------------------------------------------------------
-- Kolom aktivitas
-- ---------------------------------------------------------------------------

alter table public.rooms
  add column if not exists last_activity_at timestamptz;

-- Backfill room lama dari waktu update terakhirnya, sehingga room yang memang
-- sudah lama tak aktif (mis. dari kemarin) langsung terhitung basi.
update public.rooms
  set last_activity_at = coalesce(updated_at, created_at)
  where last_activity_at is null;

alter table public.rooms alter column last_activity_at set default now();
alter table public.rooms alter column last_activity_at set not null;

create index if not exists rooms_last_activity_idx on public.rooms (last_activity_at);

-- ---------------------------------------------------------------------------
-- Trigger: perubahan pemain menandai room masih aktif
-- ---------------------------------------------------------------------------

create or replace function public.touch_room_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room uuid;
begin
  if tg_op = 'DELETE' then
    v_room := old.room_id;
  else
    v_room := new.room_id;
  end if;

  if v_room is not null then
    update public.rooms
      set last_activity_at = now()
      where id = v_room
        and last_activity_at < now() - interval '5 seconds';
  end if;

  return null;
end;
$$;

drop trigger if exists room_players_activity on public.room_players;
create trigger room_players_activity
  after insert or update or delete on public.room_players
  for each row execute function public.touch_room_activity();

-- ---------------------------------------------------------------------------
-- RPC: heartbeat kehadiran (dipanggil client berkala selama room terbuka)
-- ---------------------------------------------------------------------------

create or replace function public.touch_room()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;

  update public.rooms
    set last_activity_at = now()
    where id in (select room_id from public.room_players where user_id = v_uid)
      and last_activity_at < now() - interval '30 seconds';
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: bubarkan semua room basi (default: tidak aktif >= 30 menit)
-- ---------------------------------------------------------------------------

create or replace function public.cleanup_stale_rooms()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  with gone as (
    delete from public.rooms
    where last_activity_at < now() - interval '30 minutes'
    returning 1
  )
  select count(*) into v_deleted from gone;

  return coalesce(v_deleted, 0);
end;
$$;

grant execute on function public.touch_room()          to anon, authenticated;
grant execute on function public.cleanup_stale_rooms() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Penjadwalan opsional via pg_cron (bila ekstensi tersedia)
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then null;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      if exists (select 1 from cron.job where jobname = 'wolf-night-stale-rooms') then
        perform cron.unschedule('wolf-night-stale-rooms');
      end if;

      perform cron.schedule(
        'wolf-night-stale-rooms',
        '*/5 * * * *',
        $job$select public.cleanup_stale_rooms();$job$
      );
    exception when others then null;
    end;
  end if;
end;
$$;

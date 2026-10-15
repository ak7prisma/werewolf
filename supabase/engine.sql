-- Wolf Night - Supabase online game engine (fase 2: malam/siang otomatis)
-- Jalankan setelah schema.sql dan online.sql.
--
-- Server-authoritative: seluruh state game disimpan di public.game_state yang
-- RLS-nya menutup akses client. Client hanya memanggil RPC dan membaca hasil
-- lewat public.game_view(). Role tiap pemain tetap di public.player_roles
-- (hanya pemilik yang bisa baca).

-- ---------------------------------------------------------------------------
-- Kolom tambahan
-- ---------------------------------------------------------------------------

alter table public.room_players add column if not exists hp int not null default 1;
alter table public.room_players add column if not exists transformed_from text;
alter table public.player_roles add column if not exists orphan_father int;

-- ---------------------------------------------------------------------------
-- Tabel state rahasia & pendukung
-- ---------------------------------------------------------------------------

create table if not exists public.game_state (
  room_id            uuid primary key references public.rooms (id) on delete cascade,
  round              int  not null default 0,
  phase              text not null default 'night',
  stage              text,
  resume_stage       text,
  night_order        text[] not null default '{}',
  night_index        int  not null default 0,
  night_acted        text[] not null default '{}',
  wolf_target        int,
  guard_target       int,
  last_guard_target  int,
  guardian_self_used boolean not null default false,
  seer_target        int,
  wolf_poisoned      boolean not null default false,
  wolf_skip          boolean not null default false,
  pending_hunter     int,
  day_victim         int,
  king_tied          int[],
  night_start_alive  int[],
  day_report         text[],
  day_ready          int[],
  doctor_charges     int  not null default 0,
  deadline           timestamptz,
  winner             text,
  updated_at         timestamptz not null default now()
);

alter table public.game_state add column if not exists king_tied int[];
alter table public.game_state add column if not exists night_start_alive int[];
alter table public.game_state add column if not exists day_report text[];
alter table public.game_state add column if not exists day_ready int[];
alter table public.game_state add column if not exists night_acted text[] not null default '{}';

alter table public.game_state enable row level security;
-- Sengaja tanpa policy: hanya RPC SECURITY DEFINER yang boleh mengakses.

create table if not exists public.events (
  id         bigserial primary key,
  room_id    uuid not null references public.rooms (id) on delete cascade,
  round      int  not null default 0,
  kind       text not null,
  message    text not null,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
drop policy if exists "read events of joined rooms" on public.events;
create policy "read events of joined rooms"
  on public.events for select
  using (public.is_room_member(room_id));

-- Realtime: beri tahu client saat ada event baru (log permainan).
do $$
begin
  begin
    alter publication supabase_realtime add table public.events;
  exception when duplicate_object then null;
  end;
end $$;

create table if not exists public.player_results (
  room_id     uuid not null references public.rooms (id) on delete cascade,
  user_id     uuid not null,
  round       int  not null,
  kind        text not null,
  target_seat int,
  is_threat   boolean,
  primary key (room_id, user_id, round, kind)
);
alter table public.player_results enable row level security;
drop policy if exists "read own results" on public.player_results;
create policy "read own results"
  on public.player_results for select
  using (user_id = auth.uid());

create table if not exists public.votes (
  room_id     uuid not null references public.rooms (id) on delete cascade,
  round       int  not null,
  voter_id    uuid not null,
  target_seat int,
  primary key (room_id, round, voter_id)
);
alter table public.votes enable row level security;
-- Tanpa policy: vote hanya lewat RPC.

-- ---------------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------------

create or replace function public._event(p_room uuid, p_kind text, p_message text)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.events (room_id, round, kind, message)
  select p_room, coalesce((select round from public.game_state where room_id = p_room), 0),
         p_kind, p_message;
$$;

create or replace function public._seat_of_user(p_room uuid, p_user uuid)
returns int language sql stable security definer set search_path = public, pg_temp as $$
  select seat from public.room_players where room_id = p_room and user_id = p_user;
$$;

create or replace function public._uid_of_seat(p_room uuid, p_seat int)
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select user_id from public.room_players where room_id = p_room and seat = p_seat;
$$;

create or replace function public._role_of_seat(p_room uuid, p_seat int)
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select pr.role
  from public.room_players rp
  join public.player_roles pr on pr.room_id = rp.room_id and pr.user_id = rp.user_id
  where rp.room_id = p_room and rp.seat = p_seat;
$$;

create or replace function public._team_of_role(p_role text)
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select team from public.roles where name = p_role;
$$;

create or replace function public._has_alive_role(p_room uuid, p_role text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.room_players rp
    join public.player_roles pr on pr.room_id = rp.room_id and pr.user_id = rp.user_id
    where rp.room_id = p_room and rp.alive and pr.role = p_role
  );
$$;

create or replace function public._alive_seats(p_room uuid)
returns int[] language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(array_agg(seat order by seat), '{}')
  from public.room_players where room_id = p_room and alive;
$$;

create or replace function public._king_seat(p_room uuid)
returns int language sql stable security definer set search_path = public, pg_temp as $$
  select rp.seat
  from public.room_players rp
  join public.player_roles pr on pr.room_id = rp.room_id and pr.user_id = rp.user_id
  where rp.room_id = p_room and rp.alive and pr.role = 'King'
  limit 1;
$$;

create or replace function public._candidates(p_room uuid, p_role text)
returns int[] language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_gs   public.game_state;
  v_out  int[];
begin
  select * into v_gs from public.game_state where room_id = p_room;
  select coalesce(array_agg(rp.seat order by rp.seat), '{}') into v_out
  from public.room_players rp
  join public.player_roles pr on pr.room_id = rp.room_id and pr.user_id = rp.user_id
  where rp.room_id = p_room
    and case p_role
      when 'Werewolf'     then rp.alive and pr.role <> 'Werewolf'
      when 'Guardian'     then rp.alive
                            and (v_gs.last_guard_target is null or rp.seat <> v_gs.last_guard_target)
                            and not (v_gs.guardian_self_used and pr.role = 'Guardian')
      when 'Seer'         then rp.alive and pr.role <> 'Seer'
      when 'Doctor'       then not rp.alive
      when 'Orphan'       then rp.alive and pr.role <> 'Orphan'
      when 'Doppelganger' then not rp.alive and pr.role <> 'Doppelganger'
      else false
    end;
  return coalesce(v_out, '{}');
end;
$$;

create or replace function public._night_order(p_room uuid, p_round int)
returns text[] language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_charges int;
  v_order   text[] := '{}';
  v_orphan  boolean;
begin
  select doctor_charges into v_charges from public.game_state where room_id = p_room;

  select exists (
    select 1 from public.room_players rp
    join public.player_roles pr on pr.room_id = rp.room_id and pr.user_id = rp.user_id
    where rp.room_id = p_room and rp.alive and pr.role = 'Orphan' and pr.orphan_father is null
  ) into v_orphan;

  if p_round <= 1 then
    if public._has_alive_role(p_room, 'Seer') then v_order := array_append(v_order, 'Seer'); end if;
    if v_orphan then v_order := array_append(v_order, 'Orphan'); end if;
    return (select coalesce(array_agg(x order by random()), '{}') from unnest(v_order) x);
  end if;

  if exists (
    select 1 from public.room_players rp
    join public.player_roles pr on pr.room_id = rp.room_id and pr.user_id = rp.user_id
    join public.roles r on r.name = pr.role
    where rp.room_id = p_room and rp.alive and r.team = 'werewolf'
  ) then v_order := array_append(v_order, 'Werewolf'); end if;

  if public._has_alive_role(p_room, 'Guardian') then v_order := array_append(v_order, 'Guardian'); end if;
  if public._has_alive_role(p_room, 'Seer') then v_order := array_append(v_order, 'Seer'); end if;
  if v_charges > 0 and public._has_alive_role(p_room, 'Doctor') then
    v_order := array_append(v_order, 'Doctor');
  end if;
  if v_orphan then v_order := array_append(v_order, 'Orphan'); end if;
  if public._has_alive_role(p_room, 'Doppelganger')
     and exists (select 1 from public.room_players where room_id = p_room and not alive) then
    v_order := array_append(v_order, 'Doppelganger');
  end if;

  return (select coalesce(array_agg(x order by random()), '{}') from unnest(v_order) x);
end;
$$;

-- Terapkan satu kematian. Meniru applyDeath di src/game/reducer.ts.
create or replace function public._apply_death(p_room uuid, p_seat int, p_cause text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid    uuid;
  v_role   text;
  v_alive  boolean;
  v_hp     int;
  v_name   text;
  v_wolf   record;
  v_names  text;
  v_orphan record;
begin
  select user_id, alive, hp, display_name into v_uid, v_alive, v_hp, v_name
    from public.room_players where room_id = p_room and seat = p_seat;
  if v_uid is null or not v_alive then return; end if;

  v_role := public._role_of_seat(p_room, p_seat);

  if p_cause = 'werewolf' and v_role = 'Cursed' then
    select string_agg(display_name, ', ') into v_names
      from public.room_players rp
      join public.player_roles pr on pr.room_id = rp.room_id and pr.user_id = rp.user_id
      where rp.room_id = p_room and rp.alive and pr.role = 'Werewolf';

    update public.room_players rp set alive = false
      from public.player_roles pr
      where rp.room_id = p_room and pr.room_id = rp.room_id and pr.user_id = rp.user_id
        and rp.alive and pr.role = 'Werewolf';

    update public.player_roles set role = 'Werewolf'
      where room_id = p_room and user_id = v_uid;
    update public.room_players set alive = true, hp = 1, transformed_from = 'Cursed'
      where room_id = p_room and seat = p_seat;

    perform public._event(p_room, 'curse',
      format('%s (Cursed) menjadi Werewolf baru%s', v_name,
        case when v_names is null then '!' else format(', dan Werewolf lama (%s) tewas!', v_names) end));
    return;
  end if;

  if v_role = 'Strong Villager' and v_hp > 1 then
    update public.room_players set hp = hp - 1 where room_id = p_room and seat = p_seat;
    perform public._event(p_room, 'revive',
      format('Strong Villager %s bangkit! Sisa %s nyawa.', v_name, v_hp - 1));
    return;
  end if;

  update public.room_players set alive = false where room_id = p_room and seat = p_seat;

  -- Orphan yang bapak angkatnya baru mati berubah jadi Werewolf.
  for v_orphan in
    select rp.seat, rp.user_id, rp.display_name
    from public.room_players rp
    join public.player_roles pr on pr.room_id = rp.room_id and pr.user_id = rp.user_id
    where rp.room_id = p_room and pr.role = 'Orphan' and pr.orphan_father = p_seat
  loop
    update public.player_roles set role = 'Werewolf', orphan_father = null
      where room_id = p_room and user_id = v_orphan.user_id;
    update public.room_players set alive = true, hp = 1, transformed_from = 'Orphan'
      where room_id = p_room and seat = v_orphan.seat;
    perform public._event(p_room, 'transform',
      format('%s kehilangan bapak angkatnya dan bangkit sebagai WEREWOLF!', v_orphan.display_name));
  end loop;

  if p_cause = 'werewolf' and v_role = 'Disease' then
    update public.game_state set wolf_poisoned = true where room_id = p_room;
    perform public._event(p_room, 'poison', 'Werewolf keracunan dan absen berburu malam berikutnya.');
  end if;

  if v_role = 'Hunter' then
    update public.game_state set pending_hunter = p_seat where room_id = p_room;
    perform public._event(p_room, 'hunter', format('%s (Hunter) masih memegang pelatuk!', v_name));
  else
    perform public._event(p_room, 'death', format('%s tewas.', v_name));
  end if;
end;
$$;

create or replace function public._check_winner(p_room uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_gs        public.game_state;
  v_wolves    int;
  v_village   int;
  v_winner    text;
begin
  select * into v_gs from public.game_state where room_id = p_room;
  if v_gs.phase = 'finished' or v_gs.pending_hunter is not null then return; end if;

  select count(*) into v_wolves
  from public.room_players rp
  join public.player_roles pr on pr.room_id = rp.room_id and pr.user_id = rp.user_id
  join public.roles r on r.name = pr.role
  where rp.room_id = p_room and rp.alive and r.team = 'werewolf';

  select count(*) - v_wolves into v_village
    from public.room_players where room_id = p_room and alive;

  if (select count(*) from public.room_players where room_id = p_room) = 0 then return; end if;

  if v_wolves = 0 then v_winner := 'village';
  elsif v_wolves >= v_village then v_winner := 'werewolf';
  end if;

  if v_winner is not null then
    update public.game_state set phase = 'finished', stage = 'finished', winner = v_winner where room_id = p_room;
    -- Buka semua peran hanya saat permainan berakhir.
    update public.player_roles set revealed = true where room_id = p_room;
    update public.rooms set status = 'finished', phase = 'finished', winner = v_winner, updated_at = now()
      where id = p_room;
    perform public._event(p_room, 'winner',
      case when v_winner = 'village' then 'Kemenangan WARGA DESA!' else 'Kemenangan WEREWOLF!' end);
  end if;
end;
$$;

-- Aksi malam kini paralel (lihat _begin_night dan submit_night_action), sehingga
-- helper pemanggil role bergantian sudah tidak dipakai lagi.
drop function if exists public._advance_call(uuid);

create or replace function public._resolve_dawn(p_room uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_gs public.game_state;
begin
  select * into v_gs from public.game_state where room_id = p_room for update;

  if v_gs.wolf_skip then
    perform public._event(p_room, 'dawn', 'Malam berlalu tanpa mangsa - Werewolf masih keracunan.');
  elsif v_gs.wolf_target is not null then
    if v_gs.guard_target = v_gs.wolf_target then
      perform public._event(p_room, 'guarded',
        format('%s dilindungi Guardian - serangan Werewolf gagal!',
          (select display_name from public.room_players where room_id = p_room and seat = v_gs.wolf_target)));
    else
      perform public._apply_death(p_room, v_gs.wolf_target, 'werewolf');
    end if;
  end if;

  select * into v_gs from public.game_state where room_id = p_room;

  if v_gs.pending_hunter is not null then
    update public.game_state set stage = 'hunter', resume_stage = 'dawn', deadline = now() + interval '30 seconds'
      where room_id = p_room;
    return;
  end if;

  -- Tanpa jeda: begitu semua role malam beraksi, fajar langsung berganti siang.
  update public.game_state set stage = 'dawn', deadline = now() where room_id = p_room;
  perform public._check_winner(p_room);
end;
$$;

create or replace function public._begin_day(p_room uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_start   int[];
  v_deaths  text[];
  v_revives text[];
  v_report  text[] := '{}';
  v_name    text;
begin
  select coalesce(night_start_alive, '{}') into v_start
    from public.game_state where room_id = p_room;

  -- Hanya nama yang berubah status sejak awal malam - tanpa menyebut alasannya.
  select array_agg(rp.display_name order by rp.seat) into v_deaths
    from public.room_players rp
    where rp.room_id = p_room and not rp.alive and rp.seat = any(v_start);

  select array_agg(rp.display_name order by rp.seat) into v_revives
    from public.room_players rp
    where rp.room_id = p_room and rp.alive and not (rp.seat = any(v_start));

  if v_deaths is not null then
    foreach v_name in array v_deaths loop
      v_report := array_append(v_report, format('%s tewas semalam.', v_name));
    end loop;
  end if;
  if v_revives is not null then
    foreach v_name in array v_revives loop
      v_report := array_append(v_report, format('%s kembali bangkit.', v_name));
    end loop;
  end if;
  if cardinality(v_report) = 0 then
    v_report := array['Semalam sunyi, tidak ada yang tewas.'];
  end if;

  update public.game_state
    set phase = 'day', stage = 'discussion', deadline = now() + interval '120 seconds',
        day_victim = null, day_report = v_report, day_ready = '{}'
    where room_id = p_room;
  update public.rooms set phase = 'day', stage = 'discussion', updated_at = now() where id = p_room;
  perform public._event(p_room, 'day', 'Siang tiba.');
end;
$$;

create or replace function public._begin_vote(p_room uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_round int;
begin
  select round into v_round from public.game_state where room_id = p_room;
  delete from public.votes where room_id = p_room and round = v_round;
  update public.game_state set stage = 'vote', deadline = now() + interval '60 seconds', day_ready = '{}'
    where room_id = p_room;
  update public.rooms set stage = 'vote', updated_at = now() where id = p_room;
  perform public._event(p_room, 'vote', 'Voting dimulai - pilih siapa yang digantung!');
end;
$$;

create or replace function public._tally(p_room uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_round  int;
  v_top    int;
  v_count  int;
  v_ties   int;
  v_tied   int[];
  v_king   int;
begin
  select round into v_round from public.game_state where room_id = p_room;

  select target_seat, count(*) into v_top, v_count
    from public.votes
    where room_id = p_room and round = v_round and target_seat is not null
    group by target_seat
    order by count(*) desc, target_seat
    limit 1;

  if v_top is null then
    update public.game_state set stage = 'result', day_victim = null, deadline = now() + interval '8 seconds'
      where room_id = p_room;
    perform public._event(p_room, 'vote', 'Tidak ada yang dieliminasi (tidak ada suara).');
    perform public._check_winner(p_room);
    return;
  end if;

  select count(*) into v_ties
    from (
      select target_seat from public.votes
      where room_id = p_room and round = v_round and target_seat is not null
      group by target_seat having count(*) = v_count
    ) t;

  if v_ties > 1 then
    v_king := public._king_seat(p_room);

    if v_king is not null then
      select array_agg(t.target_seat order by t.target_seat) into v_tied
      from (
        select target_seat from public.votes
        where room_id = p_room and round = v_round and target_seat is not null
        group by target_seat having count(*) = v_count
      ) t;

      update public.game_state
        set stage = 'king', day_victim = null, king_tied = v_tied,
            deadline = now() + interval '30 seconds'
        where room_id = p_room;
      perform public._event(p_room, 'vote', 'Suara seri - Raja menentukan siapa yang dieliminasi!');
      return;
    end if;

    update public.game_state set stage = 'result', day_victim = null, deadline = now() + interval '8 seconds'
      where room_id = p_room;
    perform public._event(p_room, 'vote', 'Suara seri - tidak ada yang dieliminasi.');
    perform public._check_winner(p_room);
    return;
  end if;

  update public.game_state set day_victim = v_top where room_id = p_room;
  perform public._apply_death(p_room, v_top, 'vote');

  if (select pending_hunter from public.game_state where room_id = p_room) is not null then
    update public.game_state set stage = 'hunter', resume_stage = 'result', deadline = now() + interval '30 seconds'
      where room_id = p_room;
    return;
  end if;

  update public.game_state set stage = 'result', deadline = now() + interval '8 seconds' where room_id = p_room;
  perform public._check_winner(p_room);
end;
$$;

create or replace function public._begin_night(p_room uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_gs    public.game_state;
  v_round int;
  v_role  text;
  v_order text[] := '{}';
begin
  select * into v_gs from public.game_state where room_id = p_room for update;
  v_round := v_gs.round + 1;

  -- Hanya role yang punya target valid. Semua role ini beraksi PARALEL dalam
  -- satu jendela waktu (tidak bergantian menunggu satu sama lain).
  foreach v_role in array public._night_order(p_room, v_round) loop
    if coalesce(cardinality(public._candidates(p_room, v_role)), 0) > 0 then
      v_order := array_append(v_order, v_role);
    end if;
  end loop;

  update public.game_state
    set round = v_round,
        phase = 'night',
        stage = 'call',
        night_order = v_order,
        night_index = 0,
        night_acted = '{}',
        wolf_target = null,
        guard_target = null,
        seer_target = null,
        day_victim = null,
        wolf_skip = v_gs.wolf_poisoned,
        wolf_poisoned = false,
        pending_hunter = null,
        night_start_alive = public._alive_seats(p_room),
        day_report = null,
        day_ready = '{}',
        winner = null,
        deadline = case when cardinality(v_order) > 0 then now() + interval '90 seconds' else null end
    where room_id = p_room;

  update public.rooms set phase = 'night', stage = 'call', updated_at = now() where id = p_room;
  perform public._event(p_room, 'night', format('Malam ke-%s. Semua tidur…', v_round));

  if cardinality(v_order) = 0 then
    perform public._resolve_dawn(p_room);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC publik
-- ---------------------------------------------------------------------------

create or replace function public.start_online_game()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
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
  v_has_doc   boolean;
begin
  select * into v_room from public.rooms
    where host_id = v_uid and status = 'lobby' for update;
  if not found then raise exception 'Kamu bukan host room yang menunggu di lobby.'; end if;

  select count(*) into v_count from public.room_players where room_id = v_room.id;
  if v_count < v_room.min_players then
    raise exception 'Butuh minimal % pemain untuk memulai.', v_room.min_players;
  end if;
  if exists (select 1 from public.room_players where room_id = v_room.id and not is_host and not is_ready) then
    raise exception 'Masih ada pemain yang belum siap.';
  end if;

  select array_agg(name order by sort_order) into v_all from public.roles where is_active;
  if v_all is null or cardinality(v_all) < v_count then
    raise exception 'Katalog role di database tidak cukup untuk % pemain.', v_count;
  end if;

  select array_agg(t.role order by random()) into v_deck from unnest(v_all) as t(role);
  v_deck := v_deck[1:v_count];
  v_active := coalesce(v_room.role_pool, '{}');

  while (select count(*) from unnest(v_deck) as d(role) where d.role = any(v_active)) < 2 loop
    select i into v_idx from generate_subscripts(v_deck, 1) as i
      where v_deck[i] <> all(v_active) and v_deck[i] <> 'Werewolf' limit 1;
    exit when v_idx is null;
    select a.x into v_candidate from unnest(v_active) as a(x) where a.x <> all(v_deck) limit 1;
    exit when v_candidate is null;
    v_deck[v_idx] := v_candidate;
  end loop;

  if not ('Werewolf' = any(v_deck)) then
    select i into v_idx from generate_subscripts(v_deck, 1) as i where v_deck[i] <> all(v_active) limit 1;
    if v_idx is not null then v_deck[v_idx] := 'Werewolf'; end if;
  end if;

  delete from public.player_roles where room_id = v_room.id;

  for v_player in select user_id, seat from public.room_players where room_id = v_room.id order by seat loop
    v_i := v_i + 1;
    insert into public.player_roles (room_id, user_id, role, revealed, orphan_father)
    values (v_room.id, v_player.user_id, v_deck[v_i], false, null);
    update public.room_players
      set alive = true, hp = case when v_deck[v_i] = 'Strong Villager' then 2 else 1 end,
          transformed_from = null
      where room_id = v_room.id and seat = v_player.seat;
  end loop;

  select ('Doctor' = any(v_deck)) into v_has_doc;

  delete from public.events where room_id = v_room.id;
  insert into public.game_state (room_id, round, phase, stage, doctor_charges, night_order, night_index)
  values (v_room.id, 0, 'night', 'call', case when v_has_doc then 1 else 0 end, '{}', 0)
  on conflict (room_id) do update
    set round = 0, phase = 'night', stage = 'call',
        doctor_charges = case when v_has_doc then 1 else 0 end,
        night_order = '{}', night_index = 0, night_acted = '{}', wolf_target = null, guard_target = null,
        last_guard_target = null, guardian_self_used = false, seer_target = null,
        wolf_poisoned = false, wolf_skip = false, pending_hunter = null, day_victim = null,
        king_tied = null, night_start_alive = null, day_report = null, day_ready = null,
        winner = null, deadline = null, resume_stage = null, updated_at = now();

  update public.rooms set status = 'playing', phase = 'night', stage = 'call', round = 1, winner = null, updated_at = now()
    where id = v_room.id;

  perform public._event(v_room.id, 'start', 'Permainan dimulai! Semua menerima perannya.');
  perform public._begin_night(v_room.id);
end;
$$;

-- Main lagi: kembalikan room yang sudah selesai ke lobby (bersihkan state game).
create or replace function public.play_again()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid  uuid := auth.uid();
  v_room public.rooms;
begin
  select * into v_room from public.rooms
    where host_id = v_uid and status = 'finished' for update;
  if not found then raise exception 'Kamu bukan host room yang sudah selesai.'; end if;

  delete from public.votes          where room_id = v_room.id;
  delete from public.player_results where room_id = v_room.id;
  delete from public.events         where room_id = v_room.id;
  delete from public.game_state     where room_id = v_room.id;
  delete from public.player_roles   where room_id = v_room.id;

  update public.room_players
    set alive = true, hp = 1, transformed_from = null,
        is_ready = case when is_host then true else false end
    where room_id = v_room.id;

  update public.rooms
    set status = 'lobby', phase = 'lobby', stage = null, round = 0, winner = null, updated_at = now()
    where id = v_room.id;
end;
$$;

create or replace function public.game_tick()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_seat uuid := auth.uid();
  v_room public.rooms;
  v_gs   public.game_state;
  v_alive int;
  v_voted int;
  v_round int;
begin
  select * into v_room
    from public.rooms r
    join public.room_players rp on rp.room_id = r.id
    where rp.user_id = v_seat and r.status = 'playing'
    limit 1;
  if not found then raise exception 'Kamu tidak sedang dalam permainan.'; end if;

  select * into v_gs from public.game_state where room_id = v_room.id for update;
  if v_gs.phase = 'finished' then return; end if;

  if v_gs.stage = 'call' and v_gs.deadline is not null and now() > v_gs.deadline then
    perform public._resolve_dawn(v_room.id);

  elsif v_gs.stage = 'hunter' and now() > v_gs.deadline then
    update public.game_state set pending_hunter = null,
      stage = case when resume_stage = 'dawn' then 'dawn' else 'result' end,
      deadline = now() + interval '8 seconds'
      where room_id = v_room.id;
    perform public._event(v_room.id, 'hunter', 'Hunter tidak sempat menembak.');
    perform public._check_winner(v_room.id);

  elsif v_gs.phase = 'night' and v_gs.stage = 'dawn' and now() > v_gs.deadline then
    perform public._begin_day(v_room.id);

  elsif v_gs.stage = 'discussion' and now() > v_gs.deadline then
    perform public._begin_vote(v_room.id);

  elsif v_gs.stage = 'vote' then
    select round into v_round from public.game_state where room_id = v_room.id;
    select count(*) into v_alive from public.room_players where room_id = v_room.id and alive;
    select count(*) into v_voted from public.votes v
      join public.room_players rp on rp.room_id = v.room_id and rp.user_id = v.voter_id
      where v.room_id = v_room.id and v.round = v_round and rp.alive;

    if v_voted >= v_alive or now() > v_gs.deadline then
      perform public._tally(v_room.id);
    end if;

  elsif v_gs.stage = 'king' and now() > v_gs.deadline then
    update public.game_state set stage = 'result', day_victim = null, deadline = now() + interval '8 seconds'
      where room_id = v_room.id;
    perform public._event(v_room.id, 'vote', 'Raja tidak menentukan - tidak ada yang dieliminasi.');
    perform public._check_winner(v_room.id);

  elsif v_gs.stage = 'result' and now() > v_gs.deadline then
    perform public._begin_night(v_room.id);
  end if;
end;
$$;

create or replace function public.submit_night_action(p_target_seat int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid    uuid := auth.uid();
  v_room   uuid;
  v_gs     public.game_state;
  v_seat   int;
  v_myrole text;
  v_actrole text;
  v_cand   int[];
  v_acted  text[];
begin
  select r.id into v_room from public.rooms r
    join public.room_players rp on rp.room_id = r.id
    where rp.user_id = v_uid and r.status = 'playing' limit 1;
  if v_room is null then raise exception 'Kamu tidak sedang dalam permainan.'; end if;

  select * into v_gs from public.game_state where room_id = v_room for update;
  if v_gs.phase <> 'night' or v_gs.stage <> 'call' then raise exception 'Bukan waktunya aksi malam.'; end if;

  v_seat := public._seat_of_user(v_room, v_uid);
  if v_seat is null or not (select alive from public.room_players where room_id = v_room and seat = v_seat) then
    raise exception 'Kamu sudah tidak hidup.';
  end if;
  v_myrole := public._role_of_seat(v_room, v_seat);
  if v_myrole is null then raise exception 'Peranmu belum dibagikan.'; end if;

  -- Tim werewolf beraksi sebagai role 'Werewolf'.
  v_actrole := case when public._team_of_role(v_myrole) = 'werewolf' then 'Werewolf' else v_myrole end;

  if not (v_actrole = any(coalesce(v_gs.night_order, '{}'))) then
    raise exception 'Kamu tidak punya aksi malam ini.';
  end if;
  if v_actrole = any(coalesce(v_gs.night_acted, '{}')) then
    raise exception 'Aksimu malam ini sudah tercatat.';
  end if;

  if p_target_seat is not null then
    v_cand := public._candidates(v_room, v_actrole);
    if not (p_target_seat = any(v_cand)) then raise exception 'Target tidak valid.'; end if;

    if v_actrole = 'Werewolf' then
      update public.game_state set wolf_target = p_target_seat where room_id = v_room;
    elsif v_actrole = 'Guardian' then
      update public.game_state
        set guard_target = p_target_seat,
            last_guard_target = p_target_seat,
            guardian_self_used = guardian_self_used or (p_target_seat = v_seat)
        where room_id = v_room;
    elsif v_actrole = 'Seer' then
      update public.game_state set seer_target = p_target_seat where room_id = v_room;
      insert into public.player_results (room_id, user_id, round, kind, target_seat, is_threat)
      values (v_room, v_uid, v_gs.round, 'seer', p_target_seat,
        (public._team_of_role(public._role_of_seat(v_room, p_target_seat)) = 'werewolf'
         or public._role_of_seat(v_room, p_target_seat) = 'Lycan'))
      on conflict (room_id, user_id, round, kind) do update
        set target_seat = excluded.target_seat, is_threat = excluded.is_threat;
    elsif v_actrole = 'Doctor' then
      update public.room_players
        set alive = true, hp = case when public._role_of_seat(v_room, p_target_seat) = 'Strong Villager' then 2 else 1 end
        where room_id = v_room and seat = p_target_seat;
      update public.game_state set doctor_charges = doctor_charges - 1 where room_id = v_room;
      perform public._event(v_room, 'doctor',
        format('%s dihidupkan kembali oleh Dokter!',
          (select display_name from public.room_players where room_id = v_room and seat = p_target_seat)));
    elsif v_actrole = 'Orphan' then
      update public.player_roles set orphan_father = p_target_seat where room_id = v_room and user_id = v_uid;
    elsif v_actrole = 'Doppelganger' then
      update public.player_roles
        set role = public._role_of_seat(v_room, p_target_seat), transformed_from = 'Doppelganger'
        where room_id = v_room and user_id = v_uid;
      update public.room_players
        set hp = case when public._role_of_seat(v_room, p_target_seat) = 'Strong Villager' then 2 else 1 end
        where room_id = v_room and user_id = v_uid;
    end if;
  end if;

  v_acted := coalesce(v_gs.night_acted, '{}') || v_actrole;
  update public.game_state set night_acted = v_acted, updated_at = now() where room_id = v_room;

  -- Semua role sudah beraksi? Langsung selesaikan malam, tanpa menunggu timer.
  if not exists (
    select 1 from unnest(coalesce(v_gs.night_order, '{}')) as r(role)
    where r.role <> all(v_acted)
  ) then
    perform public._resolve_dawn(v_room);
  end if;
end;
$$;

create or replace function public.submit_vote(p_target_seat int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid  uuid := auth.uid();
  v_room uuid;
  v_gs   public.game_state;
  v_seat int;
begin
  select r.id into v_room from public.rooms r
    join public.room_players rp on rp.room_id = r.id
    where rp.user_id = v_uid and r.status = 'playing' limit 1;
  if v_room is null then raise exception 'Kamu tidak sedang dalam permainan.'; end if;

  select * into v_gs from public.game_state where room_id = v_room for update;
  if v_gs.stage <> 'vote' then raise exception 'Bukan waktunya voting.'; end if;

  v_seat := public._seat_of_user(v_room, v_uid);
  if v_seat is null or not (select alive from public.room_players where room_id = v_room and seat = v_seat) then
    raise exception 'Hanya pemain hidup yang boleh memilih.';
  end if;
  if p_target_seat is not null and not (p_target_seat = any(public._alive_seats(v_room))) then
    raise exception 'Target tidak valid.';
  end if;

  insert into public.votes (room_id, round, voter_id, target_seat)
  values (v_room, v_gs.round, v_uid, p_target_seat)
  on conflict (room_id, round, voter_id) do update set target_seat = excluded.target_seat;
end;
$$;

-- Setiap pemain hidup menandai "siap melewati siang". Bila SEMUA pemain hidup
-- sepakat, siang langsung berakhir dan malam berikutnya dimulai tanpa eliminasi
-- - berguna di hari pertama yang belum ada informasi apa pun.
create or replace function public.submit_day_ready()
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid   uuid := auth.uid();
  v_room  uuid;
  v_gs    public.game_state;
  v_seat  int;
  v_alive int;
  v_ready int;
begin
  select r.id into v_room from public.rooms r
    join public.room_players rp on rp.room_id = r.id
    where rp.user_id = v_uid and r.status = 'playing' limit 1;
  if v_room is null then raise exception 'Kamu tidak sedang dalam permainan.'; end if;

  select * into v_gs from public.game_state where room_id = v_room for update;
  if v_gs.phase <> 'day' or v_gs.stage not in ('discussion', 'vote') then
    raise exception 'Belum waktunya melewati siang.';
  end if;
  -- Hanya siang hari pertama (ronde 1) yang boleh dilewati.
  if v_gs.round <> 1 then
    raise exception 'Lewati siang hanya tersedia di hari pertama.';
  end if;

  v_seat := public._seat_of_user(v_room, v_uid);
  if v_seat is null or not (select alive from public.room_players where room_id = v_room and seat = v_seat) then
    raise exception 'Hanya pemain hidup yang boleh melewati siang.';
  end if;

  update public.game_state
    set day_ready = (select coalesce(array_agg(distinct s order by s), '{}')
                     from unnest(coalesce(v_gs.day_ready, '{}') || v_seat) s)
    where room_id = v_room;

  select count(*) into v_alive from public.room_players where room_id = v_room and alive;
  select count(*) into v_ready from public.room_players
    where room_id = v_room and alive
      and seat = any(coalesce((select day_ready from public.game_state where room_id = v_room), '{}'));

  if v_alive > 0 and v_ready >= v_alive then
    perform public._event(v_room, 'day', 'Semua pemain sepakat melewati siang.');
    perform public._check_winner(v_room);
    if (select phase from public.game_state where room_id = v_room) <> 'finished' then
      perform public._begin_night(v_room);
    end if;
  end if;
end;
$$;

create or replace function public.submit_king_vote(p_target_seat int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid  uuid := auth.uid();
  v_room uuid;
  v_gs   public.game_state;
  v_seat int;
begin
  select r.id into v_room from public.rooms r
    join public.room_players rp on rp.room_id = r.id
    where rp.user_id = v_uid and r.status = 'playing' limit 1;
  if v_room is null then raise exception 'Kamu tidak sedang dalam permainan.'; end if;

  select * into v_gs from public.game_state where room_id = v_room for update;
  if v_gs.stage <> 'king' then raise exception 'Bukan giliran Raja.'; end if;

  v_seat := public._seat_of_user(v_room, v_uid);
  if v_seat is null or v_seat <> public._king_seat(v_room) then raise exception 'Bukan giliranmu.'; end if;
  if p_target_seat is null or not (p_target_seat = any(coalesce(v_gs.king_tied, '{}'))) then
    raise exception 'Target tidak valid.';
  end if;

  update public.game_state set day_victim = p_target_seat where room_id = v_room;
  perform public._apply_death(v_room, p_target_seat, 'vote');
  perform public._event(v_room, 'vote',
    format('Raja mengeksekusi %s.',
      (select display_name from public.room_players where room_id = v_room and seat = p_target_seat)));

  if (select pending_hunter from public.game_state where room_id = v_room) is not null then
    update public.game_state set stage = 'hunter', resume_stage = 'result', deadline = now() + interval '30 seconds'
      where room_id = v_room;
    return;
  end if;

  update public.game_state set stage = 'result', deadline = now() + interval '8 seconds' where room_id = v_room;
  perform public._check_winner(v_room);
end;
$$;

create or replace function public.submit_hunter_shot(p_target_seat int)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid  uuid := auth.uid();
  v_room uuid;
  v_gs   public.game_state;
  v_seat int;
begin
  select r.id into v_room from public.rooms r
    join public.room_players rp on rp.room_id = r.id
    where rp.user_id = v_uid and r.status = 'playing' limit 1;
  if v_room is null then raise exception 'Kamu tidak sedang dalam permainan.'; end if;

  select * into v_gs from public.game_state where room_id = v_room for update;
  if v_gs.stage <> 'hunter' or v_gs.pending_hunter is null then raise exception 'Tidak ada tembakan tertunda.'; end if;

  v_seat := public._seat_of_user(v_room, v_uid);
  if v_seat <> v_gs.pending_hunter then raise exception 'Bukan giliranmu menembak.'; end if;
  if p_target_seat is null or not (p_target_seat = any(public._alive_seats(v_room)))
     or p_target_seat = v_gs.pending_hunter then
    raise exception 'Target tidak valid.';
  end if;

  perform public._apply_death(v_room, p_target_seat, 'vote');
  update public.game_state
    set pending_hunter = null,
        stage = case when resume_stage = 'dawn' then 'dawn' else 'result' end,
        deadline = now() + interval '8 seconds'
    where room_id = v_room;
  perform public._check_winner(v_room);
end;
$$;

create or replace function public.game_view()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms;
  v_gs public.game_state;
  v_seat int;
  v_myrole text;
  v_actrole text;
  v_call text;
  v_cand int[];
  v_result jsonb;
  v_players jsonb;
  v_events jsonb;
begin
  select r.* into v_room from public.rooms r
    join public.room_players rp on rp.room_id = r.id
    where rp.user_id = v_uid and r.status in ('playing', 'finished') limit 1;
  if not found then return null; end if;

  select * into v_gs from public.game_state where room_id = v_room.id;
  v_seat := public._seat_of_user(v_room.id, v_uid);
  v_myrole := public._role_of_seat(v_room.id, v_seat);
  -- Aksi malam paralel: setiap pemain melihat aksinya sendiri (bila belum beraksi).
  v_actrole := case when public._team_of_role(v_myrole) = 'werewolf' then 'Werewolf' else v_myrole end;
  v_call := case
    when v_gs.phase = 'night' and v_gs.stage = 'call'
         and v_seat is not null
         and (select alive from public.room_players where room_id = v_room.id and seat = v_seat)
         and v_actrole = any(coalesce(v_gs.night_order, '{}'))
         and not (v_actrole = any(coalesce(v_gs.night_acted, '{}')))
    then v_actrole else null end;
  v_cand := case when v_call is not null then public._candidates(v_room.id, v_call) else '{}'::int[] end;

  select coalesce(jsonb_agg(jsonb_build_object(
      'seat', rp.seat,
      'name', rp.display_name,
      'alive', rp.alive,
      'hp', rp.hp,
      'transformedFrom', case when pr.revealed then rp.transformed_from else null end,
      'role', case when pr.revealed then pr.role else null end
    ) order by rp.seat), '[]'::jsonb) into v_players
  from public.room_players rp
  left join public.player_roles pr on pr.room_id = rp.room_id and pr.user_id = rp.user_id
  where rp.room_id = v_room.id;

  select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'message', message)
    order by id), '[]'::jsonb) into v_events
  from (select id, kind, message from public.events where room_id = v_room.id order by id desc limit 15) e;

  select to_jsonb(r) into v_result from public.player_results r
    where r.room_id = v_room.id and r.user_id = v_uid and r.round = v_gs.round
    order by r.kind limit 1;

  return jsonb_build_object(
    'room', jsonb_build_object(
      'code', v_room.code, 'status', v_room.status, 'phase', v_gs.phase, 'stage', v_gs.stage,
      'round', v_gs.round, 'deadline', v_gs.deadline, 'winner', v_gs.winner),
    'call', v_call,
    'candidates', to_jsonb(v_cand),
    'kingCandidates', case when v_gs.stage = 'king' then to_jsonb(coalesce(v_gs.king_tied, '{}'))
                           else '[]'::jsonb end,
    'dayReport', case when v_gs.phase = 'day' then to_jsonb(coalesce(v_gs.day_report, '{}'))
                      else '[]'::jsonb end,
    'dayReady', coalesce(cardinality(v_gs.day_ready), 0),
    'dayAlive', (select count(*) from public.room_players where room_id = v_room.id and alive),
    'players', v_players,
    'events', v_events,
    'you', jsonb_build_object(
      'seat', v_seat,
      'role', v_myrole,
      'alive', (select alive from public.room_players where room_id = v_room.id and seat = v_seat),
      'isYourTurn', (v_call is not null),
      'canVote', (v_gs.stage = 'vote'
                  and (select alive from public.room_players where room_id = v_room.id and seat = v_seat)),
      'awaitingHunter', (v_gs.stage = 'hunter' and v_gs.pending_hunter = v_seat),
      'isKing', (v_gs.stage = 'king' and v_seat is not null and v_seat = public._king_seat(v_room.id)),
      'skipReady', (v_seat is not null and v_seat = any(coalesce(v_gs.day_ready, '{}'))),
      'allies', case when public._team_of_role(v_myrole) = 'werewolf' then (
        select coalesce(jsonb_agg(rp.seat order by rp.seat), '[]'::jsonb)
        from public.room_players rp
        join public.player_roles pr on pr.room_id = rp.room_id and pr.user_id = rp.user_id
        join public.roles r on r.name = pr.role
        where rp.room_id = v_room.id and rp.alive and r.team = 'werewolf' and rp.seat <> v_seat
      ) else '[]'::jsonb end,
      'seer', v_result),
    'winner', v_gs.winner
  );
end;
$$;

grant execute on function public.start_online_game()            to anon, authenticated;
grant execute on function public.play_again()                   to anon, authenticated;
grant execute on function public.game_tick()                    to anon, authenticated;
grant execute on function public.submit_night_action(int)       to anon, authenticated;
grant execute on function public.submit_vote(int)               to anon, authenticated;
grant execute on function public.submit_day_ready()             to anon, authenticated;
grant execute on function public.submit_king_vote(int)          to anon, authenticated;
grant execute on function public.submit_hunter_shot(int)        to anon, authenticated;
grant execute on function public.game_view()                    to anon, authenticated;

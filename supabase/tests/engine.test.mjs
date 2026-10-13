// Uji SQL engine (supabase/engine.sql) memakai PGlite (Postgres WASM).
// Jalankan: node supabase/tests/engine.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const here = dirname(fileURLToPath(import.meta.url));
const sql = (name) => readFileSync(join(here, '..', name), 'utf8');

let passed = 0;
let failed = 0;
function assert(cond, label) {
  if (cond) {
    passed += 1;
    console.log(`  ok  ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${label}`);
  }
}

const db = await PGlite.create();

// --- Bootstrap: tiru objek Supabase yang dipakai SQL kita ------------------
await db.exec(`
  create schema if not exists auth;
  create table auth.users (id uuid primary key);
  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('test.uid', true), '')::uuid;
  $$;
  create role anon;
  create role authenticated;
  create publication supabase_realtime;
`);

await db.exec(sql('schema.sql'));
await db.exec(sql('online.sql'));
await db.exec(sql('engine.sql'));

const U = (n) => `00000000-0000-0000-0000-00000000000${n}`;
const asUser = (uid) => db.query("select set_config('test.uid', $1, false)", [uid]);
const q = async (text, params) => (await db.query(text, params)).rows;
const one = async (text, params) => (await q(text, params))[0];

// Bersihkan data antar skenario (katalog `roles` tetap).
async function reset() {
  await db.exec(`truncate public.votes, public.player_results, public.events,
    public.game_state, public.player_roles, public.room_players, public.rooms,
    public.profiles, auth.users cascade;`);
}

// Siapkan game deterministik: rolesByUser = { userId: roleName }, kursi = urutan kunci.
async function setupGame(room, rolesByUser, startRound) {
  await reset();
  const ids = Object.keys(rolesByUser);
  for (const id of ids) {
    await db.query('insert into auth.users (id) values ($1) on conflict do nothing', [id]);
    await db.query('insert into profiles (id, display_name) values ($1, $2)', [id, `P${ids.indexOf(id)}`]);
  }
  await db.query(
    'insert into rooms (id, code, host_id, status, phase) values ($1, $2, $3, $4, $5)',
    [room, `T${room.slice(-4)}`, ids[0], 'playing', 'night'],
  );
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const role = rolesByUser[id];
    await db.query(
      `insert into room_players (room_id, user_id, seat, display_name, is_host, is_ready, alive, hp)
       values ($1, $2, $3, $4, $5, true, true, $6)`,
      [room, id, i, `P${i}`, i === 0, role === 'Strong Villager' ? 2 : 1],
    );
    await db.query('insert into player_roles (room_id, user_id, role) values ($1, $2, $3)', [room, id, role]);
  }
  await db.query(
    `insert into game_state (room_id, round, phase, stage, doctor_charges, night_order, night_index)
     values ($1, $2, 'night', 'call', 0, '{}', 0)`,
    [room, startRound],
  );
  await db.query('select _begin_night($1)', [room]);
}

const gs = (room) => one('select * from game_state where room_id = $1', [room]);
const rol = async (room, seat) =>
  (await one(`select pr.role from player_roles pr
       join room_players rp on pr.room_id=rp.room_id and pr.user_id=rp.user_id
       where rp.room_id=$1 and rp.seat=$2`, [room, seat]))?.role;
const ply = (room, seat) => one('select * from room_players where room_id=$1 and seat=$2', [room, seat]);
const uidByRole = async (room, role) =>
  (await one(`select rp.user_id from room_players rp
              join player_roles pr on pr.room_id=rp.room_id and pr.user_id=rp.user_id
              where rp.room_id=$1 and pr.role=$2 and rp.alive limit 1`, [room, role]))?.user_id;
const uidOfWolf = async (room) =>
  (await one(`select rp.user_id from room_players rp
              join player_roles pr on pr.room_id=rp.room_id and pr.user_id=rp.user_id
              join roles r on r.name=pr.role
              where rp.room_id=$1 and rp.alive and r.team='werewolf' limit 1`, [room]))?.user_id;

const expire = (room) =>
  db.query("update game_state set deadline = now() - interval '1 second' where room_id = $1", [room]);

// Jalankan seluruh call malam secara generik mengikuti urutan yang diacak.
async function playNight(room, targetsByRole) {
  for (let guard = 0; guard < 20; guard += 1) {
    const g = await gs(room);
    if (!(g.phase === 'night' && g.stage === 'call')) return;
    const role = g.night_order[g.night_index];
    const uid = role === 'Werewolf' ? await uidOfWolf(room) : await uidByRole(room, role);
    const target = targetsByRole[role] ?? null;
    await asUser(uid);
    await db.query('select submit_night_action($1)', [target]);
  }
  throw new Error('playNight tidak selesai');
}

// Majukan paksa satu tahap (dengan mengosongkan deadline).
async function tick(room, asUid) {
  await asUser(asUid);
  await expire(room);
  await db.query('select game_tick()');
}

// --------------------------------------------------------------------------
// Skenario 1: malam pertama hanya Seer; cek terawang; warga menang.
// --------------------------------------------------------------------------
console.log('\nSkenario 1: Seer malam pertama + warga menang');
{
  const room = '00000000-0000-0000-0000-0000000000a1';
  const a = U(1), b = U(2), c = U(3), d = U(4), e = U(5);
  await setupGame(room, { [a]: 'Werewolf', [b]: 'Seer', [c]: 'Guardian', [d]: 'Hunter', [e]: 'Disease' }, 0);

  let g = await gs(room);
  assert(g.round === 1, 'ronde pertama = 1');
  assert(JSON.stringify(g.night_order) === JSON.stringify(['Seer']), 'malam pertama hanya memanggil Seer');

  await asUser(b);
  await db.query('select submit_night_action($1)', [0]);
  g = await gs(room);
  assert(g.stage === 'dawn', 'setelah Seer aksi → fajar');
  assert((await one('select * from player_results where room_id=$1', [room])).is_threat === true,
    'Seer melihat Werewolf sebagai ancaman');

  await tick(room, a);
  assert((await gs(room)).stage === 'discussion', 'tick fajar → siang diskusi');
  await tick(room, a);
  assert((await gs(room)).stage === 'vote', 'tick diskusi → voting');

  for (const uid of [a, b, c, d, e]) {
    await asUser(uid);
    await db.query('select submit_vote($1)', [0]);
  }
  // Semua sudah memilih: tally tanpa menunggu deadline.
  await asUser(a);
  await db.query('select game_tick()');
  assert((await one('select winner from rooms where id=$1', [room])).winner === 'village',
    'semua vote Werewolf → warga menang');
}

// --------------------------------------------------------------------------
// Skenario 2: Cursed digigit → jadi Werewolf, wolf lama mati.
// --------------------------------------------------------------------------
console.log('\nSkenario 2: transformasi Cursed');
{
  const room = '00000000-0000-0000-0000-0000000000a2';
  const a = U(1), b = U(2), c = U(3), d = U(4), e = U(5);
  await setupGame(room, { [a]: 'Werewolf', [b]: 'Cursed', [c]: 'Seer', [d]: 'Guardian', [e]: 'Disease' }, 1);

  await playNight(room, { Werewolf: 1, Guardian: 2, Seer: 0 });
  assert((await rol(room, 1)) === 'Werewolf', 'Cursed kini berperan Werewolf');
  assert((await ply(room, 0)).alive === false, 'Werewolf lama tewas');
  assert((await ply(room, 1)).transformed_from === 'Cursed', 'transformed_from = Cursed');
}

// --------------------------------------------------------------------------
// Skenario 3: Strong Villager selamat sekali; Disease meracuni wolf.
// --------------------------------------------------------------------------
console.log('\nSkenario 3: Strong Villager & Disease');
{
  const room = '00000000-0000-0000-0000-0000000000a3';
  const a = U(1), b = U(2), c = U(3), d = U(4), e = U(5);
  await setupGame(room, { [a]: 'Werewolf', [b]: 'Strong Villager', [c]: 'Seer', [d]: 'Guardian', [e]: 'Disease' }, 1);
  await playNight(room, { Werewolf: 1, Guardian: 4, Seer: 0 });
  assert((await ply(room, 1)).alive === true && (await ply(room, 1)).hp === 1,
    'Strong Villager selamat dengan 1 nyawa');

  // Fajar → diskusi → vote (tanpa suara) → malam berikutnya.
  await tick(room, a);
  await tick(room, a);
  for (const uid of [a, b, c, d, e]) { await asUser(uid); await db.query('select submit_vote($1)', [null]); }
  await tick(room, a);
  await tick(room, a);

  await playNight(room, { Werewolf: 4, Guardian: 0, Seer: 0 });
  assert((await ply(room, 4)).alive === false, 'Disease tewas dimangsa');

  // Maju ke malam 3: wolf harus absen karena keracunan.
  await tick(room, a);
  await tick(room, a);
  for (const uid of [a, b, c, d]) { await asUser(uid); await db.query('select submit_vote($1)', [null]); }
  await tick(room, a);
  await tick(room, a);
  assert((await gs(room)).wolf_skip === true, 'Werewolf keracunan → absen malam berikutnya');
}

// --------------------------------------------------------------------------
// Skenario 4: Hunter menembak saat mati.
// --------------------------------------------------------------------------
console.log('\nSkenario 4: tembakan Hunter');
{
  const room = '00000000-0000-0000-0000-0000000000a4';
  const a = U(1), b = U(2), c = U(3), d = U(4), e = U(5);
  await setupGame(room, { [a]: 'Werewolf', [b]: 'Hunter', [c]: 'Seer', [d]: 'Guardian', [e]: 'Disease' }, 1);
  await playNight(room, { Werewolf: 1, Guardian: 4, Seer: 0 });
  let g = await gs(room);
  assert(g.stage === 'hunter', 'Hunter mati → menunggu tembakan');
  assert((await ply(room, 1)).alive === false, 'Hunter tewas');

  await asUser(b);
  await db.query('select submit_hunter_shot($1)', [2]);
  assert((await ply(room, 2)).alive === false, 'target tembakan tewas');
  assert((await gs(room)).stage === 'dawn', 'kembali ke fajar setelah tembakan');
}

console.log('\nSkenario 5: lobby → start_online_game');
{
  await reset();
  const a = U(1), b = U(2), c = U(3), d = U(4);
  for (const id of [a, b, c, d]) {
    await db.query('insert into auth.users (id) values ($1) on conflict do nothing', [id]);
  }
  await asUser(a);
  const room = (await q('select * from create_room($1)', ['Host']))[0];
  for (const [id, name] of [[b, 'B'], [c, 'C'], [d, 'D']]) {
    await asUser(id);
    await q('select join_room($1, $2)', [room.code, name]);
  }
  for (const id of [b, c, d]) { await asUser(id); await db.query('select set_ready(true)'); }

  await asUser(a);
  await db.query('select start_online_game()');

  const r = await one('select * from rooms where id=$1', [room.id]);
  assert(r.status === 'playing', 'room berstatus playing setelah start');
  const roles = await q('select user_id, role from player_roles where room_id=$1', [room.id]);
  assert(roles.length === 4, '4 role dibagikan ke 4 pemain');
  assert(roles.filter((x) => x.role === 'Werewolf').length === 1, 'tepat satu Werewolf');
  const g = await one('select * from game_state where room_id=$1', [room.id]);
  assert(g.round === 1 && g.phase === 'night', 'game_state mulai di malam ronde 1');

  await asUser(a);
  const view = (await q('select game_view() as v'))[0].v;
  assert(view.room.round === 1 && view.you && view.players.length === 4, 'game_view mengembalikan state lengkap');

  // Host keluar → room terhapus.
  await asUser(a);
  await db.query('select leave_room()');
  assert((await q('select 1 from rooms where id=$1', [room.id])).length === 0, 'host keluar → room terhapus');
}

// --------------------------------------------------------------------------
// Skenario 6: Werewolf melihat rekan + play_again mengosongkan room.
// --------------------------------------------------------------------------
console.log('\nSkenario 6: allies + play_again');
{
  const room = '00000000-0000-0000-0000-0000000000a6';
  const a = U(1), b = U(2), c = U(3), d = U(4), e = U(5);
  await setupGame(room, { [a]: 'Werewolf', [b]: 'Seer', [c]: 'Guardian', [d]: 'Hunter', [e]: 'Werewolf' }, 1);

  await asUser(a);
  const view = (await q('select game_view() as v'))[0].v;
  assert(JSON.stringify(view.you.allies) === JSON.stringify([4]), 'Werewolf melihat rekan sesama serigala');

  await db.query("update rooms set status='finished', winner='village' where id=$1", [room]);
  await asUser(a);
  await db.query('select play_again()');

  const r = await one('select * from rooms where id=$1', [room]);
  assert(r.status === 'lobby' && r.round === 0 && r.winner === null, 'play_again mengembalikan room ke lobby');
  assert((await q('select 1 from game_state where room_id=$1', [room])).length === 0, 'game_state dibersihkan');
  assert((await q('select 1 from player_roles where room_id=$1', [room])).length === 0, 'player_roles dibersihkan');
  assert((await ply(room, 1)).alive === true && (await ply(room, 1)).is_ready === false,
    'status hidup & kesiapan guest di-reset');
}

// --------------------------------------------------------------------------
// Skenario 7: vote seri ditentukan Raja + terawang V/W (is_threat).
// --------------------------------------------------------------------------
console.log('\nSkenario 7: keputusan Raja saat vote seri');
{
  const room = '00000000-0000-0000-0000-0000000000a7';
  const a = U(1), b = U(2), c = U(3), d = U(4), e = U(5);
  await setupGame(room, { [a]: 'Werewolf', [b]: 'King', [c]: 'Seer', [d]: 'Guardian', [e]: 'Lycan' }, 1);

  // Paksa masuk tahap voting siang, lalu buat suara seri 2-2.
  await db.query("update game_state set phase='day', stage='vote', round=1 where room_id=$1", [room]);
  const cast = async (voter, target) => {
    await db.query('insert into votes (room_id, round, voter_id, target_seat) values ($1,1,$2,$3)', [room, voter, target]);
  };
  await cast(a, 1); // Werewolf vote kursi 1
  await cast(b, 1); // King vote kursi 1
  await cast(c, 2); // Seer vote kursi 2
  await cast(d, 2); // Guardian vote kursi 2

  await db.query('select _tally($1)', [room]);
  let g = await gs(room);
  assert(g.stage === 'king', 'vote seri dengan Raja hidup → tahap keputusan Raja');
  assert(JSON.stringify(g.king_tied) === JSON.stringify([1, 2]), 'kandidat seri tercatat [1,2]');

  await asUser(b);
  const view = (await q('select game_view() as v'))[0].v;
  assert(view.you.isKing === true, 'game_view menandai Raja sebagai pemegang keputusan');
  assert(JSON.stringify(view.kingCandidates) === JSON.stringify([1, 2]), 'game_view membuka kandidat seri');

  await asUser(b);
  await db.query('select submit_king_vote($1)', [2]);
  assert((await ply(room, 2)).alive === false, 'Raja mengeksekusi kandidat pilihannya');
  assert((await gs(room)).stage === 'result', 'kembali ke tahap hasil setelah keputusan Raja');
}

console.log(`\n${passed} lulus, ${failed} gagal`);
await db.close();
if (failed > 0) process.exit(1);

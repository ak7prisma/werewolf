import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { GameView, Room, RoomPlayer } from './onlineTypes';

function client() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  return supabase;
}

/** Ambil sesi yang ada, atau buat sesi anonim baru. */
export async function ensureSession(): Promise<User> {
  const db = client();

  const { data } = await db.auth.getSession();
  if (data.session?.user) return data.session.user;

  const { data: signedIn, error } = await db.auth.signInAnonymously();
  if (error) throw error;
  if (!signedIn.user) throw new Error('Gagal membuat sesi anonim.');
  return signedIn.user;
}

export async function createRoom(displayName: string): Promise<Room> {
  const { data, error } = await client().rpc('create_room', { p_display_name: displayName });
  if (error) throw error;
  return data as Room;
}

export async function joinRoom(code: string, displayName: string): Promise<Room> {
  const { data, error } = await client().rpc('join_room', {
    p_code: code,
    p_display_name: displayName,
  });
  if (error) throw error;
  return data as Room;
}

export async function setReady(ready: boolean): Promise<void> {
  const { error } = await client().rpc('set_ready', { p_ready: ready });
  if (error) throw error;
}

export async function leaveRoom(): Promise<void> {
  const { error } = await client().rpc('leave_room');
  if (error) throw error;
}

export async function deleteRoom(): Promise<void> {
  const { error } = await client().rpc('delete_room');
  if (error) throw error;
}

/** Tandai room masih aktif (heartbeat kehadiran). */
export async function touchRoom(): Promise<void> {
  const { error } = await client().rpc('touch_room');
  if (error) throw error;
}

/** Bubarkan room basi (tanpa aktivitas >= 30 menit). */
export async function cleanupStaleRooms(): Promise<void> {
  const { error } = await client().rpc('cleanup_stale_rooms');
  if (error) throw error;
}

export async function beginGame(): Promise<void> {
  const { error } = await client().rpc('start_online_game');
  if (error) throw error;
}

export async function fetchGameView(): Promise<GameView | null> {
  const { data, error } = await client().rpc('game_view');
  if (error) throw error;
  return (data as GameView | null) ?? null;
}

export async function gameTick(): Promise<void> {
  const { error } = await client().rpc('game_tick');
  if (error) throw error;
}

export async function submitNightAction(targetSeat: number | null): Promise<void> {
  const { error } = await client().rpc('submit_night_action', { p_target_seat: targetSeat });
  if (error) throw error;
}

export async function submitVote(targetSeat: number | null): Promise<void> {
  const { error } = await client().rpc('submit_vote', { p_target_seat: targetSeat });
  if (error) throw error;
}

export async function submitDayReady(): Promise<void> {
  const { error } = await client().rpc('submit_day_ready');
  if (error) throw error;
}

export async function submitKingVote(targetSeat: number): Promise<void> {
  const { error } = await client().rpc('submit_king_vote', { p_target_seat: targetSeat });
  if (error) throw error;
}

export async function submitHunterShot(targetSeat: number): Promise<void> {
  const { error } = await client().rpc('submit_hunter_shot', { p_target_seat: targetSeat });
  if (error) throw error;
}

export async function playAgain(): Promise<void> {
  const { error } = await client().rpc('play_again');
  if (error) throw error;
}

export async function fetchRoomState(roomId: string): Promise<{
  room: Room;
  players: RoomPlayer[];
  myRole: string | null;
}> {
  const db = client();

  const { data: room, error: roomError } = await db
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  if (roomError) throw roomError;

  const { data: players, error: playersError } = await db
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('seat', { ascending: true });
  if (playersError) throw playersError;

  const { data: roleRow } = await db
    .from('player_roles')
    .select('role')
    .eq('room_id', roomId)
    .maybeSingle();

  return {
    room: room as Room,
    players: (players ?? []) as RoomPlayer[],
    myRole: roleRow?.role ?? null,
  };
}

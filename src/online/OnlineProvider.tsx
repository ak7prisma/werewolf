import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { OnlineContext } from './OnlineContext';
import type { OnlineStatus } from './OnlineContext';
import type { GameView, Room, RoomPlayer } from './onlineTypes';
import * as repo from './onlineRepository';

const STORAGE_KEY = 'wolf-night:room';

export function OnlineProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<OnlineStatus>(
    isSupabaseConfigured ? 'loading' : 'unconfigured',
  );
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const ticking = useRef(false);

  const refresh = useCallback(async (roomId: string) => {
    try {
      const state = await repo.fetchRoomState(roomId);
      setRoom(state.room);
      setPlayers(state.players);
      setMyRole(state.myRole);
      window.localStorage.setItem(STORAGE_KEY, roomId);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      setRoom(null);
      setPlayers([]);
      setMyRole(null);
      setGame(null);
    }
  }, []);

  const refreshGame = useCallback(async () => {
    try {
      setGame(await repo.fetchGameView());
    } catch {
      /* abaikan — heartbeat berikutnya akan mencoba lagi */
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    repo
      .ensureSession()
      .then((sessionUser) => {
        if (cancelled) return;
        setUser(sessionUser);
        setStatus('ready');
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) void refresh(saved);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const roomId = room?.id ?? null;
  const roomStatus = room?.status ?? null;

  // Realtime lobby: perubahan rooms & room_players.
  useEffect(() => {
    const db = supabase;
    if (!db || !roomId) return undefined;

    const channel = db
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => void refresh(roomId),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        () => void refresh(roomId),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'events', filter: `room_id=eq.${roomId}` },
        () => void refreshGame(),
      )
      .subscribe();

    return () => {
      void db.removeChannel(channel);
    };
  }, [roomId, refresh, refreshGame]);

  // Heartbeat permainan: segarkan state, dan majukan fase saat deadline lewat.
  useEffect(() => {
    if (!roomId || roomStatus === 'lobby') return undefined;
    let cancelled = false;

    const beat = async () => {
      if (ticking.current) return;
      ticking.current = true;
      try {
        const view = await repo.fetchGameView();
        if (cancelled) return;
        setGame(view);
        if (view && view.room.status !== 'finished') {
          const expired = Boolean(
            view.room.deadline && new Date(view.room.deadline).getTime() <= Date.now(),
          );
          // Vote juga dimajukan lebih awal begitu semua pemain hidup sudah memilih.
          if (expired || view.room.stage === 'vote') {
            await repo.gameTick();
            const next = await repo.fetchGameView();
            if (!cancelled) setGame(next);
          }
        }
      } catch {
        /* abaikan */
      } finally {
        ticking.current = false;
      }
    };

    void beat();
    const id = window.setInterval(beat, 1200);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [roomId, roomStatus]);

  const createRoom = useCallback(
    async (name: string) => {
      const created = await repo.createRoom(name);
      setDisplayName(name);
      await refresh(created.id);
    },
    [refresh],
  );

  const joinRoom = useCallback(
    async (code: string, name: string) => {
      const joined = await repo.joinRoom(code, name);
      setDisplayName(name);
      await refresh(joined.id);
    },
    [refresh],
  );

  const setReady = useCallback(
    async (ready: boolean) => {
      await repo.setReady(ready);
      if (roomId) await refresh(roomId);
    },
    [roomId, refresh],
  );

  const leaveRoom = useCallback(async () => {
    try {
      await repo.leaveRoom();
    } catch {
      /* keluar lokal tetap dilanjutkan */
    }
    window.localStorage.removeItem(STORAGE_KEY);
    setRoom(null);
    setPlayers([]);
    setMyRole(null);
    setGame(null);
  }, []);

  const deleteRoom = useCallback(async () => {
    await repo.deleteRoom();
    window.localStorage.removeItem(STORAGE_KEY);
    setRoom(null);
    setPlayers([]);
    setMyRole(null);
    setGame(null);
  }, []);

  const startGame = useCallback(async () => {
    await repo.beginGame();
    if (roomId) await refresh(roomId);
    await refreshGame();
  }, [roomId, refresh, refreshGame]);

  const reload = useCallback(async () => {
    if (roomId) await refresh(roomId);
    await refreshGame();
  }, [roomId, refresh, refreshGame]);

  const submitNightAction = useCallback(
    async (targetSeat: number | null) => {
      await repo.submitNightAction(targetSeat);
      await refreshGame();
    },
    [refreshGame],
  );

  const submitVote = useCallback(
    async (targetSeat: number | null) => {
      await repo.submitVote(targetSeat);
      await refreshGame();
    },
    [refreshGame],
  );

  const submitKingVote = useCallback(
    async (targetSeat: number) => {
      await repo.submitKingVote(targetSeat);
      await refreshGame();
    },
    [refreshGame],
  );

  const submitHunterShot = useCallback(
    async (targetSeat: number) => {
      await repo.submitHunterShot(targetSeat);
      await refreshGame();
    },
    [refreshGame],
  );

  const playAgain = useCallback(async () => {
    await repo.playAgain();
    if (roomId) await refresh(roomId);
    setGame(null);
  }, [roomId, refresh]);

  const value = useMemo(
    () => ({
      status,
      error,
      user,
      displayName,
      room,
      players,
      myRole,
      game,
      isHost: Boolean(user && room && room.host_id === user.id),
      createRoom,
      joinRoom,
      setReady,
      leaveRoom,
      deleteRoom,
      startGame,
      reload,
      submitNightAction,
      submitVote,
      submitKingVote,
      submitHunterShot,
      playAgain,
    }),
    [
      status,
      error,
      user,
      displayName,
      room,
      players,
      myRole,
      game,
      createRoom,
      joinRoom,
      setReady,
      leaveRoom,
      deleteRoom,
      startGame,
      reload,
      submitNightAction,
      submitVote,
      submitKingVote,
      submitHunterShot,
      playAgain,
    ],
  );

  return <OnlineContext.Provider value={value}>{children}</OnlineContext.Provider>;
}

export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface Room {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  phase: string;
  stage: string | null;
  round: number;
  phase_ends_at: string | null;
  min_players: number;
  max_players: number;
  role_pool: string[];
  winner: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  user_id: string;
  seat: number;
  display_name: string;
  is_host: boolean;
  is_ready: boolean;
  alive: boolean;
  connected: boolean;
  joined_at: string;
}

export interface RoomState {
  room: Room;
  players: RoomPlayer[];
  myRole: string | null;
}

export type GamePhase = 'night' | 'day' | 'finished';
export type GameStage =
  | 'call'
  | 'dawn'
  | 'discussion'
  | 'vote'
  | 'king'
  | 'result'
  | 'hunter'
  | 'finished';

export interface GamePlayerView {
  seat: number;
  name: string;
  alive: boolean;
  hp: number;
  transformedFrom: string | null;
  role: string | null;
}

export interface GameEventView {
  kind: string;
  message: string;
}

export interface SeerResultView {
  round: number;
  target_seat: number | null;
  is_threat: boolean | null;
}

export interface GameView {
  room: {
    code: string;
    status: RoomStatus;
    phase: GamePhase;
    stage: GameStage | null;
    round: number;
    deadline: string | null;
    winner: string | null;
  };
  call: string | null;
  candidates: number[];
  kingCandidates: number[];
  dayReport: string[];
  dayReady: number;
  dayAlive: number;
  players: GamePlayerView[];
  events: GameEventView[];
  you: {
    seat: number;
    role: string | null;
    alive: boolean;
    isYourTurn: boolean;
    canVote: boolean;
    awaitingHunter: boolean;
    isKing: boolean;
    skipReady: boolean;
    allies: number[];
    seer: SeerResultView | null;
  };
  winner: string | null;
}

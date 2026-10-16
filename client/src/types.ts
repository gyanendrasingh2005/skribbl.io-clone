export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  wordMode: "normal" | "hidden" | "combination";
  isPrivate: boolean;
}

export interface PlayerPublic {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isReady: boolean;
  hasGuessed: boolean;
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  size: number;
  isEraser?: boolean;
}

export interface GameStatePayload {
  phase: string;
  round: number;
  totalRounds: number;
  drawerId: string | null;
  timeLeft: number;
  hint: string;
  word: string | null;
  wordMode: string;
  scores: PlayerPublic[];
  strokes: Stroke[];
}

export interface LobbyState {
  code: string;
  roomId: string;
  settings: RoomSettings;
  players: PlayerPublic[];
  canStart: boolean;
}

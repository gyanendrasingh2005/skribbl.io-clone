export type GamePhase = "lobby" | "word_select" | "drawing" | "round_end" | "game_over";

export type WordMode = "normal" | "hidden" | "combination";

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  wordMode: WordMode;
  isPrivate: boolean;
}

export const DEFAULT_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  wordMode: "normal",
  isPrivate: false,
};

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

export interface ChatMessage {
  playerId: string;
  playerName: string;
  text: string;
  isGuess?: boolean;
  isCorrect?: boolean;
  timestamp: number;
}

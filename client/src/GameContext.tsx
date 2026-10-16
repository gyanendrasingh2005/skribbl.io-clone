import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSocket, emitAck } from "./socket";
import type { GameStatePayload, LobbyState, PlayerPublic, Stroke } from "./types";
import type { Socket } from "socket.io-client";

interface Session {
  playerId: string;
  roomId: string;
  code: string;
  playerName: string;
}

interface GameContextValue {
  socket: Socket;
  connected: boolean;
  session: Session | null;
  setSession: (s: Session | null) => void;
  lobby: LobbyState | null;
  gameState: GameStatePayload | null;
  wordOptions: string[] | null;
  messages: ChatLine[];
  roundBanner: string | null;
  gameOver: { winner: PlayerPublic; leaderboard: PlayerPublic[] } | null;
  setGameOver: (v: { winner: PlayerPublic; leaderboard: PlayerPublic[] } | null) => void;
  connect: () => void;
}

export interface ChatLine {
  playerId: string;
  playerName: string;
  text: string;
  isGuess?: boolean;
  isCorrect?: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const socket = useMemo(() => createSocket(), []);
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<Session | null>(() => {
    const raw = sessionStorage.getItem("skribble_session");
    return raw ? JSON.parse(raw) : null;
  });
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [gameState, setGameState] = useState<GameStatePayload | null>(null);
  const [wordOptions, setWordOptions] = useState<string[] | null>(null);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [roundBanner, setRoundBanner] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<{
    winner: PlayerPublic;
    leaderboard: PlayerPublic[];
  } | null>(null);

  const connect = useCallback(() => {
    if (!socket.connected) socket.connect();
  }, [socket]);

  useEffect(() => {
    if (session) {
      sessionStorage.setItem("skribble_session", JSON.stringify(session));
    } else {
      sessionStorage.removeItem("skribble_session");
    }
  }, [session]);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    socket.on("lobby_state", (data: LobbyState) => setLobby(data));
    socket.on("player_updated", (data: { players: PlayerPublic[] }) => {
      setLobby((prev) => (prev ? { ...prev, players: data.players, canStart: prev.canStart } : prev));
    });
    socket.on("player_joined", (data: { players: PlayerPublic[] }) => {
      setLobby((prev) => (prev ? { ...prev, players: data.players } : prev));
    });
    socket.on("player_left", (data: { players: PlayerPublic[] }) => {
      setLobby((prev) => (prev ? { ...prev, players: data.players } : prev));
    });
    socket.on("game_state", (data: GameStatePayload) => setGameState(data));
    socket.on("round_start", (data: { wordOptions: string[] | null; drawerName?: string }) => {
      setWordOptions(data.wordOptions);
      setRoundBanner(null);
      setMessages([]);
    });
    socket.on("round_drawing_start", () => {
      setWordOptions(null);
    });
    socket.on("timer_tick", (data: { timeLeft: number }) => {
      setGameState((prev) => (prev ? { ...prev, timeLeft: data.timeLeft } : prev));
    });
    socket.on("hint_update", (data: { hint: string }) => {
      setGameState((prev) => (prev ? { ...prev, hint: data.hint } : prev));
    });
    socket.on("round_end", (data: { word: string; gameOver: boolean }) => {
      setRoundBanner(`Round over! The word was: ${data.word}`);
      if (!data.gameOver) setWordOptions(null);
    });
    socket.on("game_over", (data: { winner: PlayerPublic; leaderboard: PlayerPublic[] }) => {
      setGameOver(data);
    });
    socket.on("chat_message", (msg: ChatLine) => {
      setMessages((m) => [...m, msg]);
    });
    socket.on("guess_result", (data: ChatLine & { correct: boolean }) => {
      if (data.correct) {
        setMessages((m) => [
          ...m,
          {
            playerId: data.playerId,
            playerName: data.playerName,
            text: `${data.playerName} guessed the word!`,
            isGuess: true,
            isCorrect: true,
          },
        ]);
      }
    });
    socket.on("canvas_clear", () => {
      setGameState((prev) => (prev ? { ...prev, strokes: [] } : prev));
    });
    socket.on("draw_undo", () => {
      setGameState((prev) => {
        if (!prev) return prev;
        const strokes = [...prev.strokes];
        strokes.pop();
        return { ...prev, strokes };
      });
    });
    socket.on("draw_data", (data: { action: string; stroke?: Stroke; strokeId?: string; point?: { x: number; y: number } }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        const strokes = [...prev.strokes];
        if (data.action === "add" && data.stroke) {
          strokes.push(data.stroke);
        } else if (data.action === "move" && data.strokeId && data.point) {
          const idx = strokes.findIndex((x) => x.id === data.strokeId);
          if (idx >= 0) {
            const s = strokes[idx];
            strokes[idx] = { ...s, points: [...s.points, data.point] };
          }
        }
        return { ...prev, strokes };
      });
    });
    return () => {
      socket.off("lobby_state");
      socket.off("player_updated");
      socket.off("player_joined");
      socket.off("player_left");
      socket.off("game_state");
      socket.off("round_start");
      socket.off("round_drawing_start");
      socket.off("timer_tick");
      socket.off("hint_update");
      socket.off("round_end");
      socket.off("game_over");
      socket.off("chat_message");
      socket.off("guess_result");
      socket.off("canvas_clear");
      socket.off("draw_undo");
      socket.off("draw_data");
    };
  }, [socket]);

  const value: GameContextValue = {
    socket,
    connected,
    session,
    setSession,
    lobby,
    gameState,
    wordOptions,
    messages,
    roundBanner,
    gameOver,
    setGameOver,
    connect,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame outside provider");
  return ctx;
}

export { emitAck };

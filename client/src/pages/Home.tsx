import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame, emitAck } from "../GameContext";
import type { RoomSettings } from "../types";

const defaultSettings: RoomSettings = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  wordMode: "normal",
  isPrivate: false,
};

export function Home() {
  const navigate = useNavigate();
  const { socket, connect, connected, setSession, setGameOver } = useGame();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<RoomSettings>(defaultSettings);
  const [publicRooms, setPublicRooms] = useState<
    { id: string; code: string; players: number; maxPlayers: number }[]
  >([]);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    const saved = sessionStorage.getItem("skribble_join_code");
    if (saved) {
      setCode(saved.toUpperCase());
      sessionStorage.removeItem("skribble_join_code");
    }
    const params = new URLSearchParams(window.location.search);
    const join = params.get("join");
    if (join) setCode(join.toUpperCase());
  }, []);

  const createRoom = async () => {
    setError("");
    if (!connected) {
      setError("Still connecting to server… wait a moment or restart npm run dev.");
      return;
    }
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    const res = await emitAck<{ roomId: string; code: string; playerId: string }>(socket, "create_room", {
      hostName: name.trim(),
      settings,
    });
    if (!res.ok || !res.data) {
      setError(res.error || "Failed to create room");
      return;
    }
    setGameOver(null);
    setSession({
      playerId: res.data.playerId,
      roomId: res.data.roomId,
      code: res.data.code,
      playerName: name.trim(),
    });
    navigate("/lobby");
  };

  const joinByCode = async (roomCode?: string) => {
    setError("");
    if (!connected) {
      setError("Still connecting to server… wait a moment or restart npm run dev.");
      return;
    }
    const c = (roomCode || code).trim();
    if (!name.trim() || !c) {
      setError("Enter name and room code");
      return;
    }
    const res = await emitAck<{ roomId: string; code: string; playerId: string }>(socket, "join_room", {
      code: c,
      playerName: name.trim(),
    });
    if (!res.ok || !res.data) {
      setError(res.error || "Failed to join");
      return;
    }
    setGameOver(null);
    setSession({
      playerId: res.data.playerId,
      roomId: res.data.roomId,
      code: res.data.code,
      playerName: name.trim(),
    });
    navigate("/lobby");
  };

  const refreshPublic = async () => {
    const res = await emitAck<
      { id: string; code: string; players: number; maxPlayers: number }[]
    >(socket, "list_public_rooms", {});
    if (res.ok && res.data) setPublicRooms(res.data);
  };

  useEffect(() => {
    if (connected) refreshPublic();
  }, [connected]);

  return (
    <div className="page home-page">
      <header className="hero">
        <h1>Skribble Clone</h1>
        <p>Draw, guess, and score points with friends.</p>
        <span className={`status ${connected ? "on" : "off"}`}>
          {connected ? "Connected" : "Connecting…"}
        </span>
      </header>

      <div className="card">
        <label>
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="Player name" />
        </label>

        <details className="settings">
          <summary>Room settings (create)</summary>
          <div className="settings-grid">
            <label>
              Max players
              <input
                type="number"
                min={2}
                max={20}
                value={settings.maxPlayers}
                onChange={(e) => setSettings({ ...settings, maxPlayers: Number(e.target.value) })}
              />
            </label>
            <label>
              Rounds
              <input
                type="number"
                min={2}
                max={10}
                value={settings.rounds}
                onChange={(e) => setSettings({ ...settings, rounds: Number(e.target.value) })}
              />
            </label>
            <label>
              Draw time (s)
              <input
                type="number"
                min={15}
                max={240}
                value={settings.drawTime}
                onChange={(e) => setSettings({ ...settings, drawTime: Number(e.target.value) })}
              />
            </label>
            <label>
              Word choices
              <input
                type="number"
                min={1}
                max={5}
                value={settings.wordCount}
                onChange={(e) => setSettings({ ...settings, wordCount: Number(e.target.value) })}
              />
            </label>
            <label>
              Hints
              <input
                type="number"
                min={0}
                max={5}
                value={settings.hints}
                onChange={(e) => setSettings({ ...settings, hints: Number(e.target.value) })}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={settings.isPrivate}
                onChange={(e) => setSettings({ ...settings, isPrivate: e.target.checked })}
              />
              Private room (hidden from public list)
            </label>
          </div>
        </details>

        <button type="button" className="btn primary" onClick={createRoom}>Create room</button>

        <hr />

        <label>
          Room code
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" />
        </label>
        <button type="button" className="btn secondary" onClick={() => joinByCode()}>Join room</button>

        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <div className="row-between">
          <h2>Public rooms</h2>
          <button type="button" className="btn small" onClick={refreshPublic}>Refresh</button>
        </div>
        {publicRooms.length === 0 ? (
          <p className="muted">No open public rooms. Create one!</p>
        ) : (
          <ul className="room-list">
            {publicRooms.map((r) => (
              <li key={r.id}>
                <span>{r.code}</span>
                <span>{r.players}/{r.maxPlayers}</span>
                <button type="button" className="btn small" onClick={() => joinByCode(r.code)}>Join</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

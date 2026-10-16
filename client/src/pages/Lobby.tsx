import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../GameContext";

export function Lobby() {
  const navigate = useNavigate();
  const { session, lobby, socket, gameState, connect } = useGame();

  useEffect(() => {
    connect();
    if (!session) navigate("/");
  }, [session, navigate, connect]);

  useEffect(() => {
    if (gameState && gameState.phase !== "lobby") {
      navigate("/game");
    }
  }, [gameState, navigate]);

  if (!session || !lobby) {
    return (
      <div className="page center">
        <p>Loading lobby…</p>
      </div>
    );
  }

  const me = lobby.players.find((p) => p.id === session.playerId);
  const isHost = me?.isHost;

  return (
    <div className="page lobby-page">
      <header className="lobby-header">
        <h1>Lobby</h1>
        <p>
          Room code: <strong className="code">{lobby.code}</strong>
        </p>
        <p className="muted">Share: {window.location.origin}?join={lobby.code}</p>
      </header>

      <div className="card">
        <h2>Players</h2>
        <ul className="player-list">
          {lobby.players.map((p) => (
            <li key={p.id}>
              <span>{p.name}{p.isHost ? " (host)" : ""}</span>
              <span>{p.isReady || p.isHost ? "✓ Ready" : "Not ready"}</span>
            </li>
          ))}
        </ul>

        {!isHost && (
          <button
            type="button"
            className="btn primary"
            onClick={() => socket.emit("set_ready", { ready: !me?.isReady })}
          >
            {me?.isReady ? "Unready" : "Ready up"}
          </button>
        )}

        {isHost && (
          <button
            type="button"
            className="btn primary"
            disabled={!lobby.canStart}
            onClick={() => socket.emit("start_game", {})}
          >
            Start game
          </button>
        )}
        {!lobby.canStart && isHost && (
          <p className="muted">Need 2+ players and everyone ready.</p>
        )}
      </div>

      <div className="card settings-readonly">
        <h3>Settings</h3>
        <p>Rounds: {lobby.settings.rounds} · Draw time: {lobby.settings.drawTime}s · Hints: {lobby.settings.hints}</p>
      </div>
    </div>
  );
}

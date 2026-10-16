import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DrawingCanvas } from "../components/DrawingCanvas";
import { useGame } from "../GameContext";

export function Game() {
  const navigate = useNavigate();
  const { session, gameState, wordOptions, messages, socket, roundBanner, gameOver, connect } =
    useGame();
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    connect();
    if (!session) navigate("/");
  }, [session, navigate, connect]);

  useEffect(() => {
    if (gameState?.phase === "lobby") navigate("/lobby");
  }, [gameState, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!session || !gameState) {
    return <div className="page center"><p>Loading game…</p></div>;
  }

  const isDrawer = gameState.drawerId === session.playerId;
  const drawer = gameState.scores.find((p) => p.id === gameState.drawerId);
  const me = gameState.scores.find((p) => p.id === session.playerId);
  const canGuess =
    gameState.phase === "drawing" && !isDrawer && !me?.hasGuessed;

  const sendGuess = () => {
    const text = input.trim();
    if (!text) return;
    if (gameState.phase === "drawing" && !isDrawer) {
      socket.emit("guess", { text });
    } else {
      socket.emit("chat", { text });
    }
    setInput("");
  };

  return (
    <div className="page game-page">
      <header className="game-top">
        <div>
          <span className="badge">Round {gameState.round}/{gameState.totalRounds}</span>
          <span className="timer">{gameState.timeLeft}s</span>
        </div>
        <div className="hint-display">{gameState.hint || "—"}</div>
        <div className="drawer-label">
          {gameState.phase === "word_select"
            ? `${drawer?.name} is choosing a word…`
            : `Drawing: ${drawer?.name ?? "?"}`}
        </div>
      </header>

      {roundBanner && <div className="banner">{roundBanner}</div>}

      {wordOptions && isDrawer && (
        <div className="word-picker">
          <p>Choose a word:</p>
          <div className="word-buttons">
            {wordOptions.map((w) => (
              <button key={w} type="button" className="btn primary" onClick={() => socket.emit("word_chosen", { word: w })}>
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {isDrawer && gameState.phase === "drawing" && gameState.word && (
        <div className="drawer-word">Draw: <strong>{gameState.word}</strong></div>
      )}

      <div className="game-layout">
        <aside className="scoreboard">
          <h3>Scores</h3>
          <ul>
            {[...gameState.scores]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <li key={p.id} className={p.id === gameState.drawerId ? "drawing" : ""}>
                  <span>{p.name}</span>
                  <span>{p.score}</span>
                </li>
              ))}
          </ul>
        </aside>

        <main>
          <DrawingCanvas
            strokes={gameState.strokes}
            canDraw={isDrawer && gameState.phase === "drawing"}
            socket={socket}
          />
        </main>

        <aside className="chat-panel">
          <h3>Chat & guesses</h3>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`chat-line ${m.isGuess ? (m.isCorrect ? "correct" : "guess") : ""}`}
              >
                <strong>{m.playerName}:</strong> {m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendGuess()}
              placeholder={canGuess ? "Type your guess…" : "Chat…"}
              disabled={gameState.phase === "word_select"}
            />
            <button type="button" className="btn small" onClick={sendGuess}>Send</button>
          </div>
        </aside>
      </div>

      {gameOver && (
        <div className="modal">
          <div className="modal-content">
            <h2>Game over!</h2>
            <p>Winner: <strong>{gameOver.winner.name}</strong> ({gameOver.winner.score} pts)</p>
            <ol>
              {gameOver.leaderboard.map((p) => (
                <li key={p.id}>{p.name} — {p.score}</li>
              ))}
            </ol>
            <button type="button" className="btn primary" onClick={() => navigate("/lobby")}>
              Back to lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

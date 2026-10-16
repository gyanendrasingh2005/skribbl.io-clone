import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppBackground } from "./components/AppBackground";
import { GameProvider } from "./GameContext";
import { Home } from "./pages/Home";
import { Lobby } from "./pages/Lobby";
import { Game } from "./pages/Game";
import "./styles.css";

function App() {
  return (
    <GameProvider>
      <div className="app-shell">
        <AppBackground />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/game" element={<Game />} />
          </Routes>
        </BrowserRouter>
      </div>
    </GameProvider>
  );
}

export default App;

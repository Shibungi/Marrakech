import { useState } from "react";

import { GamePage } from "./pages/GamePage";

const DEFAULT_MATCH_ID = "phase-1-demo";

export default function App() {
  const [playerID, setPlayerID] = useState("0");
  const [matchID, setMatchID] = useState(DEFAULT_MATCH_ID);
  const launchHint =
    "別タブで同じ Match ID を開き、Player を 0 / 1 / 2 に分けると同期確認ができます。";

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">roadmap.md / Phase 1 / Step 1</p>
          <h1>Marrakech boardgame.io Prototype</h1>
          <p className="hero-text">
            React + TypeScript + Vite に移行し、boardgame.io の最小構成で
            状態表示と move 呼び出しができる土台を作成しました。
          </p>
          <p className="hint">{launchHint}</p>
        </div>

        <div className="control-card">
          <label className="field">
            <span>Player</span>
            <select
              value={playerID}
              onChange={(event) => setPlayerID(event.target.value)}
            >
              <option value="0">0 / A</option>
              <option value="1">1 / B</option>
              <option value="2">2 / C</option>
            </select>
          </label>

          <label className="field">
            <span>Match ID</span>
            <input
              value={matchID}
              onChange={(event) => setMatchID(event.target.value)}
            />
          </label>
        </div>
      </header>

      <GamePage key={`${matchID}:${playerID}`} matchID={matchID} playerID={playerID} />
    </div>
  );
}

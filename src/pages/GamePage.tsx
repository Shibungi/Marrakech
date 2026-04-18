import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import type { Ctx } from "boardgame.io";

import { MarrakechGame, type PrototypeState } from "../game/MarrakechGame";

type BoardProps = {
  G: PrototypeState;
  ctx: Ctx;
  isActive: boolean;
  playerID?: string | null;
  matchID?: string;
  moves: Record<string, (...args: any[]) => void>;
};

type GamePageProps = {
  matchID: string;
  playerID: string;
};

const SERVER_URL = import.meta.env.VITE_GAME_SERVER ?? "http://localhost:8000";

function PrototypeBoard({ G, ctx, isActive, playerID, matchID, moves }: BoardProps) {
  return (
    <main className="layout">
      <section className="panel">
        <p className="panel-title">Current State</p>
        <div className="status-grid">
          <article className="status-card">
            <span>Stage</span>
            <strong>
              {G.stage} / {G.step}
            </strong>
          </article>
          <article className="status-card">
            <span>Current Player</span>
            <strong>{ctx.currentPlayer}</strong>
          </article>
          <article className="status-card">
            <span>Connected As</span>
            <strong>{playerID ?? "spectator"}</strong>
          </article>
          <article className="status-card">
            <span>Match ID</span>
            <strong>{matchID ?? "-"}</strong>
          </article>
        </div>
      </section>

      <section className="panel prototype-panel">
        <div className="prototype-header">
          <div>
            <p className="panel-title">Prototype Move</p>
            <h2>{G.summary}</h2>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => moves.advancePrototype?.()}
            disabled={!isActive}
          >
            move を実行
          </button>
        </div>

        <p className="lead">
          `roadmap.md` の最初の到達条件に合わせて、仮 state の描画と 1 つの
          move 呼び出しを確認するための画面です。
        </p>

        <div className="prototype-stats">
          <article className="metric">
            <span>Move Count</span>
            <strong>{G.moveCount}</strong>
          </article>
          <article className="metric">
            <span>Last Action</span>
            <strong>{G.lastAction}</strong>
          </article>
          <article className="metric">
            <span>Turn</span>
            <strong>{ctx.turn}</strong>
          </article>
        </div>

        <div className="player-strip">
          {Object.entries(G.players).map(([id, player]) => (
            <article className="player-chip" key={id}>
              <span>Player {id}</span>
              <strong>{player.label}</strong>
              <small>{player.connected ? "ready" : "offline"}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="panel-title">Event Log</p>
        <ul className="log-list">
          {G.log.map((entry, index) => (
            <li key={`${index}-${entry}`}>{entry}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

const MarrakechClient = Client({
  game: MarrakechGame,
  board: PrototypeBoard,
  numPlayers: 3,
  multiplayer: SocketIO({ server: SERVER_URL }),
});

export function GamePage({ matchID, playerID }: GamePageProps) {
  return <MarrakechClient matchID={matchID} playerID={playerID} />;
}

import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import type { Ctx } from "boardgame.io";

import { MarrakechGame } from "../game/MarrakechGame";
import type { MarrakechState, PlayerId } from "../game/types";
import { PLAYER_LABELS, ROW_SIZES } from "../game/types";

type BoardProps = {
  G: MarrakechState;
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

const TERRAIN_EMOJI: Record<string, string> = {
  sea: "🌊",
  mountain: "⛰️",
  city: "🏙️",
};

function GameBoard({ G, ctx, isActive, playerID, matchID, moves }: BoardProps) {
  const { assam, coins, board, log } = G;
  const maxCols = Math.max(...ROW_SIZES);

  return (
    <main className="layout">
      {/* ---- Status ---- */}
      <section className="panel">
        <p className="panel-title">Game Status</p>
        <div className="status-grid">
          <article className="status-card">
            <span>Phase</span>
            <strong>{ctx.phase ?? "—"}</strong>
          </article>
          <article className="status-card">
            <span>Current Player</span>
            <strong>
              {PLAYER_LABELS[ctx.currentPlayer as PlayerId] ?? ctx.currentPlayer}
            </strong>
          </article>
          <article className="status-card">
            <span>Connected As</span>
            <strong>
              {playerID
                ? `${playerID} / ${PLAYER_LABELS[playerID as PlayerId] ?? playerID}`
                : "spectator"}
            </strong>
          </article>
          <article className="status-card">
            <span>Match ID</span>
            <strong>{matchID ?? "-"}</strong>
          </article>
        </div>
      </section>

      {/* ---- Players ---- */}
      <section className="panel">
        <p className="panel-title">Players</p>
        <div className="player-strip">
          {(["0", "1", "2"] as PlayerId[]).map((id) => (
            <article
              className={`player-chip ${ctx.currentPlayer === id ? "active" : ""}`}
              key={id}
            >
              <span>Player {PLAYER_LABELS[id]}</span>
              <strong>💰 {coins[id]}</strong>
            </article>
          ))}
        </div>
      </section>

      {/* ---- Assam ---- */}
      <section className="panel">
        <p className="panel-title">Assam</p>
        <div className="prototype-stats">
          <article className="metric">
            <span>Position</span>
            <strong>
              ({assam.position.row}, {assam.position.col})
            </strong>
          </article>
          <article className="metric">
            <span>Direction</span>
            <strong>{assam.direction}</strong>
          </article>
          <article className="metric">
            <span>Turn</span>
            <strong>{ctx.turn}</strong>
          </article>
        </div>
      </section>

      {/* ---- Board (hex grid) ---- */}
      <section className="panel">
        <p className="panel-title">Board</p>
        <div className="hex-board">
          {board.map((row, r) => {
            const offset = maxCols - row.length;
            return (
              <div
                className="hex-row"
                key={r}
                style={{ paddingLeft: `${offset * 22}px` }}
              >
                {row.map((cell, c) => {
                  const isAssam =
                    assam.position.row === r && assam.position.col === c;
                  return (
                    <div
                      className={`hex-cell ${cell ? `terrain-${cell.terrain}` : "empty"} ${isAssam ? "assam" : ""}`}
                      key={`${r}-${c}`}
                      title={`(${r},${c})${cell ? ` ${cell.terrain} [${PLAYER_LABELS[cell.owner]}]` : ""}${isAssam ? " ★Assam" : ""}`}
                    >
                      {isAssam ? "★" : cell ? TERRAIN_EMOJI[cell.terrain] ?? "?" : "·"}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Ping (暫定 move) ---- */}
      <section className="panel">
        <div className="prototype-header">
          <p className="panel-title">Action</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => moves.ping?.()}
            disabled={!isActive}
          >
            ping
          </button>
        </div>
      </section>

      {/* ---- Log ---- */}
      <section className="panel">
        <p className="panel-title">Event Log</p>
        <ul className="log-list">
          {log.map((entry, i) => (
            <li key={`${i}-${entry.turn}`}>
              [{entry.turn}] {PLAYER_LABELS[entry.player]}: {entry.detail ?? entry.action}
            </li>
          ))}
          {log.length === 0 && <li className="muted">No events yet.</li>}
        </ul>
      </section>
    </main>
  );
}

const MarrakechClient = Client({
  game: MarrakechGame,
  board: GameBoard,
  numPlayers: 3,
  multiplayer: SocketIO({ server: SERVER_URL }),
});

export function GamePage({ matchID, playerID }: GamePageProps) {
  return <MarrakechClient matchID={matchID} playerID={playerID} />;
}

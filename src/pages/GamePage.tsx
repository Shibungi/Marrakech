import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import type { Ctx } from "boardgame.io";
import { useMemo, useState } from "react";

import { MarrakechGame } from "../game/MarrakechGame";
import type { HexCoord, MarrakechState, PlayerId, TerrainType } from "../game/types";
import { PLAYER_LABELS } from "../game/types";
import { directionFromNeighbor, formatHexCoord, getAllCells, getNeighbors } from "../game/hex";
import { getGameServerUrl } from "../network";
import { getCell, sameHex, toBoardKey } from "../game/board";

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
  credentials?: string;
};

const SERVER_URL = getGameServerUrl();
const SQRT_3 = Math.sqrt(3);
const HEX_SIZE = 34;
const HEX_WIDTH = SQRT_3 * HEX_SIZE;
const HEX_HEIGHT = HEX_SIZE * 2;
const HEX_INSET = 3;
const BOARD_PADDING = 18;

function createHexPoints(radius: number): string {
  const halfWidth = (SQRT_3 * radius) / 2;
  return [
    `0,${-radius}`,
    `${halfWidth},${-radius / 2}`,
    `${halfWidth},${radius / 2}`,
    `0,${radius}`,
    `${-halfWidth},${radius / 2}`,
    `${-halfWidth},${-radius / 2}`,
  ].join(" ");
}

function axialToPixel(coord: HexCoord): { x: number; y: number } {
  return {
    x: HEX_SIZE * SQRT_3 * (coord.q + coord.r / 2),
    y: HEX_SIZE * 1.5 * coord.r,
  };
}

const OUTER_HEX_POINTS = createHexPoints(HEX_SIZE);
const INNER_HEX_POINTS = createHexPoints(HEX_SIZE - HEX_INSET);

function GameBoard({ G, ctx, isActive, playerID, matchID, moves }: BoardProps) {
  const { assam, coins, board, log } = G;
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>("sea");
  const currentStage = ctx.activePlayers?.[ctx.currentPlayer];
  const currentPhase = currentStage ?? G.turnPhase;
  const boardLayout = useMemo(() => {
    const cells = getAllCells().map((coord) => ({ coord, ...axialToPixel(coord) }));
    const halfWidth = HEX_WIDTH / 2 + BOARD_PADDING;
    const halfHeight = HEX_HEIGHT / 2 + BOARD_PADDING;
    const minX = Math.min(...cells.map((cell) => cell.x)) - halfWidth;
    const maxX = Math.max(...cells.map((cell) => cell.x)) + halfWidth;
    const minY = Math.min(...cells.map((cell) => cell.y)) - halfHeight;
    const maxY = Math.max(...cells.map((cell) => cell.y)) + halfHeight;

    return {
      cells,
      viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
      ownerMarkerOffsetX: HEX_WIDTH * 0.28,
      ownerMarkerOffsetY: HEX_SIZE * -0.56,
    };
  }, []);

  const phaseActionLabel: Record<string, string> = {
    chooseDirection: "隣接マスをクリックして向き変更",
    moveAssam: "移動を実行",
    placeFirstTile: "1マス目を配置",
    placeSecondTile: "2マス目を配置して手番終了",
  };

  const runPhaseMove = () => {
    if (currentPhase === "moveAssam") {
      moves.moveAssam?.();
    }
  };

  const isDirectionCandidate = (coord: HexCoord) =>
    currentPhase === "chooseDirection" &&
    directionFromNeighbor(assam.position, coord) !== null;
  const placementCandidates = useMemo(() => {
    if (currentPhase === "placeFirstTile") {
      return getNeighbors(assam.position);
    }
    if (currentPhase === "placeSecondTile" && G.firstPlacement) {
      return getNeighbors(G.firstPlacement).filter(
        (cell) => !sameHex(cell, assam.position),
      );
    }
    return [];
  }, [G.firstPlacement, assam.position, currentPhase]);
  const isPlacementCandidate = (coord: HexCoord) =>
    placementCandidates.some((cell) => sameHex(cell, coord));

  const handleCellClick = (
    coord: HexCoord,
    canChooseDirection: boolean,
    canPlaceTile: boolean,
  ) => {
    if (canChooseDirection) {
      moves.chooseDirection?.(coord);
    } else if (canPlaceTile && currentPhase === "placeFirstTile") {
      moves.placeFirstTile?.(coord, selectedTerrain);
    } else if (canPlaceTile && currentPhase === "placeSecondTile") {
      moves.placeSecondTile?.(coord);
    }
  };

  return (
    <main className="layout">
      {/* ---- Status ---- */}
      <section className="panel">
        <p className="panel-title">Game Status</p>
        <div className="status-grid">
          <article className="status-card">
            <span>Phase</span>
            <strong>{currentPhase}</strong>
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
            <strong>{formatHexCoord(assam.position)}</strong>
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
          <svg
            aria-label="Marrakech board"
            className="hex-board-svg"
            role="img"
            viewBox={boardLayout.viewBox}
          >
            <defs>
              <linearGradient id="hex-empty-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#bf6737" />
                <stop offset="100%" stopColor="#7b341a" />
              </linearGradient>
              <linearGradient id="hex-sea-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#46b4ff" />
                <stop offset="52%" stopColor="#1d75c2" />
                <stop offset="100%" stopColor="#083f86" />
              </linearGradient>
              <linearGradient id="hex-forest-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#89d94a" />
                <stop offset="60%" stopColor="#4c9925" />
                <stop offset="100%" stopColor="#2e6c18" />
              </linearGradient>
              <linearGradient id="hex-city-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d4d8de" />
                <stop offset="55%" stopColor="#8f949f" />
                <stop offset="100%" stopColor="#636874" />
              </linearGradient>
              <linearGradient id="hex-cell-sheen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
                <stop offset="42%" stopColor="rgba(255,255,255,0.04)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
              </linearGradient>
              <radialGradient id="assam-body-fill" cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#fff2e3" />
                <stop offset="45%" stopColor="#ff9554" />
                <stop offset="100%" stopColor="#bf4300" />
              </radialGradient>
              <radialGradient id="assam-visor-fill" cx="40%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#f4fbff" />
                <stop offset="100%" stopColor="#5b6570" />
              </radialGradient>
            </defs>
            {boardLayout.cells.map(({ coord, x, y }) => {
              const cell = getCell(board, coord);
              const isAssam = sameHex(assam.position, coord);
              const canChooseDirection = isActive && isDirectionCandidate(coord);
              const canPlaceTile =
                isActive &&
                (currentPhase === "placeFirstTile" || currentPhase === "placeSecondTile") &&
                isPlacementCandidate(coord);
              const isClickable = canChooseDirection || canPlaceTile;

              return (
                <g
                  className={`hex-cell-group ${cell ? `terrain-${cell.terrain}` : "empty"} ${isAssam ? "assam" : ""} ${isClickable ? "clickable" : ""}`}
                  key={toBoardKey(coord)}
                  onClick={() => handleCellClick(coord, canChooseDirection, canPlaceTile)}
                  transform={`translate(${x} ${y})`}
                >
                  <title>
                    {`${formatHexCoord(coord)}${cell ? ` ${cell.terrain} [${PLAYER_LABELS[cell.owner]}]` : ""}${isAssam ? " Assam" : ""}`}
                  </title>
                  <polygon className="hex-cell-shadow" points={OUTER_HEX_POINTS} />
                  <polygon className="hex-cell-base" points={OUTER_HEX_POINTS} />
                  <polygon className="hex-cell-surface" points={INNER_HEX_POINTS} />
                  <polygon className="hex-cell-sheen" points={INNER_HEX_POINTS} />
                  {cell && (
                    <g
                      className={`hex-owner-badge owner-${cell.owner}`}
                      transform={`translate(${boardLayout.ownerMarkerOffsetX} ${boardLayout.ownerMarkerOffsetY})`}
                    >
                      <polygon className="hex-owner-gem" points="0,-10 8,0 0,10 -8,0" />
                      <text className="hex-owner-label" dominantBaseline="central" textAnchor="middle">
                        {PLAYER_LABELS[cell.owner]}
                      </text>
                    </g>
                  )}
                  {isAssam && (
                    <g className="hex-assam-token" transform="translate(0 2)">
                      <circle className="hex-assam-shadow" cy="3" r="16" />
                      <circle className="hex-assam-body" r="14" />
                      <circle className="hex-assam-visor" cy="-1" r="7.5" />
                      <text className="hex-assam-label" dominantBaseline="central" textAnchor="middle" y="10">
                        A
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {/* ---- Turn Action ---- */}
      <section className="panel">
        <div className="prototype-header">
          <p className="panel-title">Action</p>
          {currentPhase === "placeFirstTile" && (
            <select
              value={selectedTerrain}
              onChange={(event) => setSelectedTerrain(event.target.value as TerrainType)}
            >
              <option value="sea">sea</option>
              <option value="forest">forest</option>
              <option value="city">city</option>
            </select>
          )}
          <button
            className="primary-button"
            type="button"
            onClick={runPhaseMove}
            disabled={!isActive || currentPhase !== "moveAssam"}
          >
            {phaseActionLabel[currentPhase] ?? "次へ"}
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

export function GamePage({ matchID, playerID, credentials }: GamePageProps) {
  return (
    <MarrakechClient
      matchID={matchID}
      playerID={playerID}
      credentials={credentials}
    />
  );
}

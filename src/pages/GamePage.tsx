import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import type { Ctx } from "boardgame.io";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useMemo, useRef, useState } from "react";

import { MarrakechGame } from "../game/MarrakechGame";
import type { Direction, HexCoord, MarrakechState, PlayerId, TerrainType } from "../game/types";
import { PLAYER_LABELS } from "../game/types";
import assamTokenAsset from "../assets/assam-token.svg";
import { directionFromNeighbor, formatHexCoord, getAllCells, getNeighbors } from "../game/hex";
import { getGameServerUrl } from "../network";
import { getCell, sameHex, toBoardKey } from "../game/board";
import { connectedComponentSummary } from "../game/payment";

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
type HoveredHex = {
  coord: HexCoord;
  pointer: { x: number; y: number };
};

const SERVER_URL = getGameServerUrl();
const SQRT_3 = Math.sqrt(3);
const HEX_SIZE = 34;
const HEX_WIDTH = SQRT_3 * HEX_SIZE;
const HEX_HEIGHT = HEX_SIZE * 2;
const HEX_INSET = 3;
const BOARD_PADDING = 18;
const ASSAM_TOKEN_SIZE = 54;
const HOVER_TOOLTIP_WIDTH = 164;
const HOVER_TOOLTIP_HEIGHT = 96;
const HOVER_TOOLTIP_PADDING = 10;
const HOVER_TOOLTIP_CURSOR_OFFSET_X = HEX_SIZE * 0.62;
const HOVER_TOOLTIP_CURSOR_OFFSET_Y = HEX_SIZE * 0.68;
const TOOLTIP_PLAYER_IDS: readonly PlayerId[] = ["0", "1", "2"];

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
const ASSAM_ROTATION_BY_DIRECTION: Record<Direction, number> = {
  NE: 0,
  E: 60,
  SE: 120,
  SW: 180,
  W: 240,
  NW: 300,
};

function GameBoard({ G, ctx, isActive, playerID, matchID, moves }: BoardProps) {
  const { assam, coins, board, log } = G;
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>("sea");
  const [hoveredHex, setHoveredHex] = useState<HoveredHex | null>(null);
  const boardSvgRef = useRef<SVGSVGElement | null>(null);
  const currentStage = ctx.activePlayers?.[ctx.currentPlayer];
  const currentPhase = currentStage ?? G.turnPhase;
  const assamRotation = ASSAM_ROTATION_BY_DIRECTION[assam.direction];
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
      minX,
      maxX,
      minY,
      maxY,
      ownerMarkerOffsetX: HEX_WIDTH * 0.28,
      ownerMarkerOffsetY: HEX_SIZE * -0.56,
    };
  }, []);

  const getPointerAnchor = (event: ReactMouseEvent<SVGGElement>): { x: number; y: number } | null => {
    const svg = boardSvgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) {
      return null;
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(ctm.inverse());

    return { x: transformed.x, y: transformed.y };
  };

  const updateHoveredHex = (coord: HexCoord, event: ReactMouseEvent<SVGGElement>) => {
    setHoveredHex({
      coord,
      pointer: getPointerAnchor(event) ?? axialToPixel(coord),
    });
  };

  const hoveredComponent = useMemo(() => {
    if (hoveredHex === null) {
      return null;
    }

    const hoveredCell = getCell(board, hoveredHex.coord);
    if (hoveredCell === null) {
      return null;
    }

    const summary = connectedComponentSummary(board, hoveredHex.coord, hoveredCell);
    const minX = boardLayout.minX + 8;
    const maxX = boardLayout.maxX - HOVER_TOOLTIP_WIDTH - 8;
    const minY = boardLayout.minY + 8;
    const maxY = boardLayout.maxY - HOVER_TOOLTIP_HEIGHT - 8;
    const rightX = hoveredHex.pointer.x + HOVER_TOOLTIP_CURSOR_OFFSET_X;
    const leftX = hoveredHex.pointer.x - HOVER_TOOLTIP_WIDTH - HOVER_TOOLTIP_CURSOR_OFFSET_X;
    const belowY = hoveredHex.pointer.y + HOVER_TOOLTIP_CURSOR_OFFSET_Y;
    const aboveY = hoveredHex.pointer.y - HOVER_TOOLTIP_HEIGHT - HOVER_TOOLTIP_CURSOR_OFFSET_Y;
    const preferredX = rightX <= maxX ? rightX : leftX;
    const preferredY = belowY <= maxY ? belowY : aboveY;

    return {
      coord: hoveredHex.coord,
      tile: hoveredCell,
      summary,
      originKey: toBoardKey(hoveredHex.coord),
      componentKeys: new Set(summary.cells.map((cell) => toBoardKey(cell))),
      tooltipX: Math.min(Math.max(preferredX, minX), maxX),
      tooltipY: Math.min(Math.max(preferredY, minY), maxY),
    };
  }, [board, boardLayout.maxX, boardLayout.maxY, boardLayout.minX, boardLayout.minY, hoveredHex]);

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
            ref={boardSvgRef}
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
            </defs>
            {boardLayout.cells.map(({ coord, x, y }) => {
              const cell = getCell(board, coord);
              const cellKey = toBoardKey(coord);
              const isAssam = sameHex(assam.position, coord);
              const canChooseDirection = isActive && isDirectionCandidate(coord);
              const canPlaceTile =
                isActive &&
                (currentPhase === "placeFirstTile" || currentPhase === "placeSecondTile") &&
                isPlacementCandidate(coord);
              const isClickable = canChooseDirection || canPlaceTile;
              const isHoveredComponent = hoveredComponent?.componentKeys.has(cellKey) ?? false;
              const isHoveredOrigin = hoveredComponent?.originKey === cellKey;

              return (
                <g
                  className={`hex-cell-group ${cell ? `terrain-${cell.terrain}` : "empty"} ${isAssam ? "assam" : ""} ${isClickable ? "clickable" : ""} ${isHoveredComponent ? "hover-component" : ""} ${isHoveredOrigin ? "hover-origin" : ""}`}
                  key={cellKey}
                  onClick={() => handleCellClick(coord, canChooseDirection, canPlaceTile)}
                  onMouseEnter={(event) => {
                    if (!cell) {
                      setHoveredHex(null);
                      return;
                    }

                    updateHoveredHex(coord, event);
                  }}
                  onMouseLeave={() => setHoveredHex((current) => (current && sameHex(current.coord, coord) ? null : current))}
                  onMouseMove={(event) => {
                    if (!cell) {
                      return;
                    }

                    updateHoveredHex(coord, event);
                  }}
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
                    <g pointerEvents="none" transform={`translate(0 2) rotate(${assamRotation})`}>
                      <ellipse className="hex-assam-shadow" cy="4" rx="16.5" ry="11.5" />
                      <image
                        className="hex-assam-image"
                        href={assamTokenAsset}
                        height={ASSAM_TOKEN_SIZE}
                        preserveAspectRatio="xMidYMid meet"
                        width={ASSAM_TOKEN_SIZE}
                        x={-ASSAM_TOKEN_SIZE / 2}
                        y={-ASSAM_TOKEN_SIZE / 2}
                      />
                    </g>
                  )}
                </g>
              );
            })}
            {hoveredComponent && (
              <g
                aria-hidden="true"
                className="hex-hover-tooltip"
                transform={`translate(${hoveredComponent.tooltipX} ${hoveredComponent.tooltipY})`}
              >
                <rect className="hex-hover-tooltip-panel" height={HOVER_TOOLTIP_HEIGHT} rx="15" ry="15" width={HOVER_TOOLTIP_WIDTH} />
                <text className="hex-hover-tooltip-title" x={HOVER_TOOLTIP_PADDING + 2} y={21}>
                  {formatHexCoord(hoveredComponent.coord)}
                </text>
                <text className="hex-hover-tooltip-subtitle" x={HOVER_TOOLTIP_PADDING + 2} y={39}>
                  {`${hoveredComponent.tile.terrain} / ${hoveredComponent.summary.size} cells`}
                </text>
                {TOOLTIP_PLAYER_IDS.map((id, index) => {
                  const ownerCount = hoveredComponent.summary.ownerCounts[id];

                  return (
                    <g
                      className={`hex-hover-tooltip-owner owner-${id} ${ownerCount === 0 ? "empty" : ""}`}
                      key={id}
                      transform={`translate(${HOVER_TOOLTIP_PADDING} ${56 + index * 12})`}
                    >
                      <circle className="hex-hover-tooltip-owner-dot" cx={6} cy={-4} r={4.25} />
                      <text className="hex-hover-tooltip-owner-label" x={17} y={0}>
                        {`${PLAYER_LABELS[id]}  ${ownerCount}`}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
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

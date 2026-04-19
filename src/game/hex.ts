// ---------------------------------------------------------------------------
// Marrakech – 六角盤面座標ユーティリティ
// Phase 3: roadmap.md の座標・隣接判定
// ---------------------------------------------------------------------------

import { type HexCoord, type Direction, ROW_SIZES, NUM_ROWS } from "./types";

/** 指定座標が盤面上の有効マスかどうか */
export function isValidCell(coord: HexCoord): boolean {
  const { row, col } = coord;
  if (row < 0 || row >= NUM_ROWS) return false;
  if (col < 0 || col >= ROW_SIZES[row]) return false;
  return true;
}

/** 盤面上の全有効座標を返す */
export function getAllCells(): HexCoord[] {
  const cells: HexCoord[] = [];
  for (let row = 0; row < NUM_ROWS; row++) {
    for (let col = 0; col < ROW_SIZES[row]; col++) {
      cells.push({ row, col });
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Doubled 座標変換
// ---------------------------------------------------------------------------
//
// 盤面 (4-5-6-7-6-5-4) は、各行が中央行(row=3)から半マスずつ水平にずれる。
// そのため「半マス単位」を整数化した doubled-x 座標で扱う。
//
//   x = 2*col + abs(row-3)
//   y = row
//
// このとき隣接は次の固定ベクトルになる。
//   E/W  : x ± 2, y ± 0
//   斜め : x ± 1, y ± 1
//
// 上下の行長差によるズレを明示的に持つため、
// 上半分/下半分のどちらでも同じ規則で隣接を計算できる。
// ---------------------------------------------------------------------------

interface DoubledCoord {
  x: number;
  y: number;
}

function rowOffset(row: number): number {
  return Math.abs(row - 3);
}

function toDoubled(hex: HexCoord): DoubledCoord {
  return { x: 2 * hex.col + rowOffset(hex.row), y: hex.row };
}

function fromDoubled(dc: DoubledCoord): HexCoord | null {
  const row = dc.y;
  if (row < 0 || row >= NUM_ROWS) return null;

  const offset = rowOffset(row);
  const colRaw = dc.x - offset;
  if (colRaw % 2 !== 0) return null;

  const col = colRaw / 2;
  const hex = { row, col };
  return isValidCell(hex) ? hex : null;
}

const DOUBLED_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  NE: { dx: 1, dy: -1 },
  E: { dx: 2, dy: 0 },
  SE: { dx: 1, dy: 1 },
  SW: { dx: -1, dy: 1 },
  W: { dx: -2, dy: 0 },
  NW: { dx: -1, dy: -1 },
};

const DIRECTION_ORDER: Direction[] = ["NE", "E", "SE", "SW", "W", "NW"];

/** 指定マスの有効な隣接マスをすべて返す */
export function getNeighbors(coord: HexCoord): HexCoord[] {
  const dc = toDoubled(coord);
  const neighbors: HexCoord[] = [];

  for (const { dx, dy } of Object.values(DOUBLED_DELTAS)) {
    const next = fromDoubled({ x: dc.x + dx, y: dc.y + dy });
    if (next) {
      neighbors.push(next);
    }
  }

  return neighbors;
}

/**
 * 指定位置から指定方向に 1 歩進んだ座標を返す。
 * 盤外の場合は null を返す（折り返しは Phase 6 で実装）。
 */
export function stepInDirection(
  coord: HexCoord,
  dir: Direction,
): HexCoord | null {
  const dc = toDoubled(coord);
  const delta = DOUBLED_DELTAS[dir];
  return fromDoubled({ x: dc.x + delta.dx, y: dc.y + delta.dy });
}

/**
 * 指定方向の反対方向を返す
 */
export function oppositeDirection(dir: Direction): Direction {
  const map: Record<Direction, Direction> = {
    NE: "SW",
    E: "W",
    SE: "NW",
    SW: "NE",
    W: "E",
    NW: "SE",
  };
  return map[dir];
}

/**
 * 指定方向から時計回りに 1 ステップ回転した方向を返す
 */
export function rotateClockwise(dir: Direction): Direction {
  const idx = DIRECTION_ORDER.indexOf(dir);
  return DIRECTION_ORDER[(idx + 1) % 6];
}

/**
 * 指定方向から反時計回りに 1 ステップ回転した方向を返す
 */
export function rotateCounterClockwise(dir: Direction): Direction {
  const idx = DIRECTION_ORDER.indexOf(dir);
  return DIRECTION_ORDER[(idx + 5) % 6];
}

/**
 * 隣接マスへの方向を返す。
 * 隣接していない、または target が盤外の場合は null。
 */
export function directionFromNeighbor(
  origin: HexCoord,
  target: HexCoord,
): Direction | null {
  if (!isValidCell(origin) || !isValidCell(target)) return null;
  for (const dir of DIRECTION_ORDER) {
    const next = stepInDirection(origin, dir);
    if (next && next.row === target.row && next.col === target.col) {
      return dir;
    }
  }
  return null;
}

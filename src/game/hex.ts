// ---------------------------------------------------------------------------
// Marrakech – 六角盤面座標ユーティリティ
// Phase 3: roadmap.md の座標・隣接判定
// ---------------------------------------------------------------------------
//
// 座標系: offset hex (odd-r style)
//   行ごとのマス数: 4-5-6-7-6-5-4 (row 0..6)
//   各行の col 範囲: 0 .. ROW_SIZES[row]-1
//
// 六角形の隣接は行の偶奇で offset が異なる。
// ここでは「上半分 (row<3) は短い行が偶数列」パターンを使い、
// 隣接 delta を row の parity (奇数/偶数列数) で切り替える。
//
// ただし、このマップは菱形ではなく六角形状であるため、
// 隣接関係は axial (cube) 座標に変換して計算する方が正確。
// ---------------------------------------------------------------------------

import { type HexCoord, type Direction, ROW_SIZES, NUM_ROWS } from "./types";

// ---------------------------------------------------------------------------
// 有効マス判定
// ---------------------------------------------------------------------------

/** 指定座標が盤面上の有効マスかどうか */
export function isValidCell(coord: HexCoord): boolean {
  const { row, col } = coord;
  if (row < 0 || row >= NUM_ROWS) return false;
  if (col < 0 || col >= ROW_SIZES[row]) return false;
  return true;
}

// ---------------------------------------------------------------------------
// 全マス列挙
// ---------------------------------------------------------------------------

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
// Axial 座標変換
// ---------------------------------------------------------------------------
//
// 六角形状のマップ (4-5-6-7-6-5-4) を axial 座標 (q, r) に変換する。
//   - axial r = row
//   - axial q = col - offset(row)
// offset(row) は、中央行 (row=3) を基準に、各行が左にどれだけずれるかを表す。
//   row: 0  1  2  3  4  5  6
//   size: 4  5  6  7  6  5  4
//   offset: 0  0  0  0  1  1  1
//
// これは「中央行の左端を q=0 とし、行が下がるとオフセットがずれる」形式。
// 上半分 (row<=3): offset = 0, colの範囲は 0..size-1
//   -> q = col, min_q = 0
// 下半分 (row>3): offset = row-3, col の範囲は 0..size-1
//   -> q = col + (row - 3)
// ---------------------------------------------------------------------------

interface AxialCoord {
  q: number;
  r: number;
}

function toAxial(hex: HexCoord): AxialCoord {
  const offset = hex.row <= 3 ? 0 : hex.row - 3;
  return { q: hex.col + offset, r: hex.row };
}

function fromAxial(ax: AxialCoord): HexCoord {
  const row = ax.r;
  const offset = row <= 3 ? 0 : row - 3;
  return { row, col: ax.q - offset };
}

// Axial 方向ベクトル (cube 座標と同等)
//   NE: (q+1, r-1)   E: (q+1, r+0)   SE: (q+0, r+1)
//   SW: (q-1, r+1)   W: (q-1, r+0)   NW: (q+0, r-1)
const AXIAL_DELTAS: Record<Direction, { dq: number; dr: number }> = {
  NE: { dq: 1, dr: -1 },
  E: { dq: 1, dr: 0 },
  SE: { dq: 0, dr: 1 },
  SW: { dq: -1, dr: 1 },
  W: { dq: -1, dr: 0 },
  NW: { dq: 0, dr: -1 },
};

const DIRECTION_ORDER: Direction[] = ["NE", "E", "SE", "SW", "W", "NW"];

// ---------------------------------------------------------------------------
// 隣接マス列挙
// ---------------------------------------------------------------------------

/** 指定マスの有効な隣接マスをすべて返す */
export function getNeighbors(coord: HexCoord): HexCoord[] {
  const ax = toAxial(coord);
  const neighbors: HexCoord[] = [];

  for (const { dq, dr } of Object.values(AXIAL_DELTAS)) {
    const nax: AxialCoord = { q: ax.q + dq, r: ax.r + dr };
    const nhex = fromAxial(nax);
    if (isValidCell(nhex)) {
      neighbors.push(nhex);
    }
  }

  return neighbors;
}

// ---------------------------------------------------------------------------
// 方向に基づく次マス計算
// ---------------------------------------------------------------------------

/**
 * 指定位置から指定方向に 1 歩進んだ座標を返す。
 * 盤外の場合は null を返す（折り返しは Phase 6 で実装）。
 */
export function stepInDirection(
  coord: HexCoord,
  dir: Direction,
): HexCoord | null {
  const ax = toAxial(coord);
  const delta = AXIAL_DELTAS[dir];
  const nax: AxialCoord = { q: ax.q + delta.dq, r: ax.r + delta.dr };
  const nhex = fromAxial(nax);
  return isValidCell(nhex) ? nhex : null;
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

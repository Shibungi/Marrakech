// ---------------------------------------------------------------------------
// Marrakech – 六角盤面座標ユーティリティ
// 軸座標 (q, r) を使う半径 3 の六角盤面
// ---------------------------------------------------------------------------

import { BOARD_RADIUS, type HexCoord, type Direction } from "./types";
import { sameHex } from "./board";

const AXIAL_DELTAS: Record<Direction, HexCoord> = {
  NE: { q: 1, r: -1 },
  E: { q: 1, r: 0 },
  SE: { q: 0, r: 1 },
  SW: { q: -1, r: 1 },
  W: { q: -1, r: 0 },
  NW: { q: 0, r: -1 },
};

const DIRECTION_ORDER: Direction[] = ["NE", "E", "SE", "SW", "W", "NW"];

/** 指定座標が盤面上の有効マスかどうか */
export function isValidCell(coord: HexCoord): boolean {
  const s = -coord.q - coord.r;
  return Math.max(Math.abs(coord.q), Math.abs(coord.r), Math.abs(s)) <= BOARD_RADIUS;
}

/** 盤面上の全有効座標を返す */
export function getAllCells(): HexCoord[] {
  const cells: HexCoord[] = [];

  for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
    const minQ = Math.max(-BOARD_RADIUS, -r - BOARD_RADIUS);
    const maxQ = Math.min(BOARD_RADIUS, -r + BOARD_RADIUS);
    for (let q = minQ; q <= maxQ; q++) {
      cells.push({ q, r });
    }
  }

  return cells;
}

/** 指定マスの有効な隣接マスをすべて返す */
export function getNeighbors(coord: HexCoord): HexCoord[] {
  return DIRECTION_ORDER
    .map((dir) => stepInDirection(coord, dir))
    .filter((next): next is HexCoord => next !== null);
}

/**
 * 指定位置から指定方向に 1 歩進んだ座標を返す。
 * 盤外の場合は null を返す（折り返しは Phase 6 で実装）。
 */
export function stepInDirection(
  coord: HexCoord,
  dir: Direction,
): HexCoord | null {
  const delta = AXIAL_DELTAS[dir];
  const next = { q: coord.q + delta.q, r: coord.r + delta.r };
  return isValidCell(next) ? next : null;
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
 * 現在の向きから選べる前方 3 方向を返す。
 */
export function getForwardDirections(dir: Direction): Direction[] {
  return [rotateCounterClockwise(dir), dir, rotateClockwise(dir)];
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
    if (next && sameHex(next, target)) {
      return dir;
    }
  }
  return null;
}

export function formatHexCoord(coord: HexCoord): string {
  return `(${coord.q},${coord.r})`;
}

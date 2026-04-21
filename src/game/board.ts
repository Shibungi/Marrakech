import type { BoardState, CellState, HexCoord } from "./types";

export function toBoardKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function sameHex(left: HexCoord, right: HexCoord): boolean {
  return left.q === right.q && left.r === right.r;
}

export function getCell(board: BoardState, coord: HexCoord): CellState {
  return board[toBoardKey(coord)] ?? null;
}

export function setCell(board: BoardState, coord: HexCoord, cell: CellState): void {
  board[toBoardKey(coord)] = cell;
}

export function cloneBoard(board: BoardState): BoardState {
  return { ...board };
}
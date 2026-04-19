import type { MarrakechState, PlayerId, Tile, HexCoord } from "./types";
import { getNeighbors, isValidCell } from "./hex";

export function connectedComponentSize(
  board: MarrakechState["board"],
  start: HexCoord,
  tile: Tile,
): number {
  if (!isValidCell(start)) return 0;

  const visited = new Set<string>();
  const queue: HexCoord[] = [start];
  let size = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = `${current.row},${current.col}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const currentTile = board[current.row]?.[current.col] ?? null;
    if (
      currentTile === null ||
      currentTile.owner !== tile.owner ||
      currentTile.terrain !== tile.terrain
    ) {
      continue;
    }

    size += 1;
    for (const next of getNeighbors(current)) {
      const nextKey = `${next.row},${next.col}`;
      if (!visited.has(nextKey)) {
        queue.push(next);
      }
    }
  }

  return size;
}

type PaymentResult = {
  paid: boolean;
  payee: PlayerId | null;
  amount: number;
};

export function applyLandingPayment(
  G: MarrakechState,
  currentPlayer: PlayerId,
): PaymentResult {
  const landing = G.assam.position;
  const landingTile = G.board[landing.row]?.[landing.col] ?? null;
  if (landingTile === null || landingTile.owner === currentPlayer) {
    return { paid: false, payee: null, amount: 0 };
  }

  const amount = connectedComponentSize(G.board, landing, landingTile);
  const payable = Math.min(G.coins[currentPlayer], amount);
  G.coins[currentPlayer] -= payable;
  G.coins[landingTile.owner] += payable;

  return {
    paid: payable > 0,
    payee: landingTile.owner,
    amount: payable,
  };
}

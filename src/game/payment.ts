import type { MarrakechState, PlayerId, Tile, HexCoord } from "./types";
import { getCell, toBoardKey } from "./board";
import { getNeighbors, isValidCell } from "./hex";

const PLAYER_IDS: readonly PlayerId[] = ["0", "1", "2"];

export type ConnectedComponentSummary = {
  size: number;
  ownerCounts: Record<PlayerId, number>;
  cells: HexCoord[];
};

function createOwnerCounts(): Record<PlayerId, number> {
  return { "0": 0, "1": 0, "2": 0 };
}

function collectConnectedComponentSummary(
  board: MarrakechState["board"],
  start: HexCoord,
  terrain: Tile["terrain"],
): ConnectedComponentSummary {
  const ownerCounts = createOwnerCounts();
  if (!isValidCell(start)) {
    return { size: 0, ownerCounts, cells: [] };
  }

  const visited = new Set<string>();
  const queue: HexCoord[] = [start];
  const cells: HexCoord[] = [];
  let size = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = toBoardKey(current);
    if (visited.has(key)) continue;
    visited.add(key);

    const currentTile = getCell(board, current);
    if (currentTile === null || currentTile.terrain !== terrain) {
      continue;
    }

    size += 1;
    ownerCounts[currentTile.owner] += 1;
    cells.push(current);

    for (const next of getNeighbors(current)) {
      const nextKey = toBoardKey(next);
      if (!visited.has(nextKey)) {
        queue.push(next);
      }
    }
  }

  return { size, ownerCounts, cells };
}

export function connectedComponentSummary(
  board: MarrakechState["board"],
  start: HexCoord,
  tile: Tile,
): ConnectedComponentSummary {
  return collectConnectedComponentSummary(board, start, tile.terrain);
}

export function connectedComponentSize(
  board: MarrakechState["board"],
  start: HexCoord,
  tile: Tile,
): number {
  return connectedComponentSummary(board, start, tile).size;
}

export function connectedComponentOwnerCounts(
  board: MarrakechState["board"],
  start: HexCoord,
  tile: Tile,
): Record<PlayerId, number> {
  return connectedComponentSummary(board, start, tile).ownerCounts;
}

type PaymentTransfer = {
  payee: PlayerId;
  amount: number;
};

type PaymentResult = {
  paid: boolean;
  transfers: PaymentTransfer[];
  amount: number;
};

export function applyLandingPayment(
  G: MarrakechState,
  currentPlayer: PlayerId,
): PaymentResult {
  const landing = G.assam.position;
  const landingTile = getCell(G.board, landing);
  if (landingTile === null) {
    return { paid: false, transfers: [], amount: 0 };
  }

  const ownerCounts = connectedComponentOwnerCounts(G.board, landing, landingTile);
  const currentPlayerCount = ownerCounts[currentPlayer];
  const transfers: PaymentTransfer[] = [];
  let remainingCoins = G.coins[currentPlayer];

  for (const payee of PLAYER_IDS) {
    if (payee === currentPlayer) continue;

    const owed = ownerCounts[payee] - currentPlayerCount;
    if (owed <= 0) continue;

    const paid = Math.min(remainingCoins, owed);
    if (paid <= 0) break;

    G.coins[currentPlayer] -= paid;
    G.coins[payee] += paid;
    remainingCoins -= paid;
    transfers.push({ payee, amount: paid });
  }

  const totalPaid = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);

  return {
    paid: totalPaid > 0,
    transfers,
    amount: totalPaid,
  };
}

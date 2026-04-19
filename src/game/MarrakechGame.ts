import type { Ctx, Game } from "boardgame.io";

import type { MarrakechState, PlayerId, PlayerScore } from "./types";
import { PLAYER_LABELS } from "./types";
import { createInitialState } from "./setup";
import { directionFromNeighbor, getNeighbors } from "./hex";
import { moveAssamWithBounce } from "./movement";
import { applyLandingPayment } from "./payment";
import type { TerrainType } from "./types";

const INVALID_MOVE = "INVALID_MOVE";

function formatPlayer(playerID: string | null | undefined): string {
  if (playerID === undefined || playerID === null) return "unknown";
  return PLAYER_LABELS[playerID as PlayerId] ?? playerID;
}

/** プレイヤーが配置可能なタイル（同タイプ 2 枚以上）を持っているか */
export function canPlaceTiles(G: MarrakechState, player: PlayerId): boolean {
  const t = G.tiles[player];
  return t.sea >= 2 || t.mountain >= 2 || t.city >= 2;
}

/** 全プレイヤーのスコアを計算（降順ソート） */
export function calculateScores(G: MarrakechState): PlayerScore[] {
  const scores: PlayerScore[] = (["0", "1", "2"] as PlayerId[]).map((id) => {
    let tilesOnBoard = 0;
    for (const row of G.board) {
      for (const cell of row) {
        if (cell && cell.owner === id) tilesOnBoard++;
      }
    }
    return {
      player: id,
      coins: G.coins[id],
      tilesOnBoard,
      total: G.coins[id] + tilesOnBoard,
    };
  });
  return scores.sort((a, b) => b.total - a.total);
}

export const MarrakechGame: Game<MarrakechState> = {
  name: "marrakech",
  setup: () => createInitialState(),
  endIf: ({ G }) => {
    const allExhausted = (["0", "1", "2"] as PlayerId[]).every(
      (id) => !canPlaceTiles(G, id),
    );
    if (allExhausted) {
      const scores = calculateScores(G);
      return { winner: scores[0].player, scores };
    }
  },
  turn: {
    order: {
      first: () => 0,
      next: ({ ctx }) => (Number(ctx.playOrderPos) + 1) % ctx.numPlayers,
    },
    activePlayers: { currentPlayer: "chooseDirection" },
    stages: {
      chooseDirection: { moves: { chooseDirection }, next: "moveAssam" },
      moveAssam: { moves: { moveAssam }, next: "placeFirstTile" },
      placeFirstTile: { moves: { placeFirstTile }, next: "placeSecondTile" },
      placeSecondTile: { moves: { placeSecondTile } },
    },
    onBegin: ({ G }) => {
      G.turnPhase = "chooseDirection";
      G.selectedTerrain = null;
      G.firstPlacement = null;
    },
  },
};

function chooseDirection({
  G,
  ctx,
  events,
}: {
  G: MarrakechState;
  ctx: Ctx;
  events: { endStage: () => void };
},
  target: { row: number; col: number }): void | "INVALID_MOVE" {
  if (G.turnPhase !== "chooseDirection") return INVALID_MOVE;
  const newDirection = directionFromNeighbor(G.assam.position, target);
  if (!newDirection) return INVALID_MOVE;
  G.assam.direction = newDirection;

  const player = formatPlayer(ctx.currentPlayer);
  G.log.unshift({
    turn: ctx.turn,
    player: ctx.currentPlayer as PlayerId,
    action: "chooseDirection",
    detail: `${player} が向きを ${newDirection} に変更しました。`,
  });
  G.turnPhase = "moveAssam";
  events.endStage();
}

function moveAssam({
  G,
  ctx,
  random,
  events,
}: {
  G: MarrakechState;
  ctx: Ctx;
  random: { Number: () => number };
  events: { endStage: () => void };
}): void | "INVALID_MOVE" {
  if (G.turnPhase !== "moveAssam") return INVALID_MOVE;

  const randomUnit = () => random.Number();

  const steps = Math.floor(randomUnit() * 3) + 1;
  const result = moveAssamWithBounce(
    G.assam.position,
    G.assam.direction,
    steps,
    randomUnit,
  );

  G.assam.position = result.position;
  G.assam.direction = result.direction;
  const payment = applyLandingPayment(G, ctx.currentPlayer as PlayerId);

  const player = formatPlayer(ctx.currentPlayer);
  const redirectDetail =
    result.redirects.length === 0
      ? ""
      : ` / 盤外回避: ${result.redirects
        .map((redirect) => `(${redirect.at.row},${redirect.at.col}) ${redirect.from}→${redirect.to}`)
        .join(", ")}`;
  const paymentDetail =
    payment.paid && payment.payee !== null
      ? ` / 支払い: ${player} → ${formatPlayer(payment.payee)} に ${payment.amount}`
      : "";

  G.log.unshift({
    turn: ctx.turn,
    player: ctx.currentPlayer as PlayerId,
    action: "moveAssam",
    detail: `${player} が ${steps} マス移動し (${result.position.row},${result.position.col}) に到達。向き: ${result.direction}${redirectDetail}${paymentDetail}`,
  });
  const currentPlayer = ctx.currentPlayer as PlayerId;
  if (!canPlaceTiles(G, currentPlayer)) {
    G.log.unshift({
      turn: ctx.turn,
      player: currentPlayer,
      action: "skipPlacement",
      detail: `${player} は配置可能なタイルがないため配置をスキップしました。`,
    });
    (events as any).endTurn();
    return;
  }
  G.turnPhase = "placeFirstTile";
  events.endStage();
}

function placeFirstTile({
  G,
  ctx,
  events,
}: {
  G: MarrakechState;
  ctx: Ctx;
  events: { endStage: () => void };
},
  target: { row: number; col: number },
  terrain: TerrainType,
): void | "INVALID_MOVE" {
  if (G.turnPhase !== "placeFirstTile") return INVALID_MOVE;
  const currentPlayer = ctx.currentPlayer as PlayerId;
  const isAdjacentToAssam = getNeighbors(G.assam.position).some(
    (neighbor) => neighbor.row === target.row && neighbor.col === target.col,
  );
  if (!isAdjacentToAssam) return INVALID_MOVE;
  if (G.tiles[currentPlayer][terrain] < 2) return INVALID_MOVE;

  const player = formatPlayer(ctx.currentPlayer);
  G.board[target.row][target.col] = { terrain, owner: currentPlayer };
  G.tiles[currentPlayer][terrain] -= 1;
  G.selectedTerrain = terrain;
  G.firstPlacement = { ...target };
  G.log.unshift({
    turn: ctx.turn,
    player: currentPlayer,
    action: "placeFirstTile",
    detail: `${player} が ${terrain} を (${target.row},${target.col}) に配置しました。`,
  });
  G.turnPhase = "placeSecondTile";
  events.endStage();
}

function placeSecondTile({
  G,
  ctx,
  events,
}: {
  G: MarrakechState;
  ctx: Ctx;
  events: { endTurn: () => void };
},
  target: { row: number; col: number },
): void | "INVALID_MOVE" {
  if (G.turnPhase !== "placeSecondTile") return INVALID_MOVE;
  const currentPlayer = ctx.currentPlayer as PlayerId;
  if (G.selectedTerrain === null || G.firstPlacement === null) return INVALID_MOVE;
  if (target.row === G.assam.position.row && target.col === G.assam.position.col) {
    return INVALID_MOVE;
  }
  const isAdjacentToFirst = getNeighbors(G.firstPlacement).some(
    (neighbor) => neighbor.row === target.row && neighbor.col === target.col,
  );
  if (!isAdjacentToFirst) return INVALID_MOVE;
  if (G.tiles[currentPlayer][G.selectedTerrain] < 1) return INVALID_MOVE;

  const player = formatPlayer(ctx.currentPlayer);
  const terrain = G.selectedTerrain;
  G.board[target.row][target.col] = { terrain, owner: currentPlayer };
  G.tiles[currentPlayer][terrain] -= 1;
  G.selectedTerrain = null;
  G.firstPlacement = null;
  G.log.unshift({
    turn: ctx.turn,
    player: currentPlayer,
    action: "placeSecondTile",
    detail: `${player} が ${terrain} を (${target.row},${target.col}) に配置して手番を終了しました。`,
  });
  events.endTurn();
}

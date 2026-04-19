import type { Ctx, Game } from "boardgame.io";
import { INVALID_MOVE } from "boardgame.io/core";

import type { MarrakechState, PlayerId } from "./types";
import { PLAYER_LABELS } from "./types";
import { createInitialState } from "./setup";

function formatPlayer(playerID: string | null | undefined): string {
  if (playerID === undefined || playerID === null) return "unknown";
  return PLAYER_LABELS[playerID as PlayerId] ?? playerID;
}

export const MarrakechGame: Game<MarrakechState> = {
  name: "marrakech",
  setup: () => createInitialState(),
  turn: {
    minMoves: 1,
    maxMoves: 4,
    order: {
      first: () => 0,
      next: ({ ctx }) => (Number(ctx.playOrderPos) + 1) % ctx.numPlayers,
    },
    onBegin: ({ G }) => {
      G.turnPhase = "chooseDirection";
      G.selectedTerrain = null;
      G.firstPlacement = null;
    },
  },
  moves: {
    chooseDirection,
    moveAssam,
    placeFirstTile,
    placeSecondTile,
  },
};

function chooseDirection({
  G,
  ctx,
}: {
  G: MarrakechState;
  ctx: Ctx;
}): void | "INVALID_MOVE" {
  if (G.turnPhase !== "chooseDirection") return INVALID_MOVE;

  const player = formatPlayer(ctx.currentPlayer);
  G.log.unshift({
    turn: ctx.turn,
    player: ctx.currentPlayer as PlayerId,
    action: "chooseDirection",
    detail: `${player} が向き変更フェーズを完了しました。`,
  });
  G.turnPhase = "moveAssam";
}

function moveAssam({
  G,
  ctx,
}: {
  G: MarrakechState;
  ctx: Ctx;
}): void | "INVALID_MOVE" {
  if (G.turnPhase !== "moveAssam") return INVALID_MOVE;

  const player = formatPlayer(ctx.currentPlayer);
  G.log.unshift({
    turn: ctx.turn,
    player: ctx.currentPlayer as PlayerId,
    action: "moveAssam",
    detail: `${player} が移動フェーズを完了しました。`,
  });
  G.turnPhase = "placeFirstTile";
}

function placeFirstTile({
  G,
  ctx,
}: {
  G: MarrakechState;
  ctx: Ctx;
}): void | "INVALID_MOVE" {
  if (G.turnPhase !== "placeFirstTile") return INVALID_MOVE;

  const player = formatPlayer(ctx.currentPlayer);
  G.selectedTerrain = "sea";
  G.firstPlacement = { ...G.assam.position };
  G.log.unshift({
    turn: ctx.turn,
    player: ctx.currentPlayer as PlayerId,
    action: "placeFirstTile",
    detail: `${player} が1マス目配置フェーズを完了しました。`,
  });
  G.turnPhase = "placeSecondTile";
}

function placeSecondTile({
  G,
  ctx,
  events,
}: {
  G: MarrakechState;
  ctx: Ctx;
  events: { endTurn: () => void };
}): void | "INVALID_MOVE" {
  if (G.turnPhase !== "placeSecondTile") return INVALID_MOVE;

  const player = formatPlayer(ctx.currentPlayer);
  G.selectedTerrain = null;
  G.firstPlacement = null;
  G.log.unshift({
    turn: ctx.turn,
    player: ctx.currentPlayer as PlayerId,
    action: "placeSecondTile",
    detail: `${player} が2マス目配置フェーズを完了し、手番を終了しました。`,
  });
  G.turnPhase = "chooseDirection";
  events.endTurn();
}

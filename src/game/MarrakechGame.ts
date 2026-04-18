import type { Ctx, Game } from "boardgame.io";

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
    maxMoves: 1,
  },
  moves: {
    /** 暫定 move: 動作確認用。Phase 4 で本実装に差し替える */
    ping: ({ G, ctx }: { G: MarrakechState; ctx: Ctx }) => {
      const player = formatPlayer(ctx.currentPlayer);
      G.log.unshift({
        turn: ctx.turn,
        player: ctx.currentPlayer as PlayerId,
        action: "ping",
        detail: `${player} が ping を実行しました。`,
      });
    },
  },
};

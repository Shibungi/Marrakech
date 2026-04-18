import type { Ctx, Game } from "boardgame.io";

export type PrototypePlayerId = "0" | "1" | "2";

export type PrototypeState = {
  stage: string;
  step: string;
  summary: string;
  players: Record<PrototypePlayerId, { label: string; connected: boolean }>;
  moveCount: number;
  lastAction: string;
  log: string[];
};

const PLAYER_LABELS: Record<PrototypePlayerId, string> = {
  "0": "A",
  "1": "B",
  "2": "C",
};

function formatPlayer(playerID: string | null | undefined) {
  if (playerID === undefined || playerID === null) {
    return "unknown";
  }

  return PLAYER_LABELS[playerID as PrototypePlayerId] ?? playerID;
}

export const MarrakechGame: Game<PrototypeState> = {
  name: "marrakech-prototype",
  setup: () => ({
    stage: "Phase 1",
    step: "Step 1",
    summary: "Vite + React + TypeScript + boardgame.io の最小起動確認",
    players: {
      "0": { label: "A", connected: true },
      "1": { label: "B", connected: true },
      "2": { label: "C", connected: true },
    },
    moveCount: 0,
    lastAction: "ゲームを初期化しました。",
    log: ["setup(): Prototype state initialized."],
  }),
  turn: {
    minMoves: 1,
    maxMoves: 1,
  },
  moves: {
    advancePrototype: ({ G, ctx }: { G: PrototypeState; ctx: Ctx }) => {
      const player = formatPlayer(ctx.currentPlayer);
      const nextMoveCount = G.moveCount + 1;
      const message = `${player} が prototype move を実行しました。count=${nextMoveCount}`;

      G.moveCount = nextMoveCount;
      G.lastAction = message;
      G.log.unshift(message);
    },
  },
};

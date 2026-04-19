import { describe, expect, it, vi, afterEach } from "vitest";
import { Client } from "boardgame.io/client";

import { MarrakechGame } from "../game/MarrakechGame";
import { applyLandingPayment, connectedComponentSize } from "../game/payment";
import type { MarrakechState } from "../game/types";
import { createInitialState } from "../game/setup";

function withBoard(state: MarrakechState): MarrakechState {
  return {
    ...state,
    board: state.board.map((row) => [...row]),
    coins: { ...state.coins },
  };
}

describe("payment helpers", () => {
  it("同タイプ・同オーナー連結成分サイズを返す", () => {
    const G = withBoard(createInitialState());
    G.board[3][4] = { terrain: "city", owner: "1" };
    G.board[3][5] = { terrain: "city", owner: "1" };
    G.board[2][4] = { terrain: "city", owner: "1" };
    G.board[2][3] = { terrain: "sea", owner: "1" }; // type mismatch
    G.board[4][3] = { terrain: "city", owner: "2" }; // owner mismatch

    const size = connectedComponentSize(
      G.board,
      { row: 3, col: 4 },
      { terrain: "city", owner: "1" },
    );
    expect(size).toBe(3);
  });

  it("資金不足時は部分支払いになる", () => {
    const G = withBoard(createInitialState());
    G.assam.position = { row: 3, col: 4 };
    G.board[3][4] = { terrain: "city", owner: "1" };
    G.board[3][5] = { terrain: "city", owner: "1" };
    G.board[2][4] = { terrain: "city", owner: "1" };
    G.coins["0"] = 2;

    const result = applyLandingPayment(G, "0");
    expect(result).toEqual({ paid: true, payee: "1", amount: 2 });
    expect(G.coins["0"]).toBe(0);
    expect(G.coins["1"]).toBe(32);
  });
});

describe("MarrakechGame payment integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("moveAssam の着地時に支払いが発生し所持金が更新される", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // steps=1

    const gameWithLandingTile = {
      ...MarrakechGame,
      setup: () => {
        const G = withBoard(createInitialState());
        G.board[3][4] = { terrain: "city", owner: "1" };
        G.board[3][5] = { terrain: "city", owner: "1" };
        return G;
      },
    };

    const client = Client({ game: gameWithLandingTile, numPlayers: 3 });
    client.start();

    client.moves.chooseDirection({ row: 3, col: 4 }); // E
    client.moves.moveAssam();

    const next = client.getState()!;
    expect(next.G.assam.position).toEqual({ row: 3, col: 4 });
    expect(next.G.coins["0"]).toBe(28);
    expect(next.G.coins["1"]).toBe(32);
    expect(next.G.log[0].detail).toContain("支払い");
  });
});

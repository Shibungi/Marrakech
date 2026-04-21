import { describe, expect, it, vi, afterEach } from "vitest";
import { Client } from "boardgame.io/client";

import { MarrakechGame } from "../game/MarrakechGame";
import { applyLandingPayment, connectedComponentSize } from "../game/payment";
import type { MarrakechState } from "../game/types";
import { createInitialState } from "../game/setup";
import { cloneBoard, setCell } from "../game/board";

function withBoard(state: MarrakechState): MarrakechState {
  return {
    ...state,
    board: cloneBoard(state.board),
    coins: { ...state.coins },
  };
}

describe("payment helpers", () => {
  it("同タイプ・同オーナー連結成分サイズを返す", () => {
    const G = withBoard(createInitialState());
    setCell(G.board, { q: 1, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 2, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 1, r: -1 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 0, r: -1 }, { terrain: "sea", owner: "1" });
    setCell(G.board, { q: 0, r: 1 }, { terrain: "city", owner: "2" });

    const size = connectedComponentSize(
      G.board,
      { q: 1, r: 0 },
      { terrain: "city", owner: "1" },
    );
    expect(size).toBe(3);
  });

  it("資金不足時は部分支払いになる", () => {
    const G = withBoard(createInitialState());
    G.assam.position = { q: 1, r: 0 };
    setCell(G.board, { q: 1, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 2, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 1, r: -1 }, { terrain: "city", owner: "1" });
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
    const gameWithLandingTile = {
      ...MarrakechGame,
      setup: () => {
        const G = withBoard(createInitialState());
        setCell(G.board, { q: 1, r: 0 }, { terrain: "city", owner: "1" });
        setCell(G.board, { q: 2, r: 0 }, { terrain: "city", owner: "1" });
        setCell(G.board, { q: 3, r: 0 }, { terrain: "city", owner: "1" });
        return G;
      },
    };

    const client = Client({ game: gameWithLandingTile, numPlayers: 3 });
    client.start();

    client.moves.chooseDirection({ q: 1, r: 0 });
    client.moves.moveAssam();

    const next = client.getState()!;
    const landing = next.G.assam.position;
    expect(landing.r).toBe(0);
    expect([1, 2, 3]).toContain(landing.q);
    expect(next.G.coins["0"]).toBe(27);
    expect(next.G.coins["1"]).toBe(33);
    expect(next.G.log[0].detail).toContain("支払い");
  });
});

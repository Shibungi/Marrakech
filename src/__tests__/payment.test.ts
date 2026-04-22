import { describe, expect, it, vi, afterEach } from "vitest";
import { Client } from "boardgame.io/client";

import { MarrakechGame } from "../game/MarrakechGame";
import {
  applyLandingPayment,
  connectedComponentOwnerCounts,
  connectedComponentSize,
  connectedComponentSummary,
} from "../game/payment";
import type { MarrakechState } from "../game/types";
import { createInitialState } from "../game/setup";
import { cloneBoard, setCell, toBoardKey } from "../game/board";

function withBoard(state: MarrakechState): MarrakechState {
  return {
    ...state,
    board: cloneBoard(state.board),
    coins: { ...state.coins },
  };
}

describe("payment helpers", () => {
  it("同タイプ連結成分サイズを返す", () => {
    const G = withBoard(createInitialState());
    setCell(G.board, { q: 1, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 2, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 1, r: -1 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 0, r: 1 }, { terrain: "city", owner: "2" });
    setCell(G.board, { q: 0, r: -1 }, { terrain: "sea", owner: "1" });

    const size = connectedComponentSize(
      G.board,
      { q: 1, r: 0 },
      { terrain: "city", owner: "1" },
    );
    expect(size).toBe(4);
  });

  it("同タイプ連結成分内の各プレイヤー枚数を返す", () => {
    const G = withBoard(createInitialState());
    setCell(G.board, { q: 1, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 2, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 1, r: -1 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 0, r: 0 }, { terrain: "city", owner: "2" });
    setCell(G.board, { q: 0, r: 1 }, { terrain: "city", owner: "0" });

    const counts = connectedComponentOwnerCounts(
      G.board,
      { q: 1, r: 0 },
      { terrain: "city", owner: "1" },
    );

    expect(counts).toEqual({ "0": 1, "1": 3, "2": 1 });
  });

  it("同タイプ連結成分の構成セル一覧を返す", () => {
    const G = withBoard(createInitialState());
    setCell(G.board, { q: 1, r: 0 }, { terrain: "forest", owner: "1" });
    setCell(G.board, { q: 2, r: 0 }, { terrain: "forest", owner: "1" });
    setCell(G.board, { q: 1, r: -1 }, { terrain: "forest", owner: "2" });
    setCell(G.board, { q: 0, r: 0 }, { terrain: "forest", owner: "0" });
    setCell(G.board, { q: -2, r: 0 }, { terrain: "forest", owner: "2" });
    setCell(G.board, { q: 0, r: -1 }, { terrain: "city", owner: "1" });

    const summary = connectedComponentSummary(
      G.board,
      { q: 1, r: 0 },
      { terrain: "forest", owner: "1" },
    );

    expect(summary.size).toBe(4);
    expect(summary.ownerCounts).toEqual({ "0": 1, "1": 2, "2": 1 });
    expect(summary.cells.map((cell) => toBoardKey(cell)).sort()).toEqual(
      ["1,0", "2,0", "1,-1", "0,0"].sort(),
    );
  });

  it("自分より多い枚数の各プレイヤーに枚数差だけ支払う", () => {
    const G = withBoard(createInitialState());
    G.assam.position = { q: 1, r: 0 };
    setCell(G.board, { q: 1, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 2, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 1, r: -1 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 0, r: 0 }, { terrain: "city", owner: "2" });
    setCell(G.board, { q: 0, r: -1 }, { terrain: "city", owner: "2" });
    setCell(G.board, { q: 0, r: 1 }, { terrain: "city", owner: "0" });

    const result = applyLandingPayment(G, "0");

    expect(result).toEqual({
      paid: true,
      transfers: [
        { payee: "1", amount: 2 },
        { payee: "2", amount: 1 },
      ],
      amount: 3,
    });
    expect(G.coins["0"]).toBe(27);
    expect(G.coins["1"]).toBe(32);
    expect(G.coins["2"]).toBe(31);
  });

  it("資金不足時は部分支払いになる", () => {
    const G = withBoard(createInitialState());
    G.assam.position = { q: 1, r: 0 };
    setCell(G.board, { q: 1, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 2, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 1, r: -1 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 0, r: 1 }, { terrain: "city", owner: "0" });
    G.coins["0"] = 1;

    const result = applyLandingPayment(G, "0");
    expect(result).toEqual({
      paid: true,
      transfers: [{ payee: "1", amount: 1 }],
      amount: 1,
    });
    expect(G.coins["0"]).toBe(0);
    expect(G.coins["1"]).toBe(31);
  });

  it("同数以下のプレイヤーには支払わない", () => {
    const G = withBoard(createInitialState());
    G.assam.position = { q: 1, r: 0 };
    setCell(G.board, { q: 1, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 2, r: 0 }, { terrain: "city", owner: "1" });
    setCell(G.board, { q: 0, r: 0 }, { terrain: "city", owner: "0" });
    setCell(G.board, { q: 0, r: 1 }, { terrain: "city", owner: "0" });
    setCell(G.board, { q: 1, r: -1 }, { terrain: "city", owner: "2" });

    const result = applyLandingPayment(G, "0");

    expect(result).toEqual({ paid: false, transfers: [], amount: 0 });
    expect(G.coins["0"]).toBe(30);
    expect(G.coins["1"]).toBe(30);
    expect(G.coins["2"]).toBe(30);
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

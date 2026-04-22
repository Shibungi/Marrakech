import { describe, expect, it } from "vitest";
import { Client } from "boardgame.io/client";

import { MarrakechGame } from "../game/MarrakechGame";
import { getNeighbors } from "../game/hex";
import { sameHex } from "../game/board";

function getCurrentStage(state: any) {
  const s = state;
  return s?.ctx.activePlayers?.[s?.ctx.currentPlayer ?? ""];
}

describe("MarrakechGame phase flow (Phase 4)", () => {
  it("chooseDirection → moveAssam → placeFirstTile → placeSecondTile の順で進む", () => {
    const client = Client({ game: MarrakechGame, numPlayers: 3 });
    client.start();

    expect(client.getState()?.G.turnPhase).toBe("chooseDirection");
    expect(getCurrentStage(client.getState())).toBe("chooseDirection");

    const origin = client.getState()!.G.assam.position;
    const target = getNeighbors(origin)[0];
    client.moves.chooseDirection(target);
    expect(client.getState()?.G.turnPhase).toBe("moveAssam");
    expect(getCurrentStage(client.getState())).toBe("moveAssam");
    expect(client.getState()?.G.assam.direction).toBe("NE");

    client.moves.moveAssam();
    expect(client.getState()?.G.turnPhase).toBe("placeFirstTile");
    expect(getCurrentStage(client.getState())).toBe("placeFirstTile");

    const firstTarget = getNeighbors(client.getState()!.G.assam.position)[0];
    client.moves.placeFirstTile(firstTarget, "sea");
    expect(client.getState()?.G.turnPhase).toBe("placeSecondTile");
    expect(getCurrentStage(client.getState())).toBe("placeSecondTile");
  });

  it("1ターン完了で次プレイヤーに手番が回る (A→B)", () => {
    const client = Client({ game: MarrakechGame, numPlayers: 3 });
    client.start();

    expect(client.getState()?.ctx.currentPlayer).toBe("0");
    expect(client.getState()?.ctx.turn).toBe(1);

    const origin = client.getState()!.G.assam.position;
    const target = getNeighbors(origin)[0];
    client.moves.chooseDirection(target);
    client.moves.moveAssam();
    const firstTarget = getNeighbors(client.getState()!.G.assam.position)[0];
    client.moves.placeFirstTile(firstTarget, "sea");
    const secondTarget = getNeighbors(firstTarget).find(
      (cell) => !sameHex(cell, client.getState()!.G.assam.position),
    )!;
    client.moves.placeSecondTile(secondTarget);

    expect(client.getState()?.ctx.currentPlayer).toBe("1");
    expect(client.getState()?.ctx.turn).toBe(2);
    expect(client.getState()?.G.turnPhase).toBe("chooseDirection");
    expect(getCurrentStage(client.getState())).toBe("chooseDirection");
  });

  it("フェーズ外の move は実行できない", () => {
    const client = Client({ game: MarrakechGame, numPlayers: 3 });
    client.start();

    expect(client.getState()?.G.turnPhase).toBe("chooseDirection");
    client.moves.moveAssam();

    expect(client.getState()?.G.turnPhase).toBe("chooseDirection");
    expect(client.getState()?.G.log).toHaveLength(0);
  });

  it("隣接でないマスを chooseDirection に渡すと拒否される", () => {
    const client = Client({ game: MarrakechGame, numPlayers: 3 });
    client.start();

    client.moves.chooseDirection({ q: 3, r: -3 });

    expect(client.getState()?.G.turnPhase).toBe("chooseDirection");
    expect(client.getState()?.G.assam.direction).toBe("NE");
    expect(client.getState()?.G.log).toHaveLength(0);
  });

  it("アッサムの後方 3 方向への向き変更は拒否される", () => {
    const client = Client({ game: MarrakechGame, numPlayers: 3 });
    client.start();

    client.moves.chooseDirection({ q: -1, r: 1 });

    expect(client.getState()?.G.turnPhase).toBe("chooseDirection");
    expect(client.getState()?.G.assam.direction).toBe("NE");
    expect(client.getState()?.G.log).toHaveLength(0);
  });
});

import { describe, expect, it, vi, afterEach } from "vitest";
import { Client } from "boardgame.io/client";

import { MarrakechGame } from "../game/MarrakechGame";
import { getNeighbors } from "../game/hex";
import { getCell, sameHex } from "../game/board";

describe("MarrakechGame placement integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1マス目と2マス目を合法手で配置すると在庫が減り手番終了する", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // 1 step
    const client = Client({ game: MarrakechGame, numPlayers: 3 });
    client.start();

    const origin = client.getState()!.G.assam.position;
    client.moves.chooseDirection(getNeighbors(origin)[0]);
    client.moves.moveAssam();

    const assam = client.getState()!.G.assam.position;
    const firstTarget = getNeighbors(assam)[0];
    client.moves.placeFirstTile(firstTarget, "forest");

    const secondTarget = getNeighbors(firstTarget).find(
      (cell) => !sameHex(cell, assam),
    )!;
    client.moves.placeSecondTile(secondTarget);

    const state = client.getState()!;
    expect(getCell(state.G.board, firstTarget)).toEqual({
      terrain: "forest",
      owner: "0",
    });
    expect(getCell(state.G.board, secondTarget)).toEqual({
      terrain: "forest",
      owner: "0",
    });
    expect(state.G.tiles["0"].forest).toBe(2);
    expect(state.ctx.currentPlayer).toBe("1");
    expect(state.G.turnPhase).toBe("chooseDirection");
  });

  it("1マス目はアッサム隣接でないと拒否される", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const client = Client({ game: MarrakechGame, numPlayers: 3 });
    client.start();

    const origin = client.getState()!.G.assam.position;
    client.moves.chooseDirection(getNeighbors(origin)[0]);
    client.moves.moveAssam();

    client.moves.placeFirstTile({ q: 0, r: -3 }, "sea");

    const state = client.getState()!;
    expect(state.G.turnPhase).toBe("placeFirstTile");
    expect(state.G.log[0].action).toBe("moveAssam");
  });

  it("2マス目は1マス目に隣接し、アッサム位置は不可", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const client = Client({ game: MarrakechGame, numPlayers: 3 });
    client.start();

    const origin = client.getState()!.G.assam.position;
    client.moves.chooseDirection(getNeighbors(origin)[0]);
    client.moves.moveAssam();

    const assam = client.getState()!.G.assam.position;
    const firstTarget = getNeighbors(assam)[0];
    client.moves.placeFirstTile(firstTarget, "city");

    client.moves.placeSecondTile(assam);

    const state = client.getState()!;
    expect(state.G.turnPhase).toBe("placeSecondTile");
    expect(state.G.selectedTerrain).toBe("city");
    expect(state.G.tiles["0"].city).toBe(3);
  });
});

import { describe, expect, it } from "vitest";
import { Client } from "boardgame.io/client";

import { MarrakechGame } from "../game/MarrakechGame";

describe("MarrakechGame phase flow (Phase 4)", () => {
  it("chooseDirection → moveAssam → placeFirstTile → placeSecondTile の順で進む", () => {
    const client = Client({ game: MarrakechGame, numPlayers: 3 });
    client.start();

    expect(client.getState()?.G.turnPhase).toBe("chooseDirection");

    client.moves.chooseDirection({ row: 2, col: 4 });
    expect(client.getState()?.G.turnPhase).toBe("moveAssam");
    expect(client.getState()?.G.assam.direction).toBe("NE");

    client.moves.moveAssam();
    expect(client.getState()?.G.turnPhase).toBe("placeFirstTile");

    client.moves.placeFirstTile();
    expect(client.getState()?.G.turnPhase).toBe("placeSecondTile");
  });

  it("1ターン完了で次プレイヤーに手番が回る (A→B)", () => {
    const client = Client({ game: MarrakechGame, numPlayers: 3 });
    client.start();

    expect(client.getState()?.ctx.currentPlayer).toBe("0");
    expect(client.getState()?.ctx.turn).toBe(1);

    client.moves.chooseDirection({ row: 2, col: 4 });
    client.moves.moveAssam();
    client.moves.placeFirstTile();
    client.moves.placeSecondTile();

    expect(client.getState()?.ctx.currentPlayer).toBe("1");
    expect(client.getState()?.ctx.turn).toBe(2);
    expect(client.getState()?.G.turnPhase).toBe("chooseDirection");
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

    client.moves.chooseDirection({ row: 0, col: 0 });

    expect(client.getState()?.G.turnPhase).toBe("chooseDirection");
    expect(client.getState()?.G.assam.direction).toBe("NE");
    expect(client.getState()?.G.log).toHaveLength(0);
  });
});

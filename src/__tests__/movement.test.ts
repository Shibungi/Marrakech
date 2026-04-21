import { describe, expect, it } from "vitest";

import { isValidCell, stepInDirection } from "../game/hex";
import { moveAssamWithBounce } from "../game/movement";
import { Client } from "boardgame.io/client";
import { MarrakechGame } from "../game/MarrakechGame";

describe("moveAssamWithBounce", () => {
  it("盤内で進める場合は向きを維持して移動する", () => {
    const result = moveAssamWithBounce(
      { q: 0, r: 0 },
      "E",
      2,
      () => 0,
    );

    expect(result.position).toEqual({ q: 2, r: 0 });
    expect(result.direction).toBe("E");
    expect(result.redirects).toHaveLength(0);
  });

  it("盤外に出る場合は有効方向へランダムに向きを変えて進む", () => {
    const result = moveAssamWithBounce(
      { q: 0, r: -3 },
      "NW",
      1,
      () => 0,
    );

    expect(isValidCell(result.position)).toBe(true);
    expect(result.redirects).toHaveLength(1);
    expect(result.redirects[0].from).toBe("NW");
    const stepped = stepInDirection({ q: 0, r: -3 }, result.direction);
    expect(stepped).toEqual(result.position);
  });
});

describe("MarrakechGame moveAssam integration", () => {
  it("moveAssam は 1〜3 マス移動し、ログを残して次フェーズへ進む", () => {
    const client = Client({ game: MarrakechGame, numPlayers: 3 });
    client.start();

    client.moves.chooseDirection({ q: 1, r: -1 });
    const before = client.getState()!.G.assam.position;
    client.moves.moveAssam();

    const state = client.getState()!;
    expect(state.G.turnPhase).toBe("placeFirstTile");
    expect(isValidCell(state.G.assam.position)).toBe(true);

    const movedDistanceApprox = Math.abs(state.G.assam.position.q - before.q)
      + Math.abs(state.G.assam.position.r - before.r);
    expect(movedDistanceApprox).toBeGreaterThan(0);

    expect(state.G.log[0].action).toBe("moveAssam");
    expect(state.G.log[0].detail).toContain("マス移動");
  });
});

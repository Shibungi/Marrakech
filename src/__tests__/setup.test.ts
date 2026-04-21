import { describe, it, expect } from "vitest";
import { createInitialState } from "../game/setup";
import { BOARD_CELL_COUNT, INITIAL_COINS } from "../game/types";
import type { PlayerId } from "../game/types";
import { getAllCells, isValidCell } from "../game/hex";
import { getCell } from "../game/board";

describe("createInitialState", () => {
  const state = createInitialState();

  it("盤面の総マス数が 37", () => {
    expect(Object.keys(state.board)).toHaveLength(BOARD_CELL_COUNT);
  });

  it("初期盤面はすべて null", () => {
    for (const cell of getAllCells()) {
      expect(getCell(state.board, cell)).toBeNull();
    }
  });

  it("アッサム初期位置は (0,0)", () => {
    expect(state.assam.position).toEqual({ q: 0, r: 0 });
  });

  it("アッサム初期位置は有効マス", () => {
    expect(isValidCell(state.assam.position)).toBe(true);
  });

  it("アッサム初期向きは NE", () => {
    expect(state.assam.direction).toBe("NE");
  });

  it("各プレイヤーの初期所持金", () => {
    const players: PlayerId[] = ["0", "1", "2"];
    for (const p of players) {
      expect(state.coins[p]).toBe(INITIAL_COINS);
    }
  });

  it("各プレイヤーのタイル在庫がある", () => {
    const players: PlayerId[] = ["0", "1", "2"];
    for (const p of players) {
      expect(state.tiles[p].sea).toBeGreaterThan(0);
      expect(state.tiles[p].mountain).toBeGreaterThan(0);
      expect(state.tiles[p].city).toBeGreaterThan(0);
    }
  });

  it("selectedTerrain は null", () => {
    expect(state.selectedTerrain).toBeNull();
  });

  it("firstPlacement は null", () => {
    expect(state.firstPlacement).toBeNull();
  });

  it("ログは空配列", () => {
    expect(state.log).toEqual([]);
  });

  it("turnPhase は chooseDirection", () => {
    expect(state.turnPhase).toBe("chooseDirection");
  });
});

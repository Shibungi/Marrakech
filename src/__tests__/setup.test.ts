import { describe, it, expect } from "vitest";
import { createInitialState } from "../game/setup";
import { ROW_SIZES, INITIAL_COINS } from "../game/types";
import type { PlayerId } from "../game/types";
import { isValidCell } from "../game/hex";

describe("createInitialState", () => {
  const state = createInitialState();

  it("盤面の行数が 7", () => {
    expect(state.board).toHaveLength(7);
  });

  it("各行のマス数が ROW_SIZES に一致", () => {
    for (let row = 0; row < 7; row++) {
      expect(state.board[row]).toHaveLength(ROW_SIZES[row]);
    }
  });

  it("初期盤面はすべて null", () => {
    for (const row of state.board) {
      for (const cell of row) {
        expect(cell).toBeNull();
      }
    }
  });

  it("アッサム初期位置は (3,3)", () => {
    expect(state.assam.position).toEqual({ row: 3, col: 3 });
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

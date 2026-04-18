import { describe, it, expect } from "vitest";
import {
  isValidCell,
  getAllCells,
  getNeighbors,
  stepInDirection,
  oppositeDirection,
  rotateClockwise,
  rotateCounterClockwise,
} from "../game/hex";
import { ROW_SIZES } from "../game/types";
import type { HexCoord, Direction } from "../game/types";

// ---------------------------------------------------------------------------
// isValidCell
// ---------------------------------------------------------------------------
describe("isValidCell", () => {
  it("中央マス (3,3) は有効", () => {
    expect(isValidCell({ row: 3, col: 3 })).toBe(true);
  });

  it("各行の先頭 (row, 0) は有効", () => {
    for (let row = 0; row < 7; row++) {
      expect(isValidCell({ row, col: 0 })).toBe(true);
    }
  });

  it("各行の末尾は有効", () => {
    for (let row = 0; row < 7; row++) {
      expect(isValidCell({ row, col: ROW_SIZES[row] - 1 })).toBe(true);
    }
  });

  it("各行の末尾+1 は無効", () => {
    for (let row = 0; row < 7; row++) {
      expect(isValidCell({ row, col: ROW_SIZES[row] })).toBe(false);
    }
  });

  it("負の行/列は無効", () => {
    expect(isValidCell({ row: -1, col: 0 })).toBe(false);
    expect(isValidCell({ row: 0, col: -1 })).toBe(false);
  });

  it("行が 7 以上は無効", () => {
    expect(isValidCell({ row: 7, col: 0 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAllCells
// ---------------------------------------------------------------------------
describe("getAllCells", () => {
  it("合計 37 マスを返す (4+5+6+7+6+5+4)", () => {
    const cells = getAllCells();
    expect(cells).toHaveLength(37);
  });

  it("すべてのセルが有効", () => {
    const cells = getAllCells();
    for (const cell of cells) {
      expect(isValidCell(cell)).toBe(true);
    }
  });

  it("重複がない", () => {
    const cells = getAllCells();
    const keys = new Set(cells.map((c) => `${c.row},${c.col}`));
    expect(keys.size).toBe(cells.length);
  });
});

// ---------------------------------------------------------------------------
// getNeighbors
// ---------------------------------------------------------------------------
describe("getNeighbors", () => {
  it("中央マス (3,3) は 6 つの隣接マスを持つ", () => {
    const neighbors = getNeighbors({ row: 3, col: 3 });
    expect(neighbors).toHaveLength(6);
    // すべて有効
    for (const n of neighbors) {
      expect(isValidCell(n)).toBe(true);
    }
  });

  it("角マス (0,0) の隣接は 2 つ", () => {
    const neighbors = getNeighbors({ row: 0, col: 0 });
    expect(neighbors).toHaveLength(2);
  });

  it("角マス (0,3) の隣接は 3 つ", () => {
    const neighbors = getNeighbors({ row: 0, col: 3 });
    expect(neighbors).toHaveLength(3);
  });

  it("辺マス (1,0) の隣接数を確認", () => {
    const neighbors = getNeighbors({ row: 1, col: 0 });
    expect(neighbors.length).toBeGreaterThanOrEqual(2);
    expect(neighbors.length).toBeLessThanOrEqual(6);
    for (const n of neighbors) {
      expect(isValidCell(n)).toBe(true);
    }
  });

  it("隣接関係は対称: A が B の隣接なら B も A の隣接", () => {
    const center: HexCoord = { row: 3, col: 3 };
    const neighbors = getNeighbors(center);
    for (const n of neighbors) {
      const reverseNeighbors = getNeighbors(n);
      const found = reverseNeighbors.some(
        (rn) => rn.row === center.row && rn.col === center.col,
      );
      expect(found).toBe(true);
    }
  });

  it("(3,0) の隣接は正しい", () => {
    // Row 3 has 7 cells (0..6), so (3,0) is the leftmost cell in the center row
    const neighbors = getNeighbors({ row: 3, col: 0 });
    // Should have neighbors: (2,0), (4,0) at minimum
    expect(neighbors.length).toBeGreaterThanOrEqual(2);
    for (const n of neighbors) {
      expect(isValidCell(n)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// stepInDirection
// ---------------------------------------------------------------------------
describe("stepInDirection", () => {
  it("中央 (3,3) から NE に進むと有効なマス", () => {
    const result = stepInDirection({ row: 3, col: 3 }, "NE");
    expect(result).not.toBeNull();
    expect(isValidCell(result!)).toBe(true);
  });

  it("中央 (3,3) から全方向に進めるマスがある", () => {
    const dirs: Direction[] = ["NE", "E", "SE", "SW", "W", "NW"];
    for (const d of dirs) {
      const result = stepInDirection({ row: 3, col: 3 }, d);
      expect(result).not.toBeNull();
      expect(isValidCell(result!)).toBe(true);
    }
  });

  it("stepInDirection の結果は getNeighbors に含まれる", () => {
    const coord: HexCoord = { row: 3, col: 3 };
    const neighbors = getNeighbors(coord);
    const dirs: Direction[] = ["NE", "E", "SE", "SW", "W", "NW"];
    for (const d of dirs) {
      const result = stepInDirection(coord, d);
      if (result) {
        const found = neighbors.some(
          (n) => n.row === result.row && n.col === result.col,
        );
        expect(found).toBe(true);
      }
    }
  });

  it("盤端から外に出る方向は null を返す", () => {
    // (0,0) から NW は盤外
    const result = stepInDirection({ row: 0, col: 0 }, "NW");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// oppositeDirection
// ---------------------------------------------------------------------------
describe("oppositeDirection", () => {
  it("各方向の反対が正しい", () => {
    expect(oppositeDirection("NE")).toBe("SW");
    expect(oppositeDirection("E")).toBe("W");
    expect(oppositeDirection("SE")).toBe("NW");
    expect(oppositeDirection("SW")).toBe("NE");
    expect(oppositeDirection("W")).toBe("E");
    expect(oppositeDirection("NW")).toBe("SE");
  });

  it("二重反転で元に戻る", () => {
    const dirs: Direction[] = ["NE", "E", "SE", "SW", "W", "NW"];
    for (const d of dirs) {
      expect(oppositeDirection(oppositeDirection(d))).toBe(d);
    }
  });
});

// ---------------------------------------------------------------------------
// rotateClockwise / rotateCounterClockwise
// ---------------------------------------------------------------------------
describe("rotation", () => {
  it("時計回り 6 回で元に戻る", () => {
    let dir: Direction = "NE";
    for (let i = 0; i < 6; i++) {
      dir = rotateClockwise(dir);
    }
    expect(dir).toBe("NE");
  });

  it("反時計回り 6 回で元に戻る", () => {
    let dir: Direction = "NE";
    for (let i = 0; i < 6; i++) {
      dir = rotateCounterClockwise(dir);
    }
    expect(dir).toBe("NE");
  });

  it("時計回り + 反時計回りで元に戻る", () => {
    const dirs: Direction[] = ["NE", "E", "SE", "SW", "W", "NW"];
    for (const d of dirs) {
      expect(rotateCounterClockwise(rotateClockwise(d))).toBe(d);
      expect(rotateClockwise(rotateCounterClockwise(d))).toBe(d);
    }
  });

  it("NE → 時計回り = E", () => {
    expect(rotateClockwise("NE")).toBe("E");
  });

  it("NE → 反時計回り = NW", () => {
    expect(rotateCounterClockwise("NE")).toBe("NW");
  });
});

// ---------------------------------------------------------------------------
// 盤面全体の隣接整合性
// ---------------------------------------------------------------------------
describe("盤面全体の隣接整合性", () => {
  it("すべてのマスで隣接マスが有効かつ対称", () => {
    const allCells = getAllCells();
    for (const cell of allCells) {
      const neighbors = getNeighbors(cell);
      for (const n of neighbors) {
        // 隣接マスは有効
        expect(isValidCell(n)).toBe(true);
        // 対称性チェック
        const reverse = getNeighbors(n);
        const found = reverse.some(
          (r) => r.row === cell.row && r.col === cell.col,
        );
        expect(found).toBe(true);
      }
    }
  });
});
